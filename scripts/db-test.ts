// Database guarantees, tested against the live database with the public key.
// Run: npm run dbtest
// Covers what the public key can and cannot do, payload and text limits, rate limiting,
// offer hold windows, the per-customer message cap, undo, and v2: owner, stylist and
// customer keys, stylist absence and moving appointments.
import { SUPABASE_KEY, SUPABASE_URL } from '../src/config.ts'
import { ApiError, rpc, setBearer } from '../src/rpc.ts'

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

// 10. v2.1: the front desk runs the day but cannot change policy, links or reset
const dk = await rpc<string>('desk_link', { p_ws: s.id, p_key: s.owner_key })
const asDesk = await rpc<{ role: string }>('get_state', { p_ws: s.id, p_key: dk })
const deskPolicy = await fails(rpc('set_policy', { p_ws: s.id, p_key: dk, p_policy: { hold_min: 30 } }))
const deskLink = await fails(rpc('staff_link', { p_ws: s.id, p_key: dk, p_staff: 'ST1' }))
const ownerPolicy = await rpc<Res>('set_policy', { p_ws: s.id, p_key: s.owner_key, p_policy: { hold_min: 30 } })
const badPolicy = await rpc<Res>('set_policy', { p_ws: s.id, p_key: s.owner_key, p_policy: { hold_min: 999 } })
check('front desk key: runs the day, refused policy and links; owner policy is bounds-checked',
  asDesk.role === 'desk' && deskPolicy === 'FORBIDDEN' && deskLink === 'FORBIDDEN' && ownerPolicy.ok && badPolicy.code === 'INVALID_VALUE',
  `${asDesk.role}, ${deskPolicy}, ${deskLink}, ${badPolicy.code}`)

// 11. v2.1: moves stay inside working hours, and the time left behind opens for the waitlist
type Opt = { staff: string; start_min: number; same_time: boolean }
const shiftDay = {
  salon: 'Move test', now_min: 600,
  staff: [
    { id: 'ST1', name: 'Riya', skills: ['hair'], present: true, shift_start: 600, shift_end: 1200 },
    { id: 'ST2', name: 'Arjun', skills: ['hair'], present: true, shift_start: 600, shift_end: 780 },
  ],
  slots: [
    { id: 'R1', start_min: 900, minutes: 60, skill: 'hair', status: 'booked', customer: 'Ananya', staff: 'ST1' },
    { id: 'A1', start_min: 660, minutes: 60, skill: 'hair', status: 'booked', customer: 'Rohan', staff: 'ST2' },
  ],
  waitlist: [{ id: 'W1', name: 'Meera', minutes: 60, skill: 'hair', consent: true }],
}
const m = await make(shiftDay)
await rpc('set_staff_presence', { p_ws: m.id, p_staff: 'ST1', p_key: m.owner_key, p_present: false })
const opts = await rpc<Opt[]>('get_move_options', { p_ws: m.id, p_key: m.owner_key, p_slot: 'R1' })
const offShift = await rpc<Res>('reassign_slot', { p_ws: m.id, p_key: m.owner_key, p_slot: 'R1', p_to: 'ST2' })
check('a stylist who has gone home is never offered: no option after their shift, reassign refused',
  opts.length > 0 && opts.every((o) => o.staff === 'ST2' && o.start_min + 60 <= 780 && (o.start_min >= 720 || o.start_min + 60 <= 660)) && offShift.code === 'TARGET_OFF_SHIFT',
  `${opts.length} options, ${offShift.code}`)
