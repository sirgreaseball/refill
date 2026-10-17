// The owner's desk: today's book, the gap you picked, who fits it and why, the
// waitlist with consent, and the evidence log. Everything shown is derived from
// the database state; nothing is decided here that the database doesn't re-check.
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { asEntry, asSlot, rpc, type DbEntry, type DbEvent, type DbOffer, type DbSlot, type State, type useBook } from './api'
import { demoDay } from './day'
import { candidates, explain, reasonFor, type Reason } from './engine'
import { Icon, Modal, Qr, clock, copy, download, lead, money, span, stamp } from './ui'

const DAY_START = 600
const DAY_END = 1200
const pct = (min: number) => `${((min - DAY_START) / (DAY_END - DAY_START)) * 100}%`

const REASON_TEXT: Record<string, string> = {
  NO_CONSENT: 'no contact consent',
  SKILL_MISMATCH: 'wrong skill for this slot',
  DURATION_TOO_LONG: 'service longer than the slot',
  NOT_AVAILABLE: 'not free at that time',
  NOT_WAITING: 'already booked',
  ALREADY_BOOKED: 'already booked elsewhere',
  SLOT_UNAVAILABLE: 'slot no longer available',
  UNKNOWN_ENTRY: 'not on the waitlist',
}

type Book = ReturnType<typeof useBook>
type Live = 'waiting' | 'taken' | 'no-consent' | 'booked' | 'lost' | 'declined' | 'revoked'

/** What an offer means right now, from the customer's side. */
function offerState(o: DbOffer, st: State): Live {
  if (o.status === 'accepted') return 'booked'
  if (o.status === 'waitlisted') return 'lost'
  if (o.status === 'declined') return 'declined'
  if (o.status === 'revoked') return 'revoked'
  const e = st.waitlist.find((x) => x.id === o.entry_id)
  const s = st.slots.find((x) => x.id === o.slot_id)
  if (e?.consent !== true) return 'no-consent'
  if (s?.status !== 'free' || e.status !== 'waiting') return 'taken'
  return 'waiting'
}
const LIVE_TEXT: Record<Live, string> = {
  waiting: 'Waiting for reply', taken: 'Slot taken', 'no-consent': 'Consent withdrawn', booked: 'Booked',
  lost: 'Lost the race, kept place', declined: 'Declined', revoked: 'Revoked',
}

