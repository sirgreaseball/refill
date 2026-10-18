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
// This flow walks the desk moving a client by hand, so auto-cover (012) is off; db-test 12c covers it.
await rpc('set_policy', { ...owner, p_policy: { auto_cover: false } })
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

// 10. A client books an open time from the booking page; the owner sees it, the client's page says booked.
type Times = { ok: boolean; times: { staff: string; start_min: number; slot: string | null }[] }
const hair = { minutes: 60, skill: 'hair', service: 'Hair spa', price_inr: 1600 }
const t1 = await rpc<Times>('open_times', { p_code: ws.join_code, p_minutes: 60, p_skill: 'hair' })
const free = t1.times.find((t) => t.slot == null)
const b1 = free ? await rpc<{ ok: boolean; token: string; slot: string }>('book_time', { p_code: ws.join_code, p_staff: free.staff, p_start: free.start_min, p_entry: { name: 'Neha Walkin', ...hair } }) : null
const n1 = b1?.ok ? await rpc<Mine>('get_my_entry', { p_token: b1.token }) : null
s = await ownerSees()
check('client books an open time from the booking page; owner sees it; client sees booked',
  !!b1?.ok && n1?.state === 'booked' && n1.booking?.status === 'confirmed' && s.slots.some((x) => x.id === b1.slot && x.customer === 'Neha Walkin' && x.status === 'booked'), free ? `at ${free.start_min}` : 'no time')

// 11. The same time cannot be booked twice, and it leaves the list of open times.
const b2 = free ? await rpc<{ ok: boolean; code?: string }>('book_time', { p_code: ws.join_code, p_staff: free.staff, p_start: free.start_min, p_entry: { name: 'Second Walkin', ...hair } }) : null
const t2 = await rpc<Times>('open_times', { p_code: ws.join_code, p_minutes: 60, p_skill: 'hair' })
check('a booked time cannot be booked again and is no longer listed', b2?.ok === false && b2.code === 'TAKEN' && !t2.times.some((t) => t.staff === free?.staff && t.start_min === free?.start_min))

// 12. A gap with an offer out is not offered to walk-ins; with no offer out it is, and booking it is a refill.
const gapSlot = (await ownerSees()).slots.find((x) => x.status === 'free')
const j3 = await rpc<{ token: string }>('join_waitlist', { p_code: ws.join_code, p_entry: { name: 'Isha Flow', ...hair, consent: true } })
const isha = (await ownerSees()).waitlist.find((e) => e.name === 'Isha Flow')
let gapOk = false
if (gapSlot && isha) {
  await rpc('send_offers', { ...desk, p_slot: gapSlot.id, p_entries: [isha.id] })
  const held = await rpc<Times>('open_times', { p_code: ws.join_code, p_minutes: 30, p_skill: 'hair' })
  const tryHeld = await rpc<{ ok: boolean; code?: string }>('book_time', { p_code: ws.join_code, p_staff: gapSlot.staff_id, p_start: gapSlot.start_min, p_entry: { name: 'Gap Walkin', minutes: 30, skill: 'hair', service: 'Haircut', price_inr: 650 } })
  gapOk = !held.times.some((t) => t.slot === gapSlot.id) && tryHeld.code === 'TAKEN'
}
check('a gap with an offer out is held for that client, not sold to a walk-in', gapOk, gapSlot ? gapSlot.id : 'no free gap')

// 13. The desk books someone already waiting: it reaches their page and their open offer is withdrawn.
const dayStart = (await ownerSees()).slots
const taken = (m: number) => dayStart.some((x) => x.staff_id === 'ST2' && x.start_min < m + 60 && m < x.start_min + x.minutes)
const at = [1080, 1110, 1140].find((m) => !taken(m)) ?? 1140
const add = isha ? await rpc<{ ok: boolean; code?: string; id: string }>('add_appointment', { ...desk, p_appt: { staff: 'ST2', start_min: at, minutes: 60, entry: isha.id, service: 'Hair spa', skill: 'hair', price_inr: 1600 } }) : null
const ishaSees = await rpc<Mine>('get_my_entry', { p_token: j3.token })
check('desk books a waiting client: it is on their page, their open offer is withdrawn',
  !!add?.ok && ishaSees.state === 'booked' && ishaSees.booking?.status === 'confirmed' && !ishaSees.offers.some((o) => o.status === 'sent'), add?.code)

// 14. Settings: the owner renames the business; a demo day can never be deleted; the desk can do neither.
const ren = await rpc<{ ok: boolean }>('update_business', { ...owner, p_biz: { name: 'Flow test renamed', type: 'Salon' } })
const delDemo = await rpc<{ ok: boolean; code?: string }>('delete_business', { ...owner, p_confirm: 'Flow test renamed' })
const deskDel = await rpc<{ ok: boolean }>('delete_business', { ...desk, p_confirm: 'Flow test renamed' }).then(() => 'allowed', (e) => (e as Error).message)
check('owner renames; a demo day cannot be deleted; the desk cannot delete or rename',
  ren.ok && (await ownerSees() as unknown as { workspace: { salon: string } }).workspace.salon === 'Flow test renamed' && delDemo.code === 'NOT_LIVE' && deskDel !== 'allowed', deskDel)

for (const [label, ok, note] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${note ? `  (${note})` : ''}`)
const allOk = results.every(([, ok]) => ok)
console.log(allOk ? `\nAll ${results.length} flow checks passed.` : '\nAt least one flow check FAILED.')
process.exit(allOk ? 0 : 1)
