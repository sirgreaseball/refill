// The owner's desk: today's book, the gap you picked, who fits it and why, the
// waitlist with consent, and the evidence log. Everything shown is derived from
// the database state; nothing is decided here that the database doesn't re-check.
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { asEntry, asSlot, asStaff, moveUrl, rpc, type DbEntry, type DbEvent, type DbOffer, type DbSlot, type DbStaff, type MoveOption, type State, type useBook } from './api'
import { MovePicker } from './MovePicker'
import { demoDay } from './day'
import { LABEL, candidates, explain, reasonFor, type Reason } from './engine'
import { Icon, Modal, Qr, clock, copy, download, lead, money, span, stamp } from './ui'

const DAY_START = 600
const DAY_END = 1200
const pct = (min: number) => `${((min - DAY_START) / (DAY_END - DAY_START)) * 100}%`

const REASON_TEXT: Record<string, string> = {
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
  STAFF_ABSENT: 'the stylist is out',
}
const MOVE_TEXT: Record<string, string> = {
  TARGET_ABSENT: 'that stylist is out',
  TARGET_BUSY: 'that stylist has something else then',
  TARGET_LACKS_SKILL: 'that stylist does not do this service',
  SAME_STYLIST: 'it is already theirs',
  TARGET_OFF_SHIFT: 'that stylist is not working then',
  TOO_SOON: 'that time starts too soon',
  ALREADY_STARTED: 'the appointment has already started',
  SAME_TIME: 'that is the time it already has',
  NOT_BOOKED: 'nobody is booked there any more',
}

type Book = ReturnType<typeof useBook>
type Run = <T>(fn: string, args: Record<string, unknown>, ok?: (r: T) => string | null) => Promise<T | null>
type Live = 'waiting' | 'taken' | 'no-consent' | 'booked' | 'lost' | 'declined' | 'revoked' | 'expired'

const staffFor = (st: State, s: DbSlot) => st.staff.find((p) => p.id === s.staff_id) ?? null
/** A booked customer whose stylist is out: someone has to move or rebook them. */
const atRisk = (st: State, s: DbSlot) => s.status === 'booked' && s.start_min >= st.workspace.now_min && staffFor(st, s)?.present === false
/** Stylists who could take this slot at its time: in today, working then, nothing else then, and (for a booked customer) able to do the service. */
function movable(st: State, s: DbSlot): DbStaff[] {
  return st.staff.filter((p) => p.present && p.id !== s.staff_id
    && s.start_min >= p.shift_start && s.start_min + s.minutes <= p.shift_end
    && (s.status !== 'booked' || p.skills.includes(s.skill))
    && !st.slots.some((x) => x.staff_id === p.id && x.id !== s.id && x.start_min < s.start_min + s.minutes && x.start_min + x.minutes > s.start_min))
}

