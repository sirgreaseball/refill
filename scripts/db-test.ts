// Database guarantees, tested against the live database with the public key.
// Run: npm run dbtest
// Covers what the public key can and cannot do, payload and text limits, rate limiting,
// offer hold windows, the per-customer message cap, undo, and v2: owner, stylist and
// customer keys, stylist absence and moving appointments.
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
type Made = { id: string; owner_key: string; join_code: string }
type Sent = { ok: boolean; code?: string; results: { entry: string; outcome: string; code?: string; offer?: string }[] }
type Res = { ok: boolean; code?: string }
const make = (d: unknown) => rpc<Made>('create_workspace', { p_day: d })

// 1. the public key cannot touch tables or internal functions
const read = await raw('/rest/v1/workspaces?select=id&limit=1')
check('direct table read is refused', !read.ok, `HTTP ${read.status}`)
const write = await raw('/rest/v1/workspaces', { method: 'POST', body: JSON.stringify({ salon: 'x' }) })
check('direct table write is refused', !write.ok, `HTTP ${write.status}`)
const internal = await raw('/rest/v1/rpc/load_day', { method: 'POST', body: JSON.stringify({ p_ws: crypto.randomUUID(), p_day: {} }) })
check('internal function load_day is not callable', !internal.ok, `HTTP ${internal.status}`)

// 2. payload and text limits
const huge = await fails(make({ ...day(), slots: Array.from({ length: 301 }, (_, i) => ({ id: `X${i}`, start_min: 600, minutes: 30, skill: 'hair', status: 'free' })) }))
check('a day with 301 slots is refused', huge?.includes('TOO_LARGE') ?? false, huge ?? 'accepted')

const { id: ws, owner_key: key } = await make(day())
const long = await rpc<Res>('add_entry', { p_ws: ws, p_key: key, p_entry: { name: 'x'.repeat(61), minutes: 30, skill: 'hair', consent: true } })
check('a 61-character name is refused', !long.ok && long.code === 'INVALID_VALUE', long.code)
const ctrl = await rpc<Res>('add_entry', { p_ws: ws, p_key: key, p_entry: { name: 'bell\u0007name', minutes: 30, skill: 'hair', consent: true } })
check('a name with a control character is refused', !ctrl.ok && ctrl.code === 'INVALID_VALUE', ctrl.code)

// 3. the owner key is required for the desk
const noKey = await fails(rpc('get_state', { p_ws: ws, p_key: '' }))
const badKey = await fails(rpc('cancel_slot', { p_ws: ws, p_key: '0'.repeat(32), p_slot: 'B1' }))
check('the desk refuses a missing or wrong owner key', noKey === 'FORBIDDEN' && badKey === 'FORBIDDEN', `${noKey} / ${badKey}`)

// 4. offers hold for 15 demo-minutes, then lapse
const sent = await rpc<Sent>('send_offers', { p_ws: ws, p_key: key, p_slot: 'S1', p_entries: ['W1'] })
const offer = sent.results[0].offer!
await rpc('set_clock', { p_ws: ws, p_key: key, p_now: 630 })
const late = await rpc<{ outcome: string }>('accept_offer', { p_offer: offer })
const view = await rpc<{ state: string }>('get_offer', { p_offer: offer })
check('an offer accepted after its hold window is refused', late.outcome === 'EXPIRED' && view.state === 'EXPIRED', `${late.outcome} / ${view.state}`)

// 5. nobody is messaged more than 3 times a day
const outcomes: string[] = []
for (const slot of ['S2', 'S3', 'S4', 'S1']) {
  const r = await rpc<Sent>('send_offers', { p_ws: ws, p_key: key, p_slot: slot, p_entries: ['W2'] })
  outcomes.push(r.results[0].code ?? r.results[0].outcome)
}
check('the 4th offer to one customer in a day is refused', outcomes.join() === 'SENT,SENT,SENT,FREQUENCY_CAP', outcomes.join())

// 6. a mistaken cancellation can be undone
await rpc('cancel_slot', { p_ws: ws, p_key: key, p_slot: 'B1' })
const undo = await rpc<Res>('restore_slot', { p_ws: ws, p_key: key, p_slot: 'B1' })
const st = await rpc<{ slots: { id: string; status: string; customer: string | null }[] }>('get_state', { p_ws: ws, p_key: key })
const b1 = st.slots.find((s) => s.id === 'B1')
check('undo restores the original customer', undo.ok && b1?.status === 'booked' && b1.customer === 'Asha', `${b1?.status} ${b1?.customer}`)

