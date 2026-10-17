// What every front-desk and owner view shares: the plain words for each rule and event,
// what a slot or an offer means right now, and `useRun`, which calls a database function
// and tells the person what happened in one sentence.
import { useCallback } from 'react'
import type { DbEvent, DbOffer, DbSlot, DbStaff, State, useBook } from '../api'
import { clock, lead, money, useToast } from '../ui'

export type Book = ReturnType<typeof useBook>
export type Run = <T>(fn: string, args: Record<string, unknown>, ok?: (r: T) => string | null) => Promise<T | null>
export type Live = 'waiting' | 'taken' | 'no-consent' | 'booked' | 'lost' | 'declined' | 'revoked' | 'expired'
export type Kind = 'open' | 'lapsed' | 'blocked' | 'risk' | 'refilled' | 'booked'

export const REASON_TEXT: Record<string, string> = {
  NO_CONSENT: 'no permission to message',
  SKILL_MISMATCH: 'a different service',
  DURATION_TOO_LONG: 'needs more time than the gap',
  NOT_AVAILABLE: 'not free at that time',
  NOT_WAITING: 'already booked',
  ALREADY_BOOKED: 'already booked elsewhere',
  SLOT_UNAVAILABLE: 'the slot was no longer available',
  UNKNOWN_ENTRY: 'not on the waitlist',
  FREQUENCY_CAP: 'already messaged the most times allowed today',
  OFFER_EXPIRED: 'the offer had expired',
  NO_REPLY: 'no reply within the hold window',
  STAFF_ABSENT: 'the staff member is out',
  SLOT_TOO_SOON: 'it starts too soon',
}
export const MOVE_TEXT: Record<string, string> = {
  TARGET_ABSENT: 'that staff member is out',
  TARGET_BUSY: 'that staff member has something else then',
  TARGET_LACKS_SKILL: 'that staff member does not do this service',
  SAME_STYLIST: 'it is already theirs',
  TARGET_OFF_SHIFT: 'that staff member is not working then',
  TOO_SOON: 'that time starts too soon',
  ALREADY_STARTED: 'the appointment has already started',
  SAME_TIME: 'that is the time it already has',
  NOT_BOOKED: 'nobody is booked there any more',
}
export const LIVE_TEXT: Record<Live, string> = {
  waiting: 'Waiting for reply', taken: 'Slot taken', 'no-consent': 'Consent withdrawn', booked: 'Booked',
  lost: 'Tapped late, kept place', declined: 'Declined', revoked: 'Withdrawn', expired: 'No reply in time',
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
export const first = (name: string | null | undefined) => (name ?? 'the client').split(' ')[0]
export const offerUrl = (id: string) => `${location.origin}${location.pathname}#/o/${id}`
export const staffFor = (st: State, s: DbSlot) => st.staff.find((p) => p.id === s.staff_id) ?? null

/** A booked client whose staff member is out, still ahead of us: someone has to move them. */
export const atRisk = (st: State, s: DbSlot) => s.status === 'booked' && s.start_min >= st.workspace.now_min && staffFor(st, s)?.present === false

export function kindOf(st: State, s: DbSlot): Kind {
  if (s.status === 'blocked') return 'blocked'
  if (s.status === 'free') return s.start_min >= st.workspace.now_min + st.workspace.min_lead_min ? 'open' : 'lapsed'
  return atRisk(st, s) ? 'risk' : s.refilled ? 'refilled' : 'booked'
}

/** Staff who could take this slot at its time: in today, working then, nothing else then, and (for a booking) able to do the service. */
export function movable(st: State, s: DbSlot): DbStaff[] {
  return st.staff.filter((p) => p.present && p.id !== s.staff_id
    && s.start_min >= p.shift_start && s.start_min + s.minutes <= p.shift_end
    && (s.status !== 'booked' || p.skills.includes(s.skill))
    && !st.slots.some((x) => x.staff_id === p.id && x.id !== s.id && x.start_min < s.start_min + s.minutes && x.start_min + x.minutes > s.start_min))
}

/** What an offer means right now, from the client's side. */
export function offerState(o: DbOffer, st: State): Live {
  if (o.status === 'accepted') return 'booked'
  if (o.status === 'waitlisted') return 'lost'
  if (o.status === 'declined') return 'declined'
  if (o.status === 'revoked') return 'revoked'
  if (o.status === 'expired' || (o.expires_min != null && st.workspace.now_min >= o.expires_min)) return 'expired'
  const e = st.waitlist.find((x) => x.id === o.entry_id)
  const s = st.slots.find((x) => x.id === o.slot_id)
  if (e?.consent !== true) return 'no-consent'
  if (s?.status !== 'free' || e.status !== 'waiting') return 'taken'
  return 'waiting'
}

/** Today's figures, counted from the same state the desk shows. */
export function figures(st: State) {
  const now = st.workspace.now_min
  const recovered = st.slots.filter((s) => s.status === 'booked' && s.refilled)
  const open = st.slots.filter((s) => kindOf(st, s) === 'open')
  const risk = st.slots.filter((s) => atRisk(st, s))
  const held = st.slots.filter((s) => s.status === 'blocked' && s.start_min + s.minutes > now)
  return {
    recovered: recovered.reduce((n, s) => n + (s.price_inr ?? 0), 0), refilled: recovered.length,
    openValue: open.reduce((n, s) => n + (s.price_inr ?? 0), 0), open, risk, held,
  }
}

/** One plain sentence per evidence-log event. */
export function sentence(ev: DbEvent, st: State): string {
  const e = st.waitlist.find((x) => x.id === ev.entry_id)
  const s = st.slots.find((x) => x.id === ev.slot_id)
  const d = ev.detail as Record<string, number | string | boolean | null>
  const who = e?.name ?? ev.entry_id ?? 'Someone'
  const at = s ? clock(s.start_min) : ''
  const revoked = Number(d.revoked_offers) ? `, ${plural(Number(d.revoked_offers), 'open offer')} withdrawn` : ''
  switch (ev.kind) {
    case 'DAY_LOADED': return ev.code === 'RESET' ? 'Demo day reset to its start' : `Day loaded: ${d.slots} appointments, ${d.waitlist} on the waitlist`
    case 'CANCELLED': return `${d.customer ?? 'A client'} cancelled ${at}${d.by === 'customer' ? ' from their own link' : ''}: ${ev.code === 'LATE' ? `late, ${lead(Number(d.notice_min))} notice` : ev.code === 'PAST' ? 'after it started' : `${lead(Number(d.notice_min))} notice`}${d.staff_absent ? '; staff member is out, so the gap is held' : ''}`
    case 'CANCEL_UNDONE': return `Cancellation undone: ${d.customer} is back at ${at}${revoked}`
    case 'OFFER_SENT': return `Offer sent to ${who} for ${at}${d.expires_min != null ? `, holds until ${clock(Number(d.expires_min))}` : ''}`
    case 'OFFER_EXPIRED': return `${who} did not reply by ${clock(Number(d.expires_min))}: offer for ${at} expired`
    case 'OFFER_SKIPPED': return `${who} not offered ${at}: ${REASON_TEXT[ev.code ?? ''] ?? ev.code}`
    case 'BOOKED': return `${who} booked ${at}, booking #${ev.booking_id}, ${money(Number(d.price_inr))} recovered`
    case 'WAITLIST_RETAINED': return `${who} tapped a moment late: lost to #${d.lost_to}, keeps queue place ${d.place}`
    case 'ACCEPT_REPEATED': return `${who} tapped Book again: still one booking (#${ev.booking_id})`
    case 'ACCEPT_REJECTED': return `${who} could not book ${at}: ${REASON_TEXT[ev.code ?? ''] ?? ev.code}`
    case 'OFFER_DECLINED': return `${who} declined ${at}`
    case 'CONSENT_GIVEN': return `${who} said yes to messages (${d.source})`
    case 'CONSENT_WITHDRAWN': return `${who} withdrew consent (${d.source})${revoked}`
    case 'CONSENT_UNKNOWN': return `${who}: consent unknown, never messaged until they say yes`
    case 'WAITLIST_ADDED': return `${who} joined the waitlist ${d.source === 'self sign-up' ? 'from the sign-up link' : 'at the front desk'}${d.consent === true ? ', said yes to messages' : d.consent === false ? ', said no to messages' : ''}`
    case 'WAITLIST_LEFT': return `${who} left the waitlist${revoked}`
    case 'STAFF_ABSENT': return `${d.name} is out today: ${plural(Number(d.at_risk), 'booked client')} to move, ${plural(Number(d.blocked), 'open gap')} held${revoked}`
    case 'STAFF_BACK': return `${d.name} is back in: ${plural(Number(d.freed), 'gap')} open again`
    case 'REASSIGNED': return `${d.was === 'booked' ? `${d.customer}'s ${at} appointment` : `The ${at} gap`} moved from ${d.from} to ${d.to}`
    case 'MOVED': return `${d.customer} moved from ${clock(Number(d.from_min))} with ${d.from} to ${clock(Number(d.to_min))} with ${d.to} (by ${d.by})${d.into_gap ? ', filling an open gap' : ''}${d.opened ? '; their old time is open to fill' : '; their old time is held'}${revoked}`
    case 'MOVE_LINK_SENT': return `${d.customer} sent a link to ${ev.code === 'STAFF_ABSENT' ? 'pick a new time (staff member out)' : 'move or cancel'} ${at}`
    case 'POLICY_CHANGED': return `Owner changed the rules: offers hold ${d.hold_min} min, at most ${d.max_offers} messages a day, late = under ${lead(Number(d.late_cutoff_min))}`
    case 'DESK_LINK_MADE': return 'Owner made a new front-desk link; the old one stopped working'
    default: return ev.kind
  }
}
export const chip = (ev: DbEvent) =>
  ev.kind === 'OFFER_SKIPPED' ? `SKIPPED · ${ev.code}` : ev.kind === 'ACCEPT_REJECTED' ? `REJECTED · ${ev.code}` : ev.kind === 'CANCELLED' ? `CANCELLED · ${ev.code}` : ev.kind

/** Call a database function; tell the person what happened in one sentence, or why it did not go through. */
export function useRun(book: Book): Run {
  const toast = useToast()
  const act = book.act
  return useCallback(async <T,>(fn: string, args: Record<string, unknown>, ok?: (r: T) => string | null) => {
    try {
      const r = await act<T>(fn, args)
      const msg = ok?.(r)
      if (msg) toast(msg)
      return r
    } catch (e) {
      toast(`That did not go through: ${(e as Error).message}`, true)
      return null
    }
  }, [act, toast]) as Run
}

/** Mark a staff member in or out, with the consequence in one sentence. */
export const togglePresence = (run: Run, p: DbStaff) =>
  run<{ ok: boolean; at_risk: number; blocked: number; freed: number; revoked_offers: number }>('set_staff_presence', { p_staff: p.id, p_present: !p.present }, (r) =>
    p.present
      ? `${p.name} is out. ${plural(r.at_risk, 'booked client')} to move${r.blocked ? `, ${plural(r.blocked, 'open gap')} held` : ''}${r.revoked_offers ? `, ${plural(r.revoked_offers, 'offer')} withdrawn` : ''}.`
      : `${p.name} is back in.${r.freed ? ` ${plural(r.freed, 'gap')} open again.` : ''}`)