function sentence(ev: DbEvent, st: State): string {
  const e = st.waitlist.find((x) => x.id === ev.entry_id)
  const s = st.slots.find((x) => x.id === ev.slot_id)
  const d = ev.detail as Record<string, number | string | null>
  const who = e?.name ?? ev.entry_id ?? 'Someone'
  const at = s ? clock(s.start_min) : ''
  switch (ev.kind) {
    case 'DAY_LOADED': return ev.code === 'RESET' ? 'Demo day reset to its start' : `Day loaded: ${d.slots} appointments, ${d.waitlist} on the waitlist`
    case 'CANCELLED': return `${d.customer ?? 'A customer'} cancelled ${at}: ${ev.code === 'LATE' ? `late, ${lead(Number(d.notice_min))} notice` : ev.code === 'PAST' ? 'after it started' : `${lead(Number(d.notice_min))} notice`}`
    case 'OFFER_SENT': return `Offer sent to ${who} for ${at}`
    case 'OFFER_SKIPPED': return `${who} not offered ${at}: ${REASON_TEXT[ev.code ?? ''] ?? ev.code}`
    case 'BOOKED': return `${who} booked ${at}, booking #${ev.booking_id}, ${money(Number(d.price_inr))} recovered`
    case 'WAITLIST_RETAINED': return `${who} tapped a moment late: lost to #${d.lost_to}, keeps queue place ${d.place}`
    case 'ACCEPT_REPEATED': return `${who} tapped Accept again: still one booking (#${ev.booking_id})`
    case 'ACCEPT_REJECTED': return `${who} could not book ${at}: ${REASON_TEXT[ev.code ?? ''] ?? ev.code}`
    case 'OFFER_DECLINED': return `${who} declined ${at}`
    case 'CONSENT_GIVEN': return `${who} said yes to messages (${d.source})`
    case 'CONSENT_WITHDRAWN': return `${who} withdrew consent (${d.source})${Number(d.revoked_offers) ? `, ${d.revoked_offers} open offer${Number(d.revoked_offers) > 1 ? 's' : ''} revoked` : ''}`
    case 'CONSENT_UNKNOWN': return `${who}: consent unknown, never messaged until they say yes`
    case 'WAITLIST_ADDED': return `${who} joined the waitlist`
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
    const t = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(t)
  }, [toast])

  // Open on the first gap that can still be filled, so the first thing you see is the job to do.
  useEffect(() => {
    if (selected) return
    const gap = st.slots.find((s) => s.status === 'free' && s.start_min >= now + st.workspace.min_lead_min)
    if (gap && matchMedia('(min-width: 1100px)').matches) setSelected(gap.id)
  }, [st, now, selected])

  const run = async <T,>(fn: string, args: Record<string, unknown>, ok?: (r: T) => string | null) => {
    try {
      const r = await book.act<T>(fn, args)
      const msg = ok?.(r)
      if (msg) setToast({ text: msg })
      return r
    } catch (e) {
      setToast({ text: `That did not go through: ${(e as Error).message}`, bad: true })
      return null
    }
  }

  const waiting = useMemo(() => st.waitlist.filter((e) => e.status === 'waiting'), [st])
  const offerable = (s: DbSlot) => s.status === 'free' && s.start_min >= now + st.workspace.min_lead_min

  const fitsHovered = useMemo(() => {
    const e = hover.entry ? st.waitlist.find((x) => x.id === hover.entry) : null
    if (!e) return new Set<string>()
    return new Set(st.slots.filter((s) => offerable(s) && !reasonFor(asEntry(e), asSlot(s))).map((s) => s.id))
  }, [hover.entry, st])

  const focusSlot = st.slots.find((s) => s.id === (hover.slot ?? selected))
  const eligibleForFocus = useMemo(() => {
    if (!focusSlot || !offerable(focusSlot)) return new Set<string>()
    return new Set(candidates(asSlot(focusSlot), waiting.map(asEntry)).eligible.map((e) => e.id))
  }, [focusSlot, waiting])

  const recovered = st.slots.filter((s) => s.status === 'booked' && s.refilled).reduce((a, s) => a + (s.price_inr ?? 0), 0)
  const atRisk = st.slots.filter((s) => s.status === 'free' && s.start_min >= now).reduce((a, s) => a + (s.price_inr ?? 0), 0)
  const live = st.offers.filter((o) => offerState(o, st) === 'waiting').length
  const offLimits = waiting.filter((e) => e.consent !== true).length
  const sel = st.slots.find((s) => s.id === selected) ?? null

  return (
    <div className="desk" data-tab={tab}>
      <section className="readout" aria-label="Today in numbers">
        <Metric value={money(recovered)} label="Recovered today" tone={recovered ? 'act' : undefined} />
        <Metric value={money(atRisk)} label="At risk in open gaps" tone={atRisk ? 'beat' : undefined} />
        <Metric value={String(live)} label="Offers waiting for a reply" />
        <Metric value={String(offLimits)} label="On the waitlist, never messaged (no consent)" />
      </section>

      <div className="desk-grid">
        <div className="desk-main">
          <Board st={st} now={now} selected={selected} hoverFits={fitsHovered} onPick={setSelected} onHover={(id) => setHover(id ? { slot: id } : {})} />
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
        <a href="#/lab"><Icon name="lab" />Lab</a>
      </nav>

      <div className={`toast ${toast?.bad ? 'is-bad' : ''}`} role="status" aria-live="polite">{toast?.text}</div>
    </div>
  )
}