/** What an offer means right now, from the customer's side. */
function offerState(o: DbOffer, st: State): Live {
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
const LIVE_TEXT: Record<Live, string> = {
  waiting: 'Waiting for reply', taken: 'Slot taken', 'no-consent': 'Consent withdrawn', booked: 'Booked',
  lost: 'Lost the race, kept place', declined: 'Declined', revoked: 'Revoked', expired: 'Expired, no reply',
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function sentence(ev: DbEvent, st: State): string {
  const e = st.waitlist.find((x) => x.id === ev.entry_id)
  const s = st.slots.find((x) => x.id === ev.slot_id)
  const d = ev.detail as Record<string, number | string | boolean | null>
  const who = e?.name ?? ev.entry_id ?? 'Someone'
  const at = s ? clock(s.start_min) : ''
  const revoked = Number(d.revoked_offers) ? `, ${plural(Number(d.revoked_offers), 'open offer')} revoked` : ''
  switch (ev.kind) {
    case 'DAY_LOADED': return ev.code === 'RESET' ? 'Demo day reset to its start' : `Day loaded: ${d.slots} appointments, ${d.waitlist} on the waitlist`
    case 'CANCELLED': return `${d.customer ?? 'A customer'} cancelled ${at}${d.by === 'customer' ? ' from their own link' : ''}: ${ev.code === 'LATE' ? `late, ${lead(Number(d.notice_min))} notice` : ev.code === 'PAST' ? 'after it started' : `${lead(Number(d.notice_min))} notice`}${d.staff_absent ? '; stylist is out, so the gap is held' : ''}`
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
    case 'STAFF_ABSENT': return `${d.name} is out today: ${plural(Number(d.at_risk), 'booked customer')} to move, ${plural(Number(d.blocked), 'open gap')} held${revoked}`
    case 'STAFF_BACK': return `${d.name} is back in: ${plural(Number(d.freed), 'gap')} open again`
    case 'REASSIGNED': return `${d.was === 'booked' ? `${d.customer}'s ${at} appointment` : `The ${at} gap`} moved from ${d.from} to ${d.to}`
    case 'MOVED': return `${d.customer} moved from ${clock(Number(d.from_min))} with ${d.from} to ${clock(Number(d.to_min))} with ${d.to} (by ${d.by})${d.into_gap ? ', filling an open gap' : ''}${d.opened ? '; their old time is open to fill' : '; their old time is held'}${revoked}`
    case 'MOVE_LINK_SENT': return `${d.customer} sent a link to ${ev.code === 'STAFF_ABSENT' ? 'pick a new time (stylist out)' : 'move or cancel'} ${at}`
    case 'POLICY_CHANGED': return `Owner changed the rules: offers hold ${d.hold_min} min, at most ${d.max_offers} messages a day, late = under ${lead(Number(d.late_cutoff_min))}`
    case 'DESK_LINK_MADE': return 'Owner made a new front-desk link; the old one stopped working'
    default: return ev.kind
  }
}
const chip = (ev: DbEvent) =>
  ev.kind === 'OFFER_SKIPPED' ? `SKIPPED · ${ev.code}` : ev.kind === 'ACCEPT_REJECTED' ? `REJECTED · ${ev.code}` : ev.kind === 'CANCELLED' ? `CANCELLED · ${ev.code}` : ev.kind

export const offerUrl = (id: string) => `${location.origin}${location.pathname}#/o/${id}`

export default function Desk({ book }: { book: Book }) {
  const st = book.state!
  const now = st.workspace.now_min
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<{ slot?: string; entry?: string }>({})
  const [tab, setTab] = useState<'day' | 'waitlist' | 'log'>('day')
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3800)
    return () => clearTimeout(t)
  }, [toast])

  // Open on the first gap that can still be filled, so the first thing you see is the job to do.
  useEffect(() => {
    if (selected) return
    const gap = st.slots.find((s) => s.status === 'free' && s.start_min >= now + st.workspace.min_lead_min)
    if (gap && matchMedia('(min-width: 1100px)').matches) setSelected(gap.id)
  }, [st, now, selected])

  const run: Run = async (fn, args, ok) => {
    try {
      const r = await book.act<never>(fn, args)
      const msg = ok?.(r)
      if (msg) setToast({ text: msg })
      return r
    } catch (e) {
      setToast({ text: `That did not go through: ${(e as Error).message}`, bad: true })
      return null
    }
  }

  const waiting = useMemo(() => st.waitlist.filter((e) => e.status === 'waiting'), [st])
  const offerable = (s: DbSlot) => s.status === 'free' && s.start_min >= now + st.workspace.min_lead_min && staffFor(st, s)?.present !== false
  const staffView = (s: DbSlot) => { const p = staffFor(st, s); return p ? asStaff(p) : null }

  const fitsHovered = useMemo(() => {
    const e = hover.entry ? st.waitlist.find((x) => x.id === hover.entry) : null
    if (!e) return new Set<string>()
    return new Set(st.slots.filter((s) => offerable(s) && !reasonFor(asEntry(e), asSlot(s), staffView(s))).map((s) => s.id))
  }, [hover.entry, st]) // eslint-disable-line react-hooks/exhaustive-deps

  const focusSlot = st.slots.find((s) => s.id === (hover.slot ?? selected))
  const eligibleForFocus = useMemo(() => {
    if (!focusSlot || !offerable(focusSlot)) return new Set<string>()
    return new Set(candidates(asSlot(focusSlot), waiting.map(asEntry), staffView(focusSlot)).eligible.map((e) => e.id))
  }, [focusSlot, waiting]) // eslint-disable-line react-hooks/exhaustive-deps

  const recovered = st.slots.filter((s) => s.status === 'booked' && s.refilled).reduce((a, s) => a + (s.price_inr ?? 0), 0)
  const atRiskMoney = st.slots.filter((s) => s.status === 'free' && s.start_min >= now).reduce((a, s) => a + (s.price_inr ?? 0), 0)
  const needsAction = st.slots.filter((s) => atRisk(st, s) || (s.status === 'blocked' && s.start_min + s.minutes > now)).length
  const offLimits = waiting.filter((e) => e.consent !== true).length
  const sel = st.slots.find((s) => s.id === selected) ?? null

  return (
    <div className="desk" data-tab={tab}>
      <section className="readout" aria-label="Today in numbers">
        <Metric value={money(recovered)} label="Recovered today" tone={recovered ? 'act' : undefined} />
        <Metric value={money(atRiskMoney)} label="At risk in open gaps" tone={atRiskMoney ? 'beat' : undefined} />
        <Metric value={String(needsAction)} label="Need action (stylist out)" tone={needsAction ? 'risk' : undefined} />
        <Metric value={String(offLimits)} label="Waiting, never messaged (no consent)" />
      </section>

      <div className="desk-grid">
        <div className="desk-main">
          <Board st={st} now={now} selected={selected} hoverFits={fitsHovered} onPick={setSelected}
            onHover={(id) => setHover(id ? { slot: id } : {})} run={run} />
          <div className="desk-lower">
            <Waitlist st={st} highlight={eligibleForFocus} onHover={(id) => setHover(id ? { entry: id } : {})} run={run} />
            <Log st={st} />
          </div>
        </div>
        <Recovery key={sel?.id ?? 'none'} st={st} slot={sel} now={now} run={run} onClose={() => setSelected(null)} onPick={setSelected} waiting={waiting} />
      </div>

      <nav className="tabbar" aria-label="Sections">
        {(['day', 'waitlist', 'log'] as const).map((t) => (
          <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)} aria-pressed={tab === t}>
            <Icon name={t === 'day' ? 'book' : t === 'waitlist' ? 'shield' : 'copy'} />
            {t === 'day' ? 'Day' : t === 'waitlist' ? 'Waitlist' : 'Evidence'}
          </button>
        ))}
        <a href="#/team"><Icon name="share" />Team</a>
        {st.role === 'owner' ? <a href="#/owner"><Icon name="book" />Owner</a> : <a href="#/lab"><Icon name="lab" />Lab</a>}
      </nav>

      <div className={`toast ${toast?.bad ? 'is-bad' : ''}`} role="status" aria-live="polite">{toast?.text}</div>
    </div>
  )
}