// 7. v2: stylists. An absent stylist's gaps are never offered; their customers can be moved.
const staffDay = {
  salon: 'Staff test', now_min: 600,
  staff: [{ id: 'ST1', name: 'Riya', skills: ['hair'], present: true }, { id: 'ST2', name: 'Arjun', skills: ['hair'], present: true }, { id: 'ST3', name: 'Meher', skills: ['nails'], present: true }],
  slots: [
    { id: 'R1', start_min: 720, minutes: 60, skill: 'hair', status: 'free', staff: 'ST1' },
    { id: 'R2', start_min: 840, minutes: 60, skill: 'hair', status: 'booked', customer: 'Ananya', staff: 'ST1' },
    { id: 'A1', start_min: 720, minutes: 60, skill: 'hair', status: 'booked', customer: 'Rohan', staff: 'ST2' },
  ],
  waitlist: [{ id: 'W1', name: 'Meera', minutes: 60, skill: 'hair', consent: true }],
}
const s = await make(staffDay)
const first = await rpc<Sent>('send_offers', { p_ws: s.id, p_key: s.owner_key, p_slot: 'R1', p_entries: ['W1'] })
const out = await rpc<{ blocked: number; revoked_offers: number; at_risk: number }>('set_staff_presence', { p_ws: s.id, p_staff: 'ST1', p_key: s.owner_key, p_present: false })
const tap = await rpc<{ outcome: string }>('accept_offer', { p_offer: first.results[0].offer })
check('a stylist marked out: open offers revoked, gaps held, a late tap cannot book', out.blocked === 1 && out.revoked_offers === 1 && tap.outcome === 'REVOKED', `blocked ${out.blocked}, revoked ${out.revoked_offers}, tap ${tap.outcome}`)
const again = await rpc<Sent>('send_offers', { p_ws: s.id, p_key: s.owner_key, p_slot: 'R1', p_entries: ['W1'] })
check('an absent stylist\'s gap cannot be offered', !again.ok && again.code === 'STAFF_ABSENT', again.code)
const busy = await rpc<Res>('reassign_slot', { p_ws: s.id, p_key: s.owner_key, p_slot: 'R1', p_to: 'ST2' })
const noSkill = await rpc<Res>('reassign_slot', { p_ws: s.id, p_key: s.owner_key, p_slot: 'R2', p_to: 'ST3' })
const moved = await rpc<Res>('reassign_slot', { p_ws: s.id, p_key: s.owner_key, p_slot: 'R2', p_to: 'ST2' })
check('moves refuse a busy or unskilled stylist and accept a free one', busy.code === 'TARGET_BUSY' && noSkill.code === 'TARGET_LACKS_SKILL' && moved.ok, `${busy.code} / ${noSkill.code} / ${moved.ok}`)

// 8. v2: a stylist's key opens only their own day
const sk = await rpc<string>('staff_link', { p_ws: s.id, p_key: s.owner_key, p_staff: 'ST2' })
const own = await rpc<{ staff: { id: string } }>('get_staff_day', { p_ws: s.id, p_staff: 'ST2', p_key: sk })
const other = await fails(rpc('get_staff_day', { p_ws: s.id, p_staff: 'ST1', p_key: sk }))
const desk = await fails(rpc('get_state', { p_ws: s.id, p_key: sk }))
check('a stylist key opens their own day only, never the desk', own.staff.id === 'ST2' && other === 'FORBIDDEN' && desk === 'FORBIDDEN', `${other} / ${desk}`)

// 9. v2: customers sign up themselves; consent is never defaulted
const entry = { name: 'Zoya', service: 'Haircut', minutes: 45, skill: 'hair', price_inr: 600 }
const noChoice = await rpc<Res>('join_waitlist', { p_code: s.join_code, p_entry: entry })
const joined = await rpc<Res & { token: string; place: number }>('join_waitlist', { p_code: s.join_code, p_entry: { ...entry, consent: true } })
const mine = await rpc<{ state: string; consent: boolean }>('get_my_entry', { p_token: joined.token })
await rpc('set_my_consent', { p_token: joined.token, p_consent: false })
await rpc('leave_waitlist', { p_token: joined.token })
const after = await rpc<{ state: string; consent: boolean }>('get_my_entry', { p_token: joined.token })
check('sign-up needs an explicit consent choice; the token manages only that entry', noChoice.code === 'CONSENT_CHOICE_REQUIRED' && mine.state === 'waiting' && after.consent === false && after.state === 'removed', `${noChoice.code}, ${mine.state}, ${after.state}`)

// 10. rate limit: 260 writes in a burst on one demo day, 240 allowed per minute
const burst = await make(day())
let limited = 0
let okCount = 0
for (let i = 0; i < 13; i++) {
  const batch = await Promise.all(Array.from({ length: 20 }, () => fails(rpc('set_clock', { p_ws: burst.id, p_key: burst.owner_key, p_now: 600 }))))
  for (const err of batch) if (err?.includes('RATE_LIMITED')) limited++; else if (!err) okCount++
}
check('a burst of 260 writes is cut off at the per-minute limit', limited > 0 && okCount <= 240, `${okCount} allowed, ${limited} refused`)

for (const [label, ok, note] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${note ? `  (${note})` : ''}`)
const allOk = results.every(([, ok]) => ok)
console.log(allOk ? `\nAll ${results.length} database checks passed.` : '\nAt least one database check FAILED.')
process.exit(allOk ? 0 : 1)