const link = await rpc<{ move: string }>('move_link', { p_ws: m.id, p_key: m.owner_key, p_slot: 'R1' })
const view1 = await rpc<{ state: string; reason: string; options: Opt[] }>('get_move', { p_move: link.move })
const pick = view1.options[0]
const chose = await rpc<Res & { slot: string }>('choose_move', { p_move: link.move, p_staff: pick.staff, p_start: pick.start_min })
const twice = await rpc<Res>('choose_move', { p_move: link.move, p_staff: pick.staff, p_start: pick.start_min })
const ms = await rpc<{ slots: { id: string; status: string; customer: string | null }[] }>('get_state', { p_ws: m.id, p_key: m.owner_key })
const fromSlot = ms.slots.find((x) => x.id === 'R1')
const toSlot = ms.slots.find((x) => x.id === chose.slot)
check('the customer picks a new time from their link: moved once, old time held (stylist out)',
  view1.state === 'open' && view1.reason === 'STAFF_ABSENT' && chose.ok && twice.code === 'MOVED' && toSlot?.customer === 'Ananya' && fromSlot?.status === 'blocked',
  `${view1.reason}, ${chose.code ?? 'ok'}, ${twice.code}, from ${fromSlot?.status}`)

// 12. v2.1: a customer can cancel from their link; the slot opens for the waitlist
const c = await make({ ...shiftDay, staff: shiftDay.staff.map((p) => ({ ...p, shift_end: 1200 })) })
const cl = await rpc<{ move: string }>('move_link', { p_ws: c.id, p_key: c.owner_key, p_slot: 'R1' })
const gone = await rpc<Res & { notice: string }>('cancel_my_booking', { p_move: cl.move })
const refill = await rpc<Sent>('send_offers', { p_ws: c.id, p_key: c.owner_key, p_slot: 'R1', p_entries: ['W1'] })
check('a customer cancelling from their link opens the slot, and it can be offered at once',
  gone.ok && refill.results[0].outcome === 'SENT', `${gone.notice}, ${refill.results[0].outcome}`)

// 12b. 006: an accepted offer follows its booking (#9); a withdrawn offer is not an opt-out (#11);
// the sign-up shows the owner's message cap (#14)
type OfferView = { state: string; reason?: string | null; moved?: boolean; booking: number | null; slot: { start_min: number; staff: string | null } }
const t = await make({
  salon: 'Offer truth', now_min: 600,
  staff: [{ id: 'ST1', name: 'Riya', skills: ['hair'], present: true }, { id: 'ST2', name: 'Arjun', skills: ['hair'], present: true }],
  slots: [
    { id: 'R1', start_min: 870, minutes: 60, skill: 'hair', status: 'free', staff: 'ST1' },
    { id: 'R2', start_min: 960, minutes: 60, skill: 'hair', status: 'free', staff: 'ST1' },
  ],
  waitlist: [{ id: 'W1', name: 'Omar', minutes: 60, skill: 'hair', consent: true }, { id: 'W2', name: 'Meera', minutes: 60, skill: 'hair', consent: true }],
})
const o1 = (await rpc<Sent>('send_offers', { p_ws: t.id, p_key: t.owner_key, p_slot: 'R1', p_entries: ['W1'] })).results[0].offer!
await rpc('accept_offer', { p_offer: o1 })
await rpc<Res>('move_booking', { p_ws: t.id, p_key: t.owner_key, p_slot: 'R1', p_staff: 'ST2', p_start: 780 })
const afterMove = await rpc<OfferView>('get_offer', { p_offer: o1 })
const ts = await rpc<{ slots: { id: string; status: string; customer: string | null }[] }>('get_state', { p_ws: t.id, p_key: t.owner_key })
const movedTo = ts.slots.find((x) => x.customer === 'Omar' && x.status === 'booked')!
await rpc('cancel_slot', { p_ws: t.id, p_key: t.owner_key, p_slot: movedTo.id })
const afterCancel = await rpc<OfferView>('get_offer', { p_offer: o1 })
check('an accepted offer follows its booking: moved shows the new time, cancelled says so',
  afterMove.state === 'CONFIRMED' && afterMove.moved === true && afterMove.slot.start_min === 780 && afterMove.slot.staff === 'Arjun' && afterCancel.state === 'CANCELLED',
  `${afterMove.state} ${afterMove.slot.start_min} ${afterMove.slot.staff}, then ${afterCancel.state}`)
