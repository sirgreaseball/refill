// Every figure on the splash comes from this file. The day is the app's own demo day
// (dayPayload in src/api.ts, built from data/salon/*.csv by src/day.ts), and every decision
// is made by the rules engine (src/engine.ts), so the story stays true if the data changes.
import { dayPayload } from '../api'
import { demoDay } from '../day'
import { REASON_TEXT } from '../desk/common'
import { candidates, notice, race, toMin, type Entry, type Reason, type Slot } from '../engine'
import { lead } from '../ui'

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const day = demoDay()
const payload = dayPayload()

/** The demo clock the sample day opens at (src/api.ts dayPayload: 11:15). */
export const NOW = payload.now_min
export const SALON = day.salon

export type StoryStaff = (typeof day.staff)[number]
export type StorySlot = Slot & { startMin: number; staffId: string }
export const staff = day.staff
export const slots: StorySlot[] = day.slots.map((s) => ({ ...s, startMin: toMin(s.start), staffId: s.staff ?? '' }))
export const waitlist: Entry[] = day.waitlist

// The face runs 10:00 to 20:00, widened to whole hours if anyone works earlier or later (as dayRange in src/Dial.tsx).
export const LO = Math.max(0, Math.floor(Math.min(600, ...staff.map((p) => p.shift_start), ...slots.map((s) => s.startMin)) / 60) * 60)
export const HI = Math.min(1440, Math.ceil(Math.max(1200, ...staff.map((p) => p.shift_end), ...slots.map((s) => s.startMin + s.minutes)) / 60) * 60)

const must = <T,>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`splash: ${what} is missing from data/salon`)
  return v
}
const staffNamed = (name: string) => must(staff.find((p) => p.name === name), name)
const slotOf = (customer: string) => must(slots.find((s) => s.customer === customer), `${customer}'s appointment`)

// ---------------------------------------------------------------- 1. the gap (docs/DEMO_SCRIPT.md, 1:00)

/** Harsh's 12:00 hair spa with Kabir, cancelled at the demo clock. */
export const harsh = slotOf('Harsh')
export const kabir = must(staff.find((p) => p.id === harsh.staffId), 'Kabir')
export const stake = harsh.price_inr ?? 0
export const leadMin = harsh.startMin - NOW
/** engine.notice with the default late cut-off: 45 minutes' notice is LATE. */
export const late = notice(harsh.startMin, NOW) === 'LATE'
const freed: Slot = { ...harsh, status: 'free', customer: null }

// ---------------------------------------------------------------- 2. who fits

const fit = candidates(freed, waitlist, kabir)
export const eligible = fit.eligible
export const excluded = fit.excluded
/** The desk offers the first three who fit (src/desk/SlotSheet.tsx: fresh.slice(0, 3)). */
export const offered = eligible.slice(0, 3)
export const reasonCount = (r: Reason) => excluded.filter((x) => x.reason === r).length
export const reasonOf = (id: string) => excluded.find((x) => x.entry.id === id)?.reason ?? null

/** 13:00 reads as 13; other times stay whole. */
const hour = (t?: string | null) => (t ? (t.endsWith(':00') ? t.slice(0, 2) : t) : null)
/** The reason in a few mono words, from the same facts the engine's explain() uses. */
export function shortWhy(e: Entry, r: Reason): string {
  switch (r) {
    case 'NO_CONSENT': return e.consent === false ? 'said no' : 'no consent'
    case 'SKILL_MISMATCH': return `wants ${e.skill}`
    case 'DURATION_TOO_LONG': return `needs ${e.minutes} min`
    case 'NOT_AVAILABLE': return `free ${hour(e.free_from) ?? 'open'}–${hour(e.free_until) ?? 'close'}`
  }
}
export const noConsent = must(excluded.find((x) => x.reason === 'NO_CONSENT' && x.entry.consent === null), 'a client without consent').entry

// ---------------------------------------------------------------- 3. the race

/** The first two offers tap Book at once; the engine's race() gives the slot to the first, once. */
const tapped = offered.slice(0, 2)
const raced = race({ slots: [freed], waitlist, staff }, freed.id, tapped.map((e) => e.id))
export const winner = must(waitlist.find((e) => e.id === raced.confirmed), 'a race winner')
export const keeper = must(waitlist.find((e) => e.id === raced.waitlisted[0]), 'a client who keeps their place')
export const recovered = winner.price_inr ?? 0

// ---------------------------------------------------------------- 4. staff out

export const arjun = staffNamed('Arjun')
/** Arjun's clients still to come at the demo clock: they need moving (atRisk in src/desk/common.tsx). */
export const toMove = slots.filter((s) => s.staffId === arjun.id && s.status === 'booked' && s.startMin >= NOW)
/** Who can take Manav at the same time: in, working then, able to do it, free (movable in src/desk/common.tsx). */