function Metric({ value, label, tone }: { value: string; label: string; tone?: 'act' | 'beat' | 'risk' }) {
  return (
    <div className={`metric ${tone ? `is-${tone}` : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------- the day board

function Board({ st, now, selected, hoverFits, onPick, onHover, run }: {
  st: State; now: number; selected: string | null; hoverFits: Set<string>
  onPick: (id: string) => void; onHover: (id: string | null) => void; run: Run
}) {
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60)
  const upcoming = st.slots.filter((s) => s.start_min + s.minutes > now)
  const minLead = st.workspace.min_lead_min
  const kind = (s: DbSlot) =>
    s.status === 'blocked' ? 'blocked'
      : s.status === 'free' ? (s.start_min >= now + minLead ? 'open' : 'lapsed')
        : atRisk(st, s) ? 'risk' : s.refilled ? 'refilled' : 'booked'

  const label = (s: DbSlot) => {
    const who = staffFor(st, s)?.name
    const k = kind(s)
    const state = k === 'open' ? `open gap, ${money(s.price_inr)} at risk` : k === 'lapsed' ? 'open, too late to fill'
      : k === 'blocked' ? `held: ${who} is out` : k === 'risk' ? `${s.customer} needs a new stylist` : k === 'refilled' ? `refilled by ${s.customer}` : `booked by ${s.customer}`
    return `${span(s.start_min, s.minutes)}, ${s.service ?? s.skill}, with ${who}: ${state}`
  }

  const togglePresence = (p: DbStaff) =>
    run<{ ok: boolean; at_risk: number; blocked: number; freed: number; revoked_offers: number }>('set_staff_presence', { p_staff: p.id, p_present: !p.present }, (r) =>
      p.present
        ? `${p.name} is out. ${plural(r.at_risk, 'booked customer')} to move${r.blocked ? `, ${plural(r.blocked, 'open gap')} held` : ''}${r.revoked_offers ? `, ${plural(r.revoked_offers, 'offer')} revoked` : ''}.`
        : `${p.name} is back in.${r.freed ? ` ${plural(r.freed, 'gap')} open again.` : ''}`)

  const blockText = (s: DbSlot) => {
    const k = kind(s)
    if (k === 'open' || k === 'lapsed') return 'Open'
    if (k === 'blocked') return 'Held'
    return s.customer
  }

  return (
    <section className="board" aria-label="Today's book">
      <header className="section-head">
        <h2>Today’s book</h2>
        <p className="quiet">Tap an appointment when a customer cancels. Tap a glowing gap to fill it. Mark a stylist out and the desk shows who needs moving.</p>
      </header>

      <div className="board-wide">
        <div className="axis" aria-hidden="true">
          {hours.map((h) => <span key={h} style={{ left: pct(h) }}>{clock(h)}</span>)}
        </div>
        {st.staff.map((p) => (
          <div className={`lane ${p.present ? '' : 'is-out'}`} key={p.id}>
            <div className="lane-name">
              <span className="lane-who">{p.name}
                <button className={`presence ${p.present ? 'is-in' : 'is-out'}`} onClick={() => togglePresence(p)}
                  aria-label={p.present ? `${p.name} is in. Mark ${p.name} out today` : `${p.name} is out. Mark ${p.name} back in`}>
                  {p.present ? 'In' : 'Out'}
                </button>
              </span>
              <small>{p.skills.join(' · ')}</small>
            </div>
            <div className="lane-track">
              <div className="past-veil" style={{ width: pct(Math.min(Math.max(now, DAY_START), DAY_END)) }} aria-hidden="true" />
              {st.slots.filter((s) => s.staff_id === p.id).map((s) => (
                <button key={s.id}
                  className={`blk is-${kind(s)} ${s.minutes <= 30 ? 'is-short' : ''} ${s.id === selected ? 'is-sel' : ''} ${hoverFits.has(s.id) ? 'is-fit' : ''} ${s.start_min + s.minutes <= now ? 'is-past' : ''}`}
                  style={{ left: pct(s.start_min), width: `calc(${pct(s.start_min + s.minutes)} - ${pct(s.start_min)} - 3px)` } as CSSProperties}
                  onClick={() => onPick(s.id)} onMouseEnter={() => onHover(s.id)} onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(s.id)} onBlur={() => onHover(null)} aria-label={label(s)} title={label(s)} aria-pressed={s.id === selected}>
                  <span className="blk-fill" aria-hidden="true" />
                  <span className="blk-time">{clock(s.start_min)}</span>
                  <span className="blk-text">{blockText(s)}</span>
                </button>
              ))}
              {now >= DAY_START && now <= DAY_END && <div className="now" style={{ left: pct(now) }} aria-hidden="true" />}
            </div>
          </div>
        ))}
      </div>

      <div className="team-strip" aria-label="Who is in today">
        {st.staff.map((p) => (
          <button key={p.id} className={`presence-chip ${p.present ? 'is-in' : 'is-out'}`} onClick={() => togglePresence(p)}>
            {p.name} <span>{p.present ? 'in' : 'out'}</span>
          </button>
        ))}
      </div>

      <ol className="agenda" aria-label="Upcoming appointments">
        {upcoming.map((s) => {
          const k = kind(s)
          return (
            <li key={s.id}>
              <button className={`agenda-row is-${k} ${s.id === selected ? 'is-sel' : ''}`} onClick={() => onPick(s.id)} aria-label={label(s)}>
                <span className="agenda-time">{clock(s.start_min)}</span>
                <span className="agenda-main">
                  <strong>{k === 'open' ? 'Open gap' : k === 'lapsed' ? 'Open, too late' : k === 'blocked' ? 'Held: stylist out' : k === 'risk' ? `${s.customer}: needs a new stylist` : s.customer}</strong>
                  <small>{s.service} · {s.minutes} min · {staffFor(st, s)?.name}</small>
                </span>
                <span className="agenda-side">{k === 'open' ? money(s.price_inr) : k === 'refilled' ? <Icon name="check" /> : null}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------- recovery panel

function Recovery({ st, slot, now, run, onClose, onPick, waiting }: {
  st: State; slot: DbSlot | null; now: number; waiting: DbEntry[]; run: Run
  onClose: () => void; onPick: (id: string) => void
}) {
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<DbOffer | null>(null)
  const [race, setRace] = useState(false)

  if (!slot) {
    const gaps = st.slots.filter((s) => s.status === 'free' && s.start_min >= now + st.workspace.min_lead_min && staffFor(st, s)?.present !== false)
    const urgent = st.slots.filter((s) => atRisk(st, s) || (s.status === 'blocked' && s.start_min + s.minutes > now))
    return (
      <aside className="recovery is-empty" aria-label="Recovery">
        {urgent.length > 0 && (
          <>
            <p className="overline risk-text">Needs action</p>
            <ul className="rows">
              {urgent.map((g) => (
                <li key={g.id}><button className="row-btn" onClick={() => onPick(g.id)}>
                  <span className="mono">{span(g.start_min, g.minutes)}</span>
                  <span>{g.status === 'blocked' ? 'Held gap' : g.customer} · {staffFor(st, g)?.name} is out</span>
                  <span className="risk-text">Move</span>
                </button></li>
              ))}
            </ul>
          </>
        )}
        <p className="overline" style={{ marginTop: urgent.length ? 20 : 0 }}>Open gaps</p>
        {gaps.length === 0 ? (
          <p className="quiet">No open gaps. When a customer cancels, tap their appointment and choose “Customer cancelled”.</p>
        ) : (
          <ul className="rows">
            {gaps.map((g) => (
              <li key={g.id}><button className="row-btn" onClick={() => onPick(g.id)}>
                <span className="mono">{span(g.start_min, g.minutes)}</span>
                <span>{g.service} · {staffFor(st, g)?.name}</span>
                <span className="beat-text">{money(g.price_inr)}</span>
              </button></li>
            ))}
          </ul>
        )}
      </aside>
    )
  }

  const stylist = staffFor(st, slot)
  const who = stylist?.name ?? 'staff'
  const cancel = st.events.find((e) => e.kind === 'CANCELLED' && e.slot_id === slot.id)
  const booking = st.bookings.find((b) => b.slot_id === slot.id && b.status === 'confirmed')
  const offers = st.offers.filter((o) => o.slot_id === slot.id)
  const open = slot.status === 'free'
  const held = slot.status === 'blocked'
  const risk = atRisk(st, slot)
  const tooSoon = open && slot.start_min < now + st.workspace.min_lead_min
  const future = slot.start_min + slot.minutes > now

  // The database's rules (src/engine.ts, v2: the stylist's skills), plus the daily message cap it also enforces.
  const staffRule = stylist ? asStaff(stylist) : null
  const fit = candidates(asSlot(slot), waiting.map(asEntry), staffRule)
  const sentToday = (id: string) => st.offers.filter((o) => o.entry_id === id).length
  const offeredHere = new Map(offers.map((o) => [o.entry_id, offerState(o, st)]))
  const capped = fit.eligible.filter((e) => !offeredHere.has(e.id) && sentToday(e.id) >= st.workspace.max_offers)
  const eligible = fit.eligible.filter((e) => !capped.includes(e))
  const excluded = fit.excluded
  const fresh = eligible.filter((e) => !offeredHere.has(e.id))
  const chosen = picked ?? new Set(fresh.slice(0, 3).map((e) => e.id))
  const liveOffers = offers.filter((o) => offerState(o, st) === 'waiting')
  const lapsed = offers.length > 0 && liveOffers.length === 0 && open
  const targets = movable(st, slot)

  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  const send = async () => {
    setBusy(true)
    await run<{ ok: boolean; code?: string; results?: { outcome: string }[] }>('send_offers', { p_slot: slot.id, p_entries: [...chosen] }, (r) => {
      if (!r.ok) return `Not sent: ${r.code === 'SLOT_TOO_SOON' ? 'the slot starts too soon' : REASON_TEXT[r.code ?? ''] ?? r.code}`
      const sent = r.results!.filter((x) => x.outcome === 'SENT').length
      const skipped = r.results!.length - sent
      return `${plural(sent, 'offer')} sent${skipped ? `, ${skipped} refused by the database rules` : ''}`
    })
    setPicked(new Set())
    setBusy(false)
  }

  const cancelIt = async () => {
    setBusy(true)
    await run<{ ok: boolean; notice: string; notice_min: number; code?: string; blocked?: boolean }>('cancel_slot', { p_slot: slot.id }, (r) =>
      !r.ok ? `Not cancelled: ${r.code}` : r.blocked ? `Cancelled. ${who} is out, so the gap is held until you move it to someone who is in.`
        : r.notice === 'LATE' ? `Late cancellation, ${lead(r.notice_min)} notice. The gap is open.` : r.notice === 'PAST' ? 'Recorded after the start: too late to refill.' : `Cancelled with ${lead(r.notice_min)} notice. The gap is open.`)
    setBusy(false)
  }

  const undo = async () => {
    setBusy(true)
    await run<{ ok: boolean; revoked_offers: number; code?: string }>('restore_slot', { p_slot: slot.id }, (r) =>
      r.ok ? `Undone: ${slot.cancelled_customer} is back${r.revoked_offers ? `, ${plural(r.revoked_offers, 'open offer')} revoked` : ''}.` : `Nothing to undo: ${r.code}`)
    setBusy(false)
  }

  const move = async (to: DbStaff) => {
    setBusy(true)
    await run<{ ok: boolean; code?: string }>('reassign_slot', { p_slot: slot.id, p_to: to.id }, (r) =>
      r.ok ? (held ? `The gap is now ${to.name}'s, and open to fill.` : `${slot.customer} is now with ${to.name} at ${clock(slot.start_min)}.`) : `Not moved: ${MOVE_TEXT[r.code ?? ''] ?? r.code}`)
    setBusy(false)
  }

  return (
    <aside className="recovery is-open" aria-label="Recovery">
      <div className="rec-head">
        <p className="overline">
          {risk ? <span className="risk-text">Needs action</span> : held ? <span className="risk-text">Held gap</span> : open ? (tooSoon ? 'Open · too late to offer' : 'Open gap') : slot.refilled ? 'Refilled' : 'Booked'} · {slot.id}
          {cancel?.code === 'LATE' && open && <span className="tag is-beat">Late cancellation</span>}
        </p>
        <button className="icon-btn rec-close" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      <h2 className="rec-time">{span(slot.start_min, slot.minutes)}</h2>
      <p className="rec-sub">
        {slot.minutes} min · with {who}{stylist ? ` (${stylist.skills.join(', ')})` : ''}
        {open ? <> · <span className="beat-text">{money(slot.price_inr)} at risk</span></> : held ? <> · {who} is out</> : <> · {slot.service} · {slot.customer}</>}
      </p>

      {held && future && (
        <div className="rec-block">
          <p>{risk ? `${who} is out today. ${slot.customer}'s ${slot.service} needs another stylist who does ${slot.skill}.` : `${who} is out, so this gap cannot be offered with them. Give the time to someone who is in, then fill it.`}</p>
          {targets.length ? (
            <div className="move-list">
              {targets.map((t) => (
                <button key={t.id} className="btn" onClick={() => move(t)} disabled={busy}>Move to {t.name} <small className="quiet">{t.skills.join(' · ')}</small></button>
              ))}
            </div>
          ) : (
            <p className="quiet">{risk ? `Nobody who does ${slot.skill} is working and free at ${clock(slot.start_min)}. Move ${slot.customer} to another time below, or send them a link to choose.` : 'Nobody else is working and free at this time.'}</p>
          )}
        </div>
      )}

      {slot.status === 'booked' && (
        <div className="rec-block">
          {slot.refilled && booking && (
            <p className="done-line"><Icon name="check" /> Refilled from the waitlist · booking #{booking.id} · {money(slot.price_inr)} recovered</p>
          )}
          {future ? <button className="btn" onClick={cancelIt} disabled={busy}>Customer cancelled</button> : <p className="quiet">This appointment is in the past.</p>}
        </div>
      )}
      {slot.status === 'booked' && slot.start_min >= now && <MovePanel key={slot.id} st={st} slot={slot} run={run} risk={risk} />}

      {(open || held) && slot.cancelled_customer && !booking && (
        <div className="rec-block">
          <button className="btn is-quiet undo" onClick={undo} disabled={busy}><Icon name="reset" /> Undo cancellation ({slot.cancelled_customer})</button>
        </div>
      )}

      {open && tooSoon && <p className="quiet rec-block">It starts in {lead(slot.start_min - now)}. Nobody can get here in time, so no offers go out.</p>}

      {open && !tooSoon && (
        <>
          <div className="rec-block">
            <h3 className="list-head">Fits this gap <span className="count">{eligible.length}</span></h3>
            {eligible.length === 0 && <p className="quiet">Nobody on the waitlist fits. The reasons are below.</p>}
            {lapsed && <p className="beat-text small">{fresh.length ? 'No reply in time. The next people in the queue are ticked.' : 'Nobody replied in time. You can offer it again to anyone who did not answer.'}</p>}
            <ul className="rows">
              {eligible.map((e) => {
                const row = waiting.find((w) => w.id === e.id)!
                const offered = offeredHere.get(e.id)
                const locked = !!offered && offered !== 'expired' // no reply yet, or a final answer: not offered twice
                return (
                  <li key={e.id}>
                    <label className={`pick ${locked ? 'is-offered' : ''}`}>
                      <input type="checkbox" checked={locked ? offered === 'waiting' : chosen.has(e.id)} disabled={locked} onChange={() => toggle(e.id)} />
                      <span className="pick-main">
                        <strong>{e.name}</strong>
                        <small>{e.service} · {e.minutes} min · said yes to messages ({row.consent_source ?? 'recorded'})</small>
                      </span>
                      <span className="pick-side mono">{offered ? (offered === 'waiting' ? 'offered' : offered) : `#${row.pos}`}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <button className="btn is-primary" onClick={send} disabled={busy || chosen.size === 0}>
              {chosen.size ? `Send ${plural(chosen.size, 'offer')}` : 'Pick someone to offer'}
            </button>
            <p className="quiet small">Each offer holds for {st.workspace.hold_min} minutes. Nobody is messaged more than {st.workspace.max_offers} times a day.</p>
          </div>

          <div className="rec-block">
            <h3 className="list-head">Not offered, and why <span className="count">{excluded.length + capped.length}</span></h3>
            <ul className="rows">
              {capped.map((entry) => (
                <li key={entry.id} className="skip">
                  <span className="skip-name">{entry.name}</span>
                  <span className="code" title="FREQUENCY_CAP">{LABEL.FREQUENCY_CAP}</span>
                  <span className="skip-why">Already messaged {sentToday(entry.id)} times today <span className="faint mono">FREQUENCY_CAP</span></span>
                </li>
              ))}
              {excluded.map(({ entry, reason }) => (
                <li key={entry.id} className="skip">
                  <span className="skip-name">{entry.name}</span>
                  <span className="code" title={reason}>{LABEL[reason]}</span>
                  <span className="skip-why">{explain(reason as Reason, entry, asSlot(slot), staffRule)} <span className="faint mono">{reason}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {offers.length > 0 && (
        <div className="rec-block">
          <h3 className="list-head">Offers for this slot <span className="count">{offers.length}</span></h3>
          <ul className="rows">
            {offers.map((o) => {
              const s = offerState(o, st)
              const e = st.waitlist.find((x) => x.id === o.entry_id)
              const b = st.bookings.find((x) => x.offer_id === o.id && x.status === 'confirmed')
              return (
                <li key={o.id} className={`offer is-${s}`}>
                  <span className="offer-name">{e?.name}</span>
                  <span className="offer-state">{LIVE_TEXT[s]}{b ? ` #${b.id}` : ''}{s === 'waiting' && o.expires_min != null ? ` · reply by ${clock(o.expires_min)}` : ''}</span>
                  {s === 'waiting' && (
                    <span className="offer-acts">
                      <button className="icon-btn" onClick={() => setQr(o)} aria-label={`Show ${e?.name}'s offer as a QR code`}><Icon name="phone" /></button>
                      <button className="icon-btn" onClick={() => copy(offerUrl(o.id))} aria-label={`Copy ${e?.name}'s offer link`}><Icon name="copy" /></button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {liveOffers.length >= 2 && (
            <button className="btn" onClick={() => setRace(true)}><Icon name="bolt" /> Two phones, one slot</button>
          )}
        </div>
      )}

      {qr && (
        <Modal title={`${st.waitlist.find((x) => x.id === qr.entry_id)?.name}'s offer`} onClose={() => setQr(null)}>
          <div className="qr-one">
            <Qr text={offerUrl(qr.id)} size={208} />
            <p className="quiet">Scan with a phone to see the message this customer gets.</p>
          </div>
        </Modal>
      )}
      {race && <RaceModal st={st} offers={liveOffers} onClose={() => setRace(false)} />}
    </aside>
  )
}

function RaceModal({ st, offers, onClose }: { st: State; offers: DbOffer[]; onClose: () => void }) {
  const [pair] = useState(offers.slice(0, 2))
  const [result, setResult] = useState<{ name: string; outcome: string; booking?: number; lost_to?: number }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const name = (o: DbOffer) => st.waitlist.find((x) => x.id === o.entry_id)?.name ?? o.entry_id

  const tapBoth = async () => {
    setBusy(true)
    const out = await Promise.all(pair.map((o) => rpc<{ outcome: string; booking?: number; lost_to?: number }>('accept_offer', { p_offer: o.id }).catch((e) => ({ outcome: `ERROR ${e.message}` }))))
    setResult(out.map((r, i) => ({ name: name(pair[i]), ...r })))
    setBusy(false)
  }

  return (
    <Modal title="Two phones, one slot" onClose={onClose}>
      <p className="quiet">Scan one code on each phone and tap Book on both at the same moment. Or fire both taps from here at once.</p>
      <div className="qr-pair">
        {pair.map((o) => (
          <figure key={o.id}>
            <Qr text={offerUrl(o.id)} size={150} />
            <figcaption>{name(o)}</figcaption>
          </figure>
        ))}
      </div>
      <button className="btn is-primary" onClick={tapBoth} disabled={busy || !!result}><Icon name="bolt" /> Tap both at once</button>
      {result && (
        <ul className="rows race-out" aria-live="polite">
          {result.map((r) => (
            <li key={r.name}>
              <strong>{r.name}</strong>
              <span className={`code ${r.outcome === 'CONFIRMED' ? 'is-act' : ''}`}>{r.outcome}</span>
              <span className="quiet">{r.outcome === 'CONFIRMED' ? `booking #${r.booking}` : r.outcome === 'WAITLISTED' ? `lost to #${r.lost_to}, keeps place` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------- waitlist

function Waitlist({ st, highlight, onHover, run }: {
  st: State; highlight: Set<string>; onHover: (id: string | null) => void; run: Run
}) {
  const [adding, setAdding] = useState(false)
  const entries = st.waitlist.filter((e) => e.status !== 'removed')
  const waitingCount = entries.filter((e) => e.status === 'waiting').length

  const setConsent = (e: DbEntry, v: boolean | null) =>
    run<{ ok: boolean; revoked_offers: number }>('set_consent', { p_entry: e.id, p_consent: v, p_source: 'front desk' }, (r) =>
      v === true ? `${e.name} said yes to messages.` : `${e.name} will not be messaged${r.revoked_offers ? `; ${plural(r.revoked_offers, 'open offer')} revoked` : ''}.`)

  return (
    <section className="waitlist" aria-label="Waitlist">
      <header className="section-head">
        <h2>Waitlist <span className="count">{waitingCount} waiting</span></h2>
        <button className="btn is-quiet" onClick={() => setAdding((a) => !a)} aria-expanded={adding}><Icon name="plus" /> Add</button>
      </header>
      {adding && <AddEntry run={run} onDone={() => setAdding(false)} />}
      <ol className="rows wl">
        {entries.map((e) => (
          <li key={e.id} className={`wl-row ${highlight.has(e.id) ? 'is-fit' : ''} ${e.status === 'booked' ? 'is-booked' : ''}`}
            onMouseEnter={() => onHover(e.id)} onMouseLeave={() => onHover(null)}>
            <span className="wl-pos mono">{e.pos}</span>
            <span className="wl-main">
              <strong>{e.name}{e.source === 'self sign-up' && <span className="tag">signed up</span>}</strong>
              <small>{e.service} · {e.minutes} min · {e.skill}{e.free_from != null || e.free_until != null ? ` · free ${clock(e.free_from ?? 600)}–${clock(Math.min(e.free_until ?? 1200, 1439))}` : ''}</small>
            </span>
            {e.status === 'booked' ? (
              <span className="tag is-act">Booked</span>
            ) : (
              <span className="consent" role="group" aria-label={`${e.name}: may we message them?`}>
                {([[true, 'Yes'], [false, 'No'], [null, '?']] as const).map(([v, t]) => (
                  <button key={t} className={e.consent === v ? 'is-on' : ''} aria-pressed={e.consent === v}
                    onClick={() => e.consent !== v && setConsent(e, v)} title={v === null ? 'Not asked yet' : v ? 'Said yes to messages' : 'Said no to messages'}>{t}</button>
                ))}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function AddEntry({ run, onDone }: { run: Run; onDone: () => void }) {
  const services = useMemo(() => demoDay().services, [])
  const [name, setName] = useState('')
  const [service, setService] = useState(services[0]?.id ?? '')
  const [consent, setConsent] = useState<'yes' | 'no' | 'unknown'>('unknown')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const sv = services.find((s) => s.id === service)
    if (!name.trim()) return setErr('Write the customer’s name.')
    if (!sv) return setErr('Pick a service.')
    const toM = (t: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null)
    const f = toM(from)
    const u = toM(until)
    if (f != null && u != null && u - f < sv.minutes) return setErr(`That window is shorter than a ${sv.minutes}-minute ${sv.name}.`)
    setErr(null)
    const r = await run<{ ok: boolean; code?: string }>('add_entry', {
      p_entry: { name: name.trim(), minutes: sv.minutes, skill: sv.skill, service: sv.name, price_inr: sv.price_inr,
        consent: consent === 'yes' ? true : consent === 'no' ? false : null, free_from: f, free_until: u },
    }, (x) => (x.ok ? `${name.trim()} added to the waitlist.` : null))
    if (r && !r.ok) setErr(`The database refused it: ${r.code}`)
    else if (r) onDone()
  }

  return (
    <form className="add" onSubmit={submit} noValidate>
      <label>Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={60} /></label>
      <label>Service
        <select value={service} onChange={(e) => setService(e.target.value)}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.minutes} min · {money(s.price_inr)}</option>)}
        </select>
      </label>
      <fieldset className="seg"><legend>May we message them when a slot opens?</legend>
        {(['yes', 'no', 'unknown'] as const).map((c) => (
          <label key={c} className={consent === c ? 'is-on' : ''}><input type="radio" name="consent" checked={consent === c} onChange={() => setConsent(c)} />{c === 'unknown' ? 'Not asked' : c === 'yes' ? 'Yes' : 'No'}</label>
        ))}
      </fieldset>
      <div className="add-times">
        <label>Free from<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Until<input type="time" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn is-primary" type="submit">Add to waitlist</button>
    </form>
  )
}

// ---------------------------------------------------------------- evidence log

const FILTERS: [string, (e: DbEvent) => boolean][] = [
  ['All', () => true],
  ['Offers', (e) => e.kind.startsWith('OFFER')],
  ['Bookings', (e) => ['BOOKED', 'WAITLIST_RETAINED', 'ACCEPT_REPEATED', 'ACCEPT_REJECTED', 'CANCELLED', 'CANCEL_UNDONE', 'MOVED', 'MOVE_LINK_SENT'].includes(e.kind)],
  ['Team', (e) => e.kind.startsWith('STAFF') || ['REASSIGNED', 'POLICY_CHANGED', 'DESK_LINK_MADE'].includes(e.kind)],
  ['Consent', (e) => e.kind.startsWith('CONSENT') || e.code === 'NO_CONSENT' || e.kind.startsWith('WAITLIST_')],
]

function Log({ st }: { st: State }) {
  const [f, setF] = useState(0)
  const [all, setAll] = useState(false)
  const rows = st.events.filter(FILTERS[f][1])
  const shown = all ? rows : rows.slice(0, 40)

  const exportJson = () => download(`refill-evidence-${st.workspace.id.slice(0, 8)}.json`,
    JSON.stringify({ exported_at: new Date().toISOString(), synthetic: true, ...st, events: [...st.events].reverse() }, null, 2))
  const exportCsv = () => {
    // A cell starting with = + - @ would run as a formula in Excel or Sheets; prefix it so it stays text.
    const q = (v: unknown) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""')}"`
    const lines = [['id', 'at', 'kind', 'code', 'slot', 'entry', 'booking', 'sentence'].join(',')]
    for (const e of [...st.events].reverse()) lines.push([e.id, e.at, e.kind, e.code, e.slot_id, e.entry_id, e.booking_id, sentence(e, st)].map(q).join(','))
    download(`refill-evidence-${st.workspace.id.slice(0, 8)}.csv`, lines.join('\n'), 'text/csv')
  }

  return (
    <section className="log" aria-label="Evidence log">
      <header className="section-head">
        <h2>Evidence</h2>
        <span className="head-acts">
          <button className="btn is-quiet" onClick={exportJson}><Icon name="download" /> JSON</button>
          <button className="btn is-quiet" onClick={exportCsv}><Icon name="download" /> CSV</button>
        </span>
      </header>
      <div className="chips" role="group" aria-label="Filter the log">
        {FILTERS.map(([label], i) => (
          <button key={label} className={i === f ? 'is-on' : ''} aria-pressed={i === f} onClick={() => setF(i)}>{label}</button>
        ))}
      </div>
      <ol className="rows ev">
        {shown.map((e) => (
          <li key={e.id}>
            <span className="ev-at mono">{stamp(e.at)}</span>
            <span className={`code ${e.kind === 'BOOKED' ? 'is-act' : e.kind === 'CANCELLED' ? 'is-beat' : e.kind === 'STAFF_ABSENT' ? 'is-risk' : ''}`}>{chip(e)}</span>
            <span className="ev-text">{sentence(e, st)}</span>
          </li>
        ))}
      </ol>
      {rows.length > 40 && !all && <button className="btn is-quiet" onClick={() => setAll(true)}>Show all {rows.length}</button>}
    </section>
  )
}

/** Move a booked appointment: the desk picks with the customer on the phone, or sends them a link to choose. */
function MovePanel({ st, slot, run, risk }: { st: State; slot: DbSlot; run: Run; risk: boolean }) {
  const [opts, setOpts] = useState<MoveOption[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const open = st.moves.find((m) => m.slot_id === slot.id && m.status === 'open')
  const first = (slot.customer ?? 'the customer').split(' ')[0]
  const stylist = staffFor(st, slot)

  const load = async () => setOpts((await run<MoveOption[]>('get_move_options', { p_slot: slot.id })) ?? [])
  const pick = async (o: MoveOption) => {
    setBusy(true)
    await run<{ ok: boolean; code?: string; opened?: boolean }>('move_booking', { p_slot: slot.id, p_staff: o.staff, p_start: o.start_min }, (r) =>
      r.ok ? `${slot.customer} moved to ${clock(o.start_min)} with ${o.name}. ${r.opened ? `Their ${clock(slot.start_min)} is open to fill.` : `Their ${clock(slot.start_min)} is held: ${stylist?.name} is out.`}`
        : `Not moved: ${MOVE_TEXT[r.code ?? ''] ?? r.code}`)
    setBusy(false)
    setOpts(null)
  }
  const sendLink = async () => {
    setBusy(true)
    const r = await run<{ ok: boolean; move?: string; code?: string }>('move_link', { p_slot: slot.id })
    if (r?.ok && r.move) setLink(moveUrl(r.move))
    setBusy(false)
  }
  const message = risk
    ? `Hi ${first}, ${stylist?.name} can't come in today, so your ${clock(slot.start_min)} ${slot.service} needs a new time. Pick one that suits you here:`
    : `Hi ${first}, need to change your ${clock(slot.start_min)} ${slot.service}? Pick a new time or cancel here:`

  return (
    <div className="rec-block">
      <h3 className="list-head">{risk ? `Rebook ${first}` : 'Reschedule'}</h3>
      {risk && <p>{stylist?.name} is out today. {first}'s {slot.service} needs someone who does {slot.skill}, or a new time. Nothing moves until you or {first} choose.</p>}
      {open && <p className="beat-text small">Link sent to {first}. Waiting for their choice. <button className="link" onClick={() => setLink(moveUrl(open.id))}>Show link</button></p>}
      {opts === null ? (
        <div className="card-acts">
          <button className="btn" onClick={load} disabled={busy}><Icon name="book" /> Pick a new time</button>
          {!open && <button className="btn is-quiet" onClick={sendLink} disabled={busy}><Icon name="share" /> Let {first} choose</button>}
        </div>
      ) : (
        <MovePicker options={opts} busy={busy} confirm={(o) => `Move ${first} to ${clock(o.start_min)} with ${o.name}`} onPick={pick} onCancel={() => setOpts(null)} />
      )}
      {link && (
        <Modal title={`${first}'s link`} onClose={() => setLink(null)}>
          <div className="qr-one">
            <Qr text={link} size={196} />
            <p className="bubble small">{message} {link}</p>
            <div className="card-acts">
              <button className="btn" onClick={() => copy(`${message} ${link}`)}><Icon name="copy" /> Copy message</button>
              <a className="btn is-quiet" href={link.slice(link.indexOf('#'))}>Open as {first}</a>
            </div>
            <p className="quiet small">Synthetic demo: nothing is sent. {first} sees only times that truly work.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
