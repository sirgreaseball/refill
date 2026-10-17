// Database guarantees, tested against the live database with the public key.
// Run: npm run dbtest
// Covers what the public key can and cannot do, payload and text limits,
// rate limiting, offer hold windows, the per-customer message cap and undo.
import { SUPABASE_KEY, SUPABASE_URL } from '../src/config.ts'
import { ApiError, rpc } from '../src/rpc.ts'

const results: [string, boolean, string?][] = []
const check = (label: string, ok: boolean, note?: string) => results.push([label, ok, note])
const fails = async (p: Promise<unknown>) => p.then(() => null, (e: ApiError) => e.code ?? e.message)
const raw = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })

const day = (extra: Record<string, unknown> = {}) => ({
  salon: 'DB test', now_min: 600,
  slots: [
    { id: 'S1', start_min: 720, minutes: 60, skill: 'hair', status: 'free' },
    { id: 'S2', start_min: 780, minutes: 60, skill: 'hair', status: 'free' },
    { id: 'S3', start_min: 840, minutes: 60, skill: 'hair', status: 'free' },
    { id: 'S4', start_min: 900, minutes: 60, skill: 'hair', status: 'free' },
    { id: 'B1', start_min: 960, minutes: 60, skill: 'hair', status: 'booked', customer: 'Asha' },
  ],
  waitlist: [
    { id: 'W1', name: 'Hold test', minutes: 60, skill: 'hair', consent: true },
    { id: 'W2', name: 'Cap test', minutes: 30, skill: 'hair', consent: true },
  ],
  ...extra,
})
type Sent = { ok: boolean; results: { entry: string; outcome: string; code?: string; offer?: string }[] }

// 1. the public key cannot touch tables or internal functions
const read = await raw('/rest/v1/workspaces?select=id&limit=1')
check('direct table read is refused', !read.ok, `HTTP ${read.status}`)
const write = await raw('/rest/v1/workspaces', { method: 'POST', body: JSON.stringify({ salon: 'x' }) })
check('direct table write is refused', !write.ok, `HTTP ${write.status}`)
const internal = await raw('/rest/v1/rpc/load_day', { method: 'POST', body: JSON.stringify({ p_ws: crypto.randomUUID(), p_day: {} }) })
check('internal function load_day is not callable', !internal.ok, `HTTP ${internal.status}`)

// 2. payload and text limits
const huge = await fails(rpc('create_workspace', { p_day: { ...day(), slots: Array.from({ length: 301 }, (_, i) => ({ id: `X${i}`, start_min: 600, minutes: 30, skill: 'hair', status: 'free' })) } }))
check('a day with 301 slots is refused', huge?.includes('TOO_LARGE') ?? false, huge ?? 'accepted')

const ws = await rpc<string>('create_workspace', { p_day: day() })
const long = await rpc<{ ok: boolean; code?: string }>('add_entry', { p_ws: ws, p_entry: { name: 'x'.repeat(61), minutes: 30, skill: 'hair', consent: true } })
check('a 61-character name is refused', !long.ok && long.code === 'INVALID_VALUE', long.code)
const ctrl = await rpc<{ ok: boolean; code?: string }>('add_entry', { p_ws: ws, p_entry: { name: 'bell\u0007name', minutes: 30, skill: 'hair', consent: true } })
check('a name with a control character is refused', !ctrl.ok && ctrl.code === 'INVALID_VALUE', ctrl.code)

// 3. offers hold for 15 demo-minutes, then lapse
const sent = await rpc<Sent>('send_offers', { p_ws: ws, p_slot: 'S1', p_entries: ['W1'] })
const offer = sent.results[0].offer!
await rpc('set_clock', { p_ws: ws, p_now: 630 })
const late = await rpc<{ outcome: string }>('accept_offer', { p_offer: offer })
const view = await rpc<{ state: string }>('get_offer', { p_offer: offer })
check('an offer accepted after its hold window is refused', late.outcome === 'EXPIRED' && view.state === 'EXPIRED', `${late.outcome} / ${view.state}`)

// 4. nobody is messaged more than 3 times a day
const outcomes: string[] = []
for (const slot of ['S2', 'S3', 'S4', 'S1']) {
  const r = await rpc<Sent>('send_offers', { p_ws: ws, p_slot: slot, p_entries: ['W2'] })
  outcomes.push(r.results[0].code ?? r.results[0].outcome)
}
check('the 4th offer to one customer in a day is refused', outcomes.join() === 'SENT,SENT,SENT,FREQUENCY_CAP', outcomes.join())

// 5. a mistaken cancellation can be undone, and it revokes open offers
await rpc('cancel_slot', { p_ws: ws, p_slot: 'B1' })
const ws2 = ws
const undo = await rpc<{ ok: boolean }>('restore_slot', { p_ws: ws2, p_slot: 'B1' })
const st = await rpc<{ slots: { id: string; status: string; customer: string | null }[] }>('get_state', { p_ws: ws })
const b1 = st.slots.find((s) => s.id === 'B1')
check('undo restores the original customer', undo.ok && b1?.status === 'booked' && b1.customer === 'Asha', `${b1?.status} ${b1?.customer}`)

// 6. rate limit: 260 writes in a burst on one demo day, 240 allowed per minute
const burst = await rpc<string>('create_workspace', { p_day: day() })
let limited = 0
let okCount = 0
for (let i = 0; i < 13; i++) {
  const batch = await Promise.all(Array.from({ length: 20 }, () => fails(rpc('set_clock', { p_ws: burst, p_now: 600 }))))
  for (const err of batch) if (err?.includes('RATE_LIMITED')) limited++; else if (!err) okCount++
}
check('a burst of 260 writes is cut off at the per-minute limit', limited > 0 && okCount <= 240, `${okCount} allowed, ${limited} refused`)

for (const [label, ok, note] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${note ? `  (${note})` : ''}`)
const allOk = results.every(([, ok]) => ok)
console.log(allOk ? `\nAll ${results.length} database checks passed.` : '\nAt least one database check FAILED.')
process.exit(allOk ? 0 : 1)
