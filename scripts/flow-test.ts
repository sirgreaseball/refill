// One day, every role, against the live database: does each action reach the other people?
// Run: npm run flowtest
// Owner (key), front desk (its own key), staff member (their link), client (their private
// token). Each step acts as one role, then reads what another role sees. No accounts needed;
// the account versions of these pages read the same rows.
import { rpc } from '../src/rpc.ts'

const results: [string, boolean, string?][] = []
const check = (label: string, ok: boolean, note?: string) => results.push([label, ok, note])

type Made = { id: string; owner_key: string; join_code: string }
type Mine = { state: string; place: number; consent: boolean | null; offers: { id: string; status: string; slot_status: string }[]; booking: { status: string; start_min: number; stylist: string; stylist_present: boolean } | null }
type St = { slots: { id: string; status: string; customer: string | null; staff_id: string; start_min: number }[]; waitlist: { id: string; name: string; consent: boolean | null; status: string }[]; tasks?: { id: number; done: boolean; text: string }[] }

const day = {
  salon: 'Flow test', now_min: 600,
  staff: [
    { id: 'ST1', name: 'Riya', skills: ['hair'], present: true, shift_start: 600, shift_end: 1200 },
    { id: 'ST2', name: 'Arjun', skills: ['hair'], present: true, shift_start: 600, shift_end: 1200 },
  ],
  slots: [
    { id: 'R1', start_min: 720, minutes: 60, skill: 'hair', status: 'booked', customer: 'Ananya', staff: 'ST1', service: 'Hair spa', price_inr: 1600 },
    { id: 'A1', start_min: 900, minutes: 60, skill: 'hair', status: 'booked', customer: 'Rohan', staff: 'ST2', service: 'Haircut', price_inr: 650 },
  ],
  waitlist: [],
}
const ws = await rpc<Made>('create_workspace', { p_day: day })
const owner = { p_ws: ws.id, p_key: ws.owner_key }
const deskKey = await rpc<string>('desk_link', owner)
const desk = { p_ws: ws.id, p_key: deskKey }
const staffKey = await rpc<string>('staff_link', { ...owner, p_staff: 'ST1' })
const ownerSees = () => rpc<St>('get_state', owner)

// 1. A client joins from the counter code; owner and desk see them at once.
const joined = await rpc<{ ok: boolean; token: string }>('join_waitlist', { p_code: ws.join_code, p_entry: { name: 'Meera Flow', service: 'Hair spa', minutes: 60, skill: 'hair', price_inr: 1600, consent: true } })
const me = () => rpc<Mine>('get_my_entry', { p_token: joined.token })
let m = await me()
let s = await ownerSees()
const entryId = s.waitlist.find((e) => e.name === 'Meera Flow')?.id ?? ''
check('client joins with the code; the owner sees them waiting with their consent', joined.ok && m.state === 'waiting' && m.place === 1 && s.waitlist.some((e) => e.id === entryId && e.consent === true))

// 2. The desk records a cancellation and offers the gap; the client sees the offer.
const cancel = await rpc<{ ok: boolean }>('cancel_slot', { ...desk, p_slot: 'R1' })
const sent = await rpc<{ ok: boolean; results: { offer?: string; outcome: string }[] }>('send_offers', { ...desk, p_slot: 'R1', p_entries: [entryId] })
m = await me()
check('desk cancels and offers; the client sees the open offer', cancel.ok && sent.results[0]?.outcome === 'SENT' && m.offers.some((o) => o.status === 'sent' && o.slot_status === 'free'))

// 3. The client books; owner sees the slot refilled with their name.
const tap = await rpc<{ outcome: string }>('accept_offer', { p_offer: sent.results[0].offer })
m = await me()
s = await ownerSees()
check('client books; owner sees the slot refilled by them; client sees the booking', tap.outcome === 'CONFIRMED' && m.state === 'booked' && m.booking?.status === 'confirmed' && s.slots.find((x) => x.id === 'R1')?.customer === 'Meera Flow')