function Metric({ value, label, tone }: { value: string; label: string; tone?: 'act' | 'beat' }) {
  return (
    <div className={`metric ${tone ? `is-${tone}` : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------- the day board

function Board({ st, now, selected, hoverFits, onPick, onHover }: {
  st: State; now: number; selected: string | null; hoverFits: Set<string>
  onPick: (id: string) => void; onHover: (id: string | null) => void
}) {
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60)
  const upcoming = st.slots.filter((s) => s.start_min + s.minutes > now)
  const minLead = st.workspace.min_lead_min
  const kind = (s: DbSlot) =>
    s.status === 'free' ? (s.start_min >= now + minLead ? 'open' : 'lapsed') : s.status === 'blocked' ? 'blocked' : s.refilled ? 'refilled' : 'booked'

  const label = (s: DbSlot) => {
    const who = st.staff.find((x) => x.id === s.staff_id)?.name
    const k = kind(s)
    const state = k === 'open' ? `open gap, ${money(s.price_inr)} at risk` : k === 'lapsed' ? 'open, too late to fill' : k === 'refilled' ? `refilled by ${s.customer}` : `booked by ${s.customer}`
    return `${span(s.start_min, s.minutes)}, ${s.service ?? s.skill}, with ${who}: ${state}`
  }

  return (
    <section className="board" aria-label="Today's book">
      <header className="section-head">
        <h2>Today’s book</h2>
        <p className="quiet">Tap an appointment when a customer cancels. Tap a glowing gap to fill it.</p>
      </header>

      <div className="board-wide">
        <div className="axis" aria-hidden="true">
          {hours.map((h) => <span key={h} style={{ left: pct(h) }}>{clock(h)}</span>)}
        </div>
        {st.staff.map((p) => (
          <div className="lane" key={p.id}>
            <div className="lane-name">{p.name}<small>{p.skills.join(' · ')}</small></div>
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
                  <span className="blk-text">{kind(s) === 'open' || kind(s) === 'lapsed' ? 'Open' : s.customer}</span>
                </button>
              ))}
              {now >= DAY_START && now <= DAY_END && <div className="now" style={{ left: pct(now) }} aria-hidden="true" />}
            </div>
          </div>
        ))}
      </div>

      <ol className="agenda" aria-label="Upcoming appointments">
        {upcoming.map((s) => (
          <li key={s.id}>
            <button className={`agenda-row is-${kind(s)} ${s.id === selected ? 'is-sel' : ''}`} onClick={() => onPick(s.id)} aria-label={label(s)}>
              <span className="agenda-time">{clock(s.start_min)}</span>
              <span className="agenda-main">
                <strong>{kind(s) === 'open' ? 'Open gap' : kind(s) === 'lapsed' ? 'Open, too late' : s.customer}</strong>
                <small>{s.service} · {s.minutes} min · {st.staff.find((x) => x.id === s.staff_id)?.name}</small>
              </span>
              <span className="agenda-side">{kind(s) === 'open' ? money(s.price_inr) : kind(s) === 'refilled' ? <Icon name="check" /> : null}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------- recovery panel

function Recovery({ st, slot, now, run, onClose, onPick, waiting }: {
  st: State; slot: DbSlot | null; now: number; waiting: DbEntry[]
  run: <T>(fn: string, args: Record<string, unknown>, ok?: (r: T) => string | null) => Promise<T | null>
  onClose: () => void; onPick: (id: string) => void
}) {
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<DbOffer | null>(null)
  const [race, setRace] = useState(false)

  if (!slot) {
    const gaps = st.slots.filter((s) => s.status === 'free' && s.start_min >= now + st.workspace.min_lead_min)
    return (
      <aside className="recovery is-empty" aria-label="Recovery">
        <p className="overline">Open gaps</p>
        {gaps.length === 0 ? (
          <p className="quiet">No open gaps. When a customer cancels, tap their appointment and choose “Customer cancelled”.</p>
        ) : (
          <ul className="rows">
            {gaps.map((g) => (
              <li key={g.id}><button className="row-btn" onClick={() => onPick(g.id)}>
                <span className="mono">{span(g.start_min, g.minutes)}</span>
                <span>{g.service} · {st.staff.find((x) => x.id === g.staff_id)?.name}</span>
                <span className="beat-text">{money(g.price_inr)}</span>
              </button></li>
            ))}
          </ul>
        )}
      </aside>
    )
  }

  const who = st.staff.find((x) => x.id === slot.staff_id)?.name ?? 'staff'
  const cancel = st.events.find((e) => e.kind === 'CANCELLED' && e.slot_id === slot.id)
  const booking = st.bookings.find((b) => b.slot_id === slot.id && b.status === 'confirmed')
  const offers = st.offers.filter((o) => o.slot_id === slot.id)
  const open = slot.status === 'free'
  const tooSoon = open && slot.start_min < now + st.workspace.min_lead_min

  const { eligible, excluded } = candidates(asSlot(slot), waiting.map(asEntry))
  const alreadyOffered = new Set(offers.filter((o) => o.status === 'sent').map((o) => o.entry_id))
  const fresh = eligible.filter((e) => !alreadyOffered.has(e.id))
  const chosen = picked ?? new Set(fresh.slice(0, 3).map((e) => e.id))
  const liveOffers = offers.filter((o) => offerState(o, st) === 'waiting')

  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  const send = async () => {
    setBusy(true)
    await run<{ ok: boolean; code?: string; results?: { outcome: string }[] }>('send_offers', { p_slot: slot.id, p_entries: [...chosen] }, (r) => {
      if (!r.ok) return `Not sent: ${r.code === 'SLOT_TOO_SOON' ? 'the slot starts too soon' : r.code}`
      const sent = r.results!.filter((x) => x.outcome === 'SENT').length
      const skipped = r.results!.length - sent
      return `${sent} offer${sent === 1 ? '' : 's'} sent${skipped ? `, ${skipped} refused by the database rules` : ''}`
    })
    setPicked(new Set())
    setBusy(false)
  }

  const cancelIt = async () => {
    setBusy(true)
    await run<{ ok: boolean; notice: string; notice_min: number; code?: string }>('cancel_slot', { p_slot: slot.id }, (r) =>
      !r.ok ? `Not cancelled: ${r.code}` : r.notice === 'LATE' ? `Late cancellation, ${lead(r.notice_min)} notice. The gap is open.` : r.notice === 'PAST' ? 'Recorded after the start: too late to refill.' : `Cancelled with ${lead(r.notice_min)} notice. The gap is open.`)
    setBusy(false)
  }

  return (
    <aside className="recovery is-open" aria-label="Recovery">
      <div className="rec-head">
        <p className="overline">
          {open ? (tooSoon ? 'Open · too late to offer' : 'Open gap') : slot.refilled ? 'Refilled' : 'Booked'} · {slot.id}
          {cancel?.code === 'LATE' && open && <span className="tag is-beat">Late cancellation</span>}
        </p>
        <button className="icon-btn rec-close" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      <h2 className="rec-time">{span(slot.start_min, slot.minutes)}</h2>
      <p className="rec-sub">
        {slot.minutes} min · {slot.skill} · with {who}
        {open ? <> · <span className="beat-text">{money(slot.price_inr)} at risk</span></> : <> · {slot.service} · {slot.customer}</>}
      </p>

      {!open && (
        <div className="rec-block">
          {slot.refilled && booking && (
            <p className="done-line"><Icon name="check" /> Refilled from the waitlist · booking #{booking.id} · {money(slot.price_inr)} recovered</p>
          )}
          {slot.start_min + slot.minutes > now ? (
            <button className="btn" onClick={cancelIt} disabled={busy}>Customer cancelled</button>
          ) : (
            <p className="quiet">This appointment is in the past.</p>
          )}
        </div>
      )}

      {open && tooSoon && <p className="quiet rec-block">It starts in {lead(slot.start_min - now)}. Nobody can get here in time, so no offers go out.</p>}

      {open && !tooSoon && (
        <>
          <div className="rec-block">
            <h3 className="list-head">Fits this gap <span className="count">{eligible.length}</span></h3>
            {eligible.length === 0 && <p className="quiet">Nobody on the waitlist fits. The rules below say why.</p>}
            <ul className="rows">
              {eligible.map((e) => {
                const row = waiting.find((w) => w.id === e.id)!
                const offered = alreadyOffered.has(e.id)
                return (
                  <li key={e.id}>
                    <label className={`pick ${offered ? 'is-offered' : ''}`}>
                      <input type="checkbox" checked={offered || chosen.has(e.id)} disabled={offered} onChange={() => toggle(e.id)} />
                      <span className="pick-main">
                        <strong>{e.name}</strong>
                        <small>{e.service} · {e.minutes} min · consent: {row.consent_source ?? 'recorded'}</small>
                      </span>
                      <span className="pick-side mono">{offered ? 'offered' : `#${row.pos}`}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <button className="btn is-primary" onClick={send} disabled={busy || chosen.size === 0}>
              Send {chosen.size || ''} offer{chosen.size === 1 ? '' : 's'}
            </button>
          </div>

          <div className="rec-block">
            <h3 className="list-head">Skipped by the rules <span className="count">{excluded.length}</span></h3>
            <ul className="rows">
              {excluded.map(({ entry, reason }) => (
                <li key={entry.id} className="skip">
                  <span className="skip-name">{entry.name}</span>
                  <span className="code">{reason}</span>
                  <span className="skip-why">{explain(reason as Reason, entry, asSlot(slot))}</span>
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
                  <span className="offer-state">{LIVE_TEXT[s]}{b ? ` #${b.id}` : ''}</span>
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
  st: State; highlight: Set<string>; onHover: (id: string | null) => void
  run: <T>(fn: string, args: Record<string, unknown>, ok?: (r: T) => string | null) => Promise<T | null>
}) {
  const [adding, setAdding] = useState(false)
  const entries = st.waitlist.filter((e) => e.status !== 'removed')
  const waitingCount = entries.filter((e) => e.status === 'waiting').length

  const setConsent = (e: DbEntry, v: boolean | null) =>
    run<{ ok: boolean; revoked_offers: number }>('set_consent', { p_entry: e.id, p_consent: v, p_source: 'front desk' }, (r) =>
      v === true ? `${e.name} said yes to messages.` : `${e.name} will not be messaged${r.revoked_offers ? `; ${r.revoked_offers} open offer${r.revoked_offers > 1 ? 's' : ''} revoked` : ''}.`)

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
              <strong>{e.name}</strong>
              <small>{e.service} · {e.minutes} min · {e.skill}{e.free_from != null || e.free_until != null ? ` · free ${clock(e.free_from ?? 600)}–${clock(Math.min(e.free_until ?? 1200, 1439))}` : ''}</small>
            </span>
            {e.status === 'booked' ? (
              <span className="tag is-act">Booked</span>
            ) : (
              <span className="consent" role="group" aria-label={`${e.name}: contact consent`}>
                {([[true, 'Yes'], [false, 'No'], [null, '?']] as const).map(([v, t]) => (
                  <button key={t} className={e.consent === v ? 'is-on' : ''} aria-pressed={e.consent === v}
                    onClick={() => e.consent !== v && setConsent(e, v)} title={v === null ? 'Not asked yet' : undefined}>{t}</button>
                ))}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function AddEntry({ run, onDone }: {
  run: <T>(fn: string, args: Record<string, unknown>, ok?: (r: T) => string | null) => Promise<T | null>
  onDone: () => void
}) {
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
      <fieldset className="seg"><legend>Contact consent</legend>
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
  ['Bookings', (e) => ['BOOKED', 'WAITLIST_RETAINED', 'ACCEPT_REPEATED', 'ACCEPT_REJECTED', 'CANCELLED'].includes(e.kind)],
  ['Consent', (e) => e.kind.startsWith('CONSENT') || e.code === 'NO_CONSENT'],
]

function Log({ st }: { st: State }) {
  const [f, setF] = useState(0)
  const [all, setAll] = useState(false)
  const rows = st.events.filter(FILTERS[f][1])
  const shown = all ? rows : rows.slice(0, 40)

  const exportJson = () => download(`refill-evidence-${st.workspace.id.slice(0, 8)}.json`,
    JSON.stringify({ exported_at: new Date().toISOString(), synthetic: true, ...st, events: [...st.events].reverse() }, null, 2))
  const exportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
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
            <span className={`code ${e.kind === 'BOOKED' ? 'is-act' : e.kind === 'CANCELLED' ? 'is-beat' : ''}`}>{chip(e)}</span>
            <span className="ev-text">{sentence(e, st)}</span>
          </li>
        ))}
      </ol>
      {rows.length > 40 && !all && <button className="btn is-quiet" onClick={() => setAll(true)}>Show all {rows.length}</button>}
    </section>
  )
}