/**
 * Arjun's clients run through the absence cover planner as the database runs it (cover_absence_plan
 * in supabase/migrations/012_absence_cover.sql; owner rule auto_cover, on by default). In time
 * order, each goes to the least-booked stylist who is in, can do it, is working then and has no
 * slot at all at that time; whoever nobody can take is left for the desk.
 */
const placedOn = new Map(slots.map((s) => [s.id, s.staffId]))
const bookedMinutes = (id: string) => slots.filter((s) => placedOn.get(s.id) === id && s.status === 'booked').reduce((n, s) => n + s.minutes, 0)
export const covered: { slot: StorySlot; to: StoryStaff }[] = []
export const leftOver: StorySlot[] = []
for (const s of toMove) {
  const to = staff
    .filter((p) => p.present && p.id !== arjun.id && p.skills.includes(s.skill) && s.startMin >= p.shift_start && s.startMin + s.minutes <= p.shift_end
      && !slots.some((x) => placedOn.get(x.id) === p.id && x.startMin < s.startMin + s.minutes && x.startMin + x.minutes > s.startMin))
    .sort((a, b) => bookedMinutes(a.id) - bookedMinutes(b.id) || a.id.localeCompare(b.id))[0]
  if (to) { covered.push({ slot: s, to }); placedOn.set(s.id, to.id) } else leftOver.push(s)
}
/** The first appointment Refill covers by itself (Manav, to Riya), and the first the desk sends a link to (Kunal). */
export const manav = must(covered[0]?.slot, 'an appointment auto-cover can place')
export const moveTo = must(covered[0]?.to, 'a stylist free to cover it')
export const kunal = must(leftOver[0], 'an appointment nobody can cover')

// ---------------------------------------------------------------- the day in numbers

export const booked = slots.filter((s) => s.status === 'booked').length
export const open = slots.filter((s) => s.status === 'free' && s.startMin >= NOW)

// ---------------------------------------------------------------- the evidence log

/**
 * The story as the desk's own evidence log: the event codes and wording of sentence() in
 * src/desk/common.tsx, with the facts above. Booking numbers are left out; the story has none.
 */
const at = hhmm(harsh.startMin)
export const LOG = {
  cancel: { code: 'CANCELLED', text: `${harsh.customer} cancelled ${at}: ${late ? 'late, ' : ''}${lead(leadMin)} notice` },
  skipped: excluded.map((x) => ({ id: x.entry.id, code: 'OFFER_SKIPPED', text: `${x.entry.name} not offered ${at}: ${REASON_TEXT[x.reason]}` })),
  sent: offered.map((e) => ({ id: e.id, code: 'OFFER_SENT', text: `Offer sent to ${e.name} for ${at}` })),
  booked: { code: 'BOOKED', text: `${winner.name} booked ${at}: ${inr(recovered)} recovered` },
  retained: { code: 'WAITLIST_RETAINED', text: `${keeper.name} tapped a moment late: keeps their queue place` },
  absent: { code: 'STAFF_ABSENT', text: `${arjun.name} is out today: ${covered.length} ${covered.length === 1 ? 'appointment' : 'appointments'} covered automatically, ${leftOver.length} booked clients to move` },
  moved: { code: 'AUTO_COVERED', text: `Auto-cover: ${manav.customer}'s ${hhmm(manav.startMin)} ${manav.service ?? 'appointment'} moved from ${arjun.name} to ${moveTo.name}, same time` },
  link: { code: 'MOVE_LINK_SENT', text: `${kunal.customer} sent a link to pick a new time (staff member out)` },
}

// ---------------------------------------------------------------- 5. proof (each names the command that produces it)

export const PROOF = [
  // `npm test`: src/engine.test.ts plus tests/core-scenarios.json and tests/scenarios.json, 51 passing (18 Oct).
  { n: 51, label: 'rule tests pass', cmd: 'npm test' },
  // `npm run dbtest`: the 28 check() calls in scripts/db-test.ts, against the live database.
  { n: 28, label: 'live database checks', cmd: 'npm run dbtest' },
  // `npm run flowtest`: the 14 check() calls in scripts/flow-test.ts, one day across every role.
  { n: 14, label: 'cross-role checks', cmd: 'npm run flowtest' },
  // `npm run race`: liveRace(8) in src/liveRace.ts fires 8 taps at one slot; it passes only on exactly 1 booking.
  { n: 8, of: 1, label: 'taps at once, one booking', cmd: 'npm run race' },
] as const