// 4. The staff member marks themselves out from their own link; the client is told.
const outR = await rpc<{ ok: boolean }>('set_staff_presence', { p_ws: ws.id, p_staff: 'ST1', p_key: staffKey, p_present: false })
m = await me()
check('staff marks themselves out; the client sees their stylist is out', outR.ok && m.booking?.stylist_present === false)

// 5. The desk sends a move link; the client picks a time with someone who is in.
const link = await rpc<{ ok: boolean; move: string }>('move_link', { ...desk, p_slot: 'R1' })
const view = await rpc<{ options: { staff: string; start_min: number }[] }>('get_move', { p_move: link.move })
const pick = view.options.find((o) => o.staff === 'ST2')
const chose = pick ? await rpc<{ ok: boolean }>('choose_move', { p_move: link.move, p_staff: pick.staff, p_start: pick.start_min }) : { ok: false }
m = await me()
check('client moves to a staff member who is in; their page shows the new time', chose.ok && m.booking?.status === 'confirmed' && m.booking.stylist === 'Arjun' && m.booking.stylist_present === true, pick ? `moved to ${pick.start_min}` : 'no option')

// 6. Owner gives the staff member a task; they see it and tick it; owner sees it done.
const task = await rpc<{ ok: boolean; id: number }>('add_task', { ...owner, p_staff: 'ST1', p_text: 'Restock towels' })
const staffDay = await rpc<{ tasks?: { id: number; text: string; done: boolean }[] }>('get_staff_day', { p_ws: ws.id, p_staff: 'ST1', p_key: staffKey })
const tick = await rpc<{ ok: boolean }>('set_task', { p_ws: ws.id, p_key: staffKey, p_task: task.id, p_done: true })
s = await ownerSees()
check('owner adds a task; the staff member sees it, ticks it; owner sees it done',
  task.ok && !!staffDay.tasks?.some((t) => t.text === 'Restock towels') && tick.ok && !!s.tasks?.some((t) => t.id === task.id && t.done), `task ${task.id}`)

// 7. The desk cancels the client's booking; the client's page says so (not "you left").
const bookedSlot = (await ownerSees()).slots.find((x) => x.customer === 'Meera Flow')
const cancel2 = await rpc<{ ok: boolean }>('cancel_slot', { ...desk, p_slot: bookedSlot?.id })
m = await me()
check('desk cancels the client’s booking; the client sees it cancelled', cancel2.ok && m.booking?.status === 'cancelled')

// 8. Consent from the client reaches the desk; the desk's change reaches the client.
const j2 = await rpc<{ token: string }>('join_waitlist', { p_code: ws.join_code, p_entry: { name: 'Zoya Flow', service: 'Haircut', minutes: 30, skill: 'hair', price_inr: 650, consent: true } })
await rpc('set_my_consent', { p_token: j2.token, p_consent: false })
s = await ownerSees()
const zoya = s.waitlist.find((e) => e.name === 'Zoya Flow')
await rpc('set_consent', { ...desk, p_entry: zoya?.id, p_consent: true, p_source: 'front desk' })
const z = await rpc<Mine>('get_my_entry', { p_token: j2.token })
check('client switches messages off: the desk sees it; the desk records a yes: the client sees it', zoya?.consent === false && z.consent === true)

// 9. Demo days never appear in the public directory.
const dir = await rpc<{ code: string }[]>('directory', { p_q: 'Flow test' })
check('a demo day is never listed in the directory', !dir.some((b) => b.code === ws.join_code))

for (const [label, ok, note] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${note ? `  (${note})` : ''}`)
const allOk = results.every(([, ok]) => ok)
console.log(allOk ? `\nAll ${results.length} flow checks passed.` : '\nAt least one flow check FAILED.')
process.exit(allOk ? 0 : 1)