const o2 = (await rpc<Sent>('send_offers', { p_ws: t.id, p_key: t.owner_key, p_slot: 'R2', p_entries: ['W2'] })).results[0].offer!
await rpc('set_staff_presence', { p_ws: t.id, p_staff: 'ST1', p_key: t.owner_key, p_present: false })
const withdrawn = await rpc<OfferView>('get_offer', { p_offer: o2 })
await rpc('set_policy', { p_ws: t.id, p_key: t.owner_key, p_policy: { max_offers: 4 } })
const info = await rpc<{ ok: boolean; max_offers?: number }>('join_info', { p_code: t.join_code })
check('staff out withdraws an offer without claiming an opt-out; sign-up shows the real cap',
  withdrawn.state === 'WITHDRAWN' && withdrawn.reason === 'STAFF_ABSENT' && info.max_offers === 4,
  `${withdrawn.state}/${withdrawn.reason}, cap ${info.max_offers}`)

// 12b2. 009: a live business needs an account. The checks below run as a throwaway owner account,
// which only works when email confirmation is off for the project (Supabase Auth settings).
const anonBiz = await rpc<Res>('create_business', { p_biz: { name: 'No account', staff: [{ name: 'A' }] } })
check('a business cannot be created without signing in', anonBiz.code === 'SIGN_IN', anonBiz.code)
const authSettings = await (await raw('/auth/v1/settings')).json()
let token: string | null = null
if (authSettings.mailer_autoconfirm) {
  const made = await raw('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: `dbtest-${crypto.randomUUID().slice(0, 8)}@example.com`, password: crypto.randomUUID() }) })
  token = (await made.json()).access_token ?? null
}
check('a throwaway account signs up without confirming an email', !!token, token ? 'session returned' : authSettings.mailer_autoconfirm ? 'no session returned' : 'turn off "Confirm email" in Supabase Auth')
if (token) {
  setBearer(async () => token)
  // 12c. 007: a live business starts empty on the real clock, and its owner runs staff, services and tasks
  type Live = { ok: boolean; code?: string; id: string; owner_key: string; join_code: string }
  type LiveState = { workspace: { kind: string; now_min: number }; staff: { id: string; name: string; active: boolean }[]; services: { id: string }[]; slots: { id: string; status: string; staff_id: string }[]; tasks: { id: number; done: boolean }[] }
  const biz = await rpc<Live>('create_business', { p_biz: {
    name: 'Test Tutors', type: 'Tuition',
    staff: [{ name: 'Asha', skills: ['maths'], shift_start: 0, shift_end: 1440 }, { name: 'Ravi', skills: ['physics'], shift_start: 0, shift_end: 1440 }],
    services: [{ name: 'Maths class', minutes: 60, skill: 'maths', price_inr: 500 }],
  } })
  const noStaff = await rpc<Res>('create_business', { p_biz: { name: 'Empty', staff: [] } })
  const ls = await rpc<LiveState>('get_state', { p_ws: biz.id, p_key: biz.owner_key })
  const liveClock = await fails(rpc('set_clock', { p_ws: biz.id, p_key: biz.owner_key, p_now: 600 }))
  const liveReset = await fails(rpc('reset_workspace', { p_ws: biz.id, p_key: biz.owner_key, p_day: {} }))
  const synced = await rpc<Res & { now_min: number }>('sync_clock', { p_ws: biz.id, p_key: biz.owner_key })
  check('a live business starts empty with its staff and services; no demo clock, no reset',
    biz.ok && noStaff.code === 'INVALID_VALUE' && ls.workspace.kind === 'live' && ls.staff.length === 2 && ls.services.length === 1 && ls.slots.length === 0
      && liveClock === 'LIVE_CLOCK' && liveReset === 'NOT_DEMO' && synced.ok,
    `${ls.workspace.kind}, ${ls.staff.length} staff, ${liveClock}, ${liveReset}`)
  const later = Math.min(synced.now_min + 30, 1300)
  const appt = await rpc<Res & { id: string }>('add_appointment', { p_ws: biz.id, p_key: biz.owner_key, p_appt: { staff: 'ST1', start_min: later, minutes: 60, customer: 'Kiran', service: 'Maths class', skill: 'maths', price_inr: 500 } })
  const clash = await rpc<Res>('add_appointment', { p_ws: biz.id, p_key: biz.owner_key, p_appt: { staff: 'ST1', start_min: later + 30, minutes: 30 } })
  const past = await rpc<Res>('add_appointment', { p_ws: biz.id, p_key: biz.owner_key, p_appt: { staff: 'ST2', start_min: 0, minutes: 30 } })
  const openTime = await rpc<Res & { id: string }>('add_appointment', { p_ws: biz.id, p_key: biz.owner_key, p_appt: { staff: 'ST2', start_min: later, minutes: 60, skill: 'physics' } })
  check('the desk adds an appointment or open time; overlaps and past times are refused',
    appt.ok && clash.code === 'TARGET_BUSY' && (synced.now_min < 30 || past.code === 'TOO_SOON') && openTime.ok,
    `${appt.code ?? 'ok'}, ${clash.code}, ${past.code}, ${openTime.code ?? 'ok'}`)
  const added = await rpc<Res & { id: string }>('save_staff', { p_ws: biz.id, p_key: biz.owner_key, p_staff: { name: 'Neha', skills: ['maths'], shift_start: 540, shift_end: 1020 } })
  const blockedRemove = await rpc<Res>('remove_staff', { p_ws: biz.id, p_key: biz.owner_key, p_staff: 'ST1' })
  const removed = await rpc<Res>('remove_staff', { p_ws: biz.id, p_key: biz.owner_key, p_staff: 'ST2' })
  const deskKey = await rpc<string>('desk_link', { p_ws: biz.id, p_key: biz.owner_key })
  // The desk key alone, without the owner's account: an owner signed in stands behind any key.
  setBearer(async () => null)
  const deskAdd = await fails(rpc('save_staff', { p_ws: biz.id, p_key: deskKey, p_staff: { name: 'X' } }))
  setBearer(async () => token)
  const task = await rpc<Res & { id: number }>('add_task', { p_ws: biz.id, p_key: biz.owner_key, p_staff: 'ST1', p_text: 'Print worksheets' })
  const asha = await rpc<string>('staff_link', { p_ws: biz.id, p_key: biz.owner_key, p_staff: 'ST1' })
  const ticked = await rpc<Res>('set_task', { p_ws: biz.id, p_key: asha, p_task: task.id, p_done: true })
  const ls2 = await rpc<LiveState>('get_state', { p_ws: biz.id, p_key: biz.owner_key })
  check('owner adds and removes staff (refused while they have clients ahead), desk cannot; staff tick their own tasks',
    added.ok && blockedRemove.code === 'HAS_BOOKINGS' && removed.ok && deskAdd === 'FORBIDDEN' && ticked.ok
      && ls2.staff.map((p) => p.id).join() === 'ST1,ST3' && !ls2.slots.some((x) => x.staff_id === 'ST2') && ls2.tasks[0]?.done === true,
    `${blockedRemove.code}, ${deskAdd}, staff ${ls2.staff.map((p) => p.id).join()}`)

  // 009: the account owns the business. It opens with no key; without the account, it does not.
  const byAccount = await rpc<{ role: string }>('get_state', { p_ws: biz.id, p_key: '' })
  const mine = await rpc<{ id: string }[]>('my_businesses', {})
  setBearer(async () => null)
  const stranger = await fails(rpc('get_state', { p_ws: biz.id, p_key: '' }))
  check('the owner account opens its business without a key; a stranger cannot',
    byAccount.role === 'owner' && mine.some((x) => x.id === biz.id) && stranger === 'FORBIDDEN', `${byAccount.role}, ${mine.length}, ${stranger}`)
}

// 13. rate limit: 260 writes in a burst on one demo day, 240 allowed per minute
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
