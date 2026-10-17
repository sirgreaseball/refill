// Everything you can do with one appointment or gap, in one sheet: offer an open gap to
// the waitlist, record a cancellation, move a booking, or send the client a link to choose.
// The page only proposes; the database re-checks every rule when you press the button.
import { useState } from 'react'
import { asEntry, asSlot, asStaff, moveUrl, rpc, type DbOffer, type DbSlot, type MoveOption, type State } from '../api'
import { LABEL, candidates, explain, type Reason } from '../engine'
import { MovePicker } from '../MovePicker'
import { Icon, Modal, Qr, clock, copy, lead, money, span } from '../ui'
import { LIVE_TEXT, MOVE_TEXT, REASON_TEXT, first, kindOf, movable, offerState, offerUrl, plural, staffFor, type Run } from './common'

const KIND_TAG: Record<string, [string, string]> = {
  open: ['Open gap', 'is-beat'], lapsed: ['Open, too late to fill', ''], blocked: ['Held: staff member out', 'is-risk'],
  risk: ['Needs a new time or staff member', 'is-risk'], refilled: ['Refilled from the waitlist', 'is-act'], booked: ['Booked', ''],
}

export function SlotSheet({ st, slot, run, onClose }: { st: State; slot: DbSlot; run: Run; onClose: () => void }) {
  const now = st.workspace.now_min
  const kind = kindOf(st, slot)
  const staff = staffFor(st, slot)
  const [tagText, tagTone] = KIND_TAG[kind]
  const past = slot.start_min + slot.minutes <= now
  const cancel = st.events.find((e) => e.kind === 'CANCELLED' && e.slot_id === slot.id)

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={`${span(slot.start_min, slot.minutes)} ${slot.service ?? ''}`}>
        <span className="grab" aria-hidden="true" />
        <header className="sheet-head">
          <div>
            <span className={`tag ${tagTone}`}>{tagText}{cancel?.code === 'LATE' && slot.status !== 'booked' ? ' · late cancellation' : ''}</span>
            <h2 style={{ marginTop: 10 }}>{span(slot.start_min, slot.minutes)}</h2>
            <p>{slot.service ?? slot.skill} · {slot.minutes} min · {staff?.name ?? 'staff'}{slot.customer ? ` · ${slot.customer}` : ''}{slot.status !== 'booked' && slot.price_inr ? ` · ${money(slot.price_inr)}` : ''}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>
        <div className="sheet-body">
          {slot.status === 'booked' && (past
            ? <section className="sec"><p className="quiet">This appointment is over.</p></section>
            : <Booked st={st} slot={slot} run={run} risk={kind === 'risk'} onDone={onClose} />)}
          {kind === 'open' && <OpenGap st={st} slot={slot} run={run} />}
          {kind === 'lapsed' && !past && <section className="sec"><p className="quiet">It starts in {lead(slot.start_min - now)}. Nobody can get here in time, so no offers go out.</p></section>}
          {kind === 'blocked' && !past && <Held st={st} slot={slot} run={run} />}
          {slot.status !== 'booked' && slot.cancelled_customer && !past && <Undo slot={slot} run={run} />}
          {slot.status !== 'booked' && <Offers st={st} slot={slot} />}
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------- a booked appointment

function Booked({ st, slot, run, risk, onDone }: { st: State; slot: DbSlot; run: Run; risk: boolean; onDone: () => void }) {
  const [opts, setOpts] = useState<MoveOption[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const staff = staffFor(st, slot)
  const name = first(slot.customer)
  const open = st.moves.find((m) => m.slot_id === slot.id && m.status === 'open')
  const booking = st.bookings.find((b) => b.slot_id === slot.id && b.status === 'confirmed')

  const load = async () => setOpts((await run<MoveOption[]>('get_move_options', { p_slot: slot.id })) ?? [])
  const pick = async (o: MoveOption) => {
    setBusy(true)
    const r = await run<{ ok: boolean; code?: string; opened?: boolean }>('move_booking', { p_slot: slot.id, p_staff: o.staff, p_start: o.start_min }, (x) =>
      x.ok ? `${slot.customer} moved to ${clock(o.start_min)} with ${o.name}. ${x.opened ? `${clock(slot.start_min)} is now open to fill.` : `${clock(slot.start_min)} is held: ${staff?.name} is out.`}`
        : `Not moved: ${MOVE_TEXT[x.code ?? ''] ?? x.code}`)
    setBusy(false)
    if (r?.ok) onDone()
  }
  const sendLink = async () => {
    setBusy(true)
    const r = await run<{ ok: boolean; move?: string; code?: string }>('move_link', { p_slot: slot.id })
    if (r?.ok && r.move) setLink(moveUrl(r.move))
    setBusy(false)
  }
  const cancelIt = async () => {
    setBusy(true)
    await run<{ ok: boolean; notice: string; notice_min: number; code?: string; blocked?: boolean }>('cancel_slot', { p_slot: slot.id }, (r) =>
      !r.ok ? `Not cancelled: ${r.code}` : r.blocked ? `Cancelled. ${staff?.name} is out, so the time is held.`
        : r.notice === 'LATE' ? `Late cancellation (${lead(r.notice_min)} notice). The gap is open to fill.` : `Cancelled with ${lead(r.notice_min)} notice. The gap is open to fill.`)
    setBusy(false)
    setConfirm(false)
  }
  const message = risk
    ? `Hi ${name}, ${staff?.name} can't come in today, so your ${clock(slot.start_min)} ${slot.service} needs a new time. Pick one that suits you here:`
    : `Hi ${name}, need to change your ${clock(slot.start_min)} ${slot.service}? Pick a new time or cancel here:`

  return (
    <>
      {risk && <section className="sec"><p className="note is-risk">{staff?.name} is out today. {name}’s {slot.service} needs someone who does {slot.skill}, or a new time. Nothing moves until you or {name} choose.</p></section>}
      {slot.refilled && booking && <section className="sec"><p className="done-line"><Icon name="check" /> Refilled from the waitlist · booking #{booking.id} · {money(slot.price_inr)} recovered</p></section>}

      <section className="sec">
        <h3>Move to another time</h3>
        {open && <p className="note is-beat small" style={{ marginBottom: 10 }}>Link sent to {name}; waiting for their choice. <button className="link" onClick={() => setLink(moveUrl(open.id))}>Show link</button></p>}
        {opts === null ? (
          <div className="acts">
            <button className="btn is-primary" onClick={load} disabled={busy}><Icon name="calendar" /> Pick a new time</button>
            {!open && <button className="btn" onClick={sendLink} disabled={busy}><Icon name="share" /> Let {name} choose</button>}
          </div>
        ) : (
          <MovePicker options={opts} busy={busy} confirm={(o) => `Move ${name} to ${clock(o.start_min)} with ${o.name}`} onPick={pick} onCancel={() => setOpts(null)} />
        )}
      </section>

      <section className="sec">
        <h3>Cancelled?</h3>
        {confirm ? (
          <div className="acts">
            <button className="btn is-danger" onClick={cancelIt} disabled={busy}>Yes, {name} cancelled</button>
            <button className="btn is-quiet" onClick={() => setConfirm(false)}>Keep it</button>
          </div>
        ) : <button className="btn is-danger" onClick={() => setConfirm(true)}>Record a cancellation</button>}
        <p className="quiet small" style={{ marginTop: 8 }}>The gap then shows who on the waitlist fits it.</p>
      </section>

      {link && (
        <Modal title={`${name}'s link`} onClose={() => setLink(null)}>
          <div className="qr-one">
            <Qr text={link} size={190} />
            <p className="bubble small">{message} {link}</p>
            <div className="card-acts" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => copy(`${message} ${link}`)}><Icon name="copy" /> Copy message</button>
              <a className="btn is-quiet" href={link.slice(link.indexOf('#'))}>Open as {name}</a>
            </div>
            <p className="quiet small">Demo: nothing is sent. {name} sees only times that truly work.</p>
          </div>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------- an open gap

function OpenGap({ st, slot, run }: { st: State; slot: DbSlot; run: Run }) {
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [busy, setBusy] = useState(false)
  const staff = staffFor(st, slot)
  const staffRule = staff ? asStaff(staff) : null
  const waiting = st.waitlist.filter((e) => e.status === 'waiting')
  const offers = st.offers.filter((o) => o.slot_id === slot.id)
  const fit = candidates(asSlot(slot), waiting.map(asEntry), staffRule)
  const sentToday = (id: string) => st.offers.filter((o) => o.entry_id === id).length
  const offeredHere = new Map(offers.map((o) => [o.entry_id, offerState(o, st)]))
  const capped = fit.eligible.filter((e) => !offeredHere.has(e.id) && sentToday(e.id) >= st.workspace.max_offers)
  const eligible = fit.eligible.filter((e) => !capped.includes(e))
  const fresh = eligible.filter((e) => !offeredHere.has(e.id))
  const chosen = picked ?? new Set(fresh.slice(0, 3).map((e) => e.id))
  const lapsed = offers.length > 0 && !offers.some((o) => offerState(o, st) === 'waiting')

  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }
  const send = async () => {
    setBusy(true)
    await run<{ ok: boolean; code?: string; results?: { outcome: string }[] }>('send_offers', { p_slot: slot.id, p_entries: [...chosen] }, (r) => {
      if (!r.ok) return `Not sent: ${REASON_TEXT[r.code ?? ''] ?? r.code}`
      const sent = r.results!.filter((x) => x.outcome === 'SENT').length
      const skipped = r.results!.length - sent
      return `${plural(sent, 'offer')} sent${skipped ? `, ${skipped} refused by the rules` : ''}. First to book gets it.`
    })
    setPicked(new Set())
    setBusy(false)
  }

  return (
    <>
      <section className="sec">
        <h3>Offer it to the waitlist <span className="count">{eligible.length} fit</span></h3>
        {lapsed && <p className="note is-beat small" style={{ marginBottom: 8 }}>{fresh.length ? 'Nobody replied in time. The next people in the queue are ticked.' : 'Nobody replied in time. You can offer it again to anyone who did not answer.'}</p>}
        {eligible.length === 0 ? <p className="quiet">Nobody on the waitlist fits this gap. The reasons are below.</p> : (
          <ul className="rows">
            {eligible.map((e) => {
              const row = waiting.find((w) => w.id === e.id)!
              const offered = offeredHere.get(e.id)
              const locked = !!offered && offered !== 'expired'
              return (
                <li key={e.id}>
                  <label className={`pick ${locked ? 'is-offered' : ''}`}>
                    <input type="checkbox" checked={locked ? offered === 'waiting' : chosen.has(e.id)} disabled={locked} onChange={() => toggle(e.id)} />
                    <span className="pick-main"><strong>{e.name}</strong><small>{e.service} · {e.minutes} min · said yes to messages</small></span>
                    <span className="pick-side mono">{offered ? LIVE_TEXT[offered] : `#${row.pos} in queue`}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {eligible.length > 0 && (
          <>
            <button className="btn is-primary is-wide" style={{ marginTop: 10 }} onClick={send} disabled={busy || chosen.size === 0}>
              {chosen.size ? `Send ${plural(chosen.size, 'offer')}` : 'Tick someone to offer'}
            </button>
            <p className="quiet small" style={{ marginTop: 8 }}>Each offer holds {st.workspace.hold_min} min. Nobody gets more than {st.workspace.max_offers} messages a day. First to book wins; the rest keep their place.</p>
          </>
        )}
      </section>

      {fit.excluded.length + capped.length > 0 && (
        <section className="sec">
          <details className="more">
            <summary>Not offered, and why <span className="count">{fit.excluded.length + capped.length}</span></summary>
            <ul className="rows">
              {capped.map((entry) => (
                <li key={entry.id} className="skip">
                  <span className="skip-name">{entry.name}</span>
                  <span className="code" title="FREQUENCY_CAP">{LABEL.FREQUENCY_CAP}</span>
                  <span className="skip-why">Already messaged {sentToday(entry.id)} times today</span>
                </li>
              ))}
              {fit.excluded.map(({ entry, reason }) => (
                <li key={entry.id} className="skip">
                  <span className="skip-name">{entry.name}</span>
                  <span className={`code ${reason === 'NO_CONSENT' ? 'is-risk' : ''}`} title={reason}>{LABEL[reason]}</span>
                  <span className="skip-why">{explain(reason as Reason, entry, asSlot(slot), staffRule)} <span className="faint mono">{reason}</span></span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </>
  )
}

// ---------------------------------------------------------------- a held gap (staff member out)

function Held({ st, slot, run }: { st: State; slot: DbSlot; run: Run }) {
  const staff = staffFor(st, slot)
  const targets = movable(st, slot)
  const give = (to: { id: string; name: string }) =>
    run<{ ok: boolean; code?: string }>('reassign_slot', { p_slot: slot.id, p_to: to.id }, (r) =>
      r.ok ? `The ${clock(slot.start_min)} gap is now ${to.name}'s and open to fill.` : `Not moved: ${MOVE_TEXT[r.code ?? ''] ?? r.code}`)
  return (
    <section className="sec">
      <p className="note">{staff?.name} is out, so this time cannot be offered with them. Give it to someone who is in and free, then fill it.</p>
      {targets.length ? (
        <div className="move-list" style={{ marginTop: 10 }}>
          {targets.map((t) => <button key={t.id} className="btn" onClick={() => give(t)}>Give to {t.name} <small className="quiet">{t.skills.join(' · ')}</small></button>)}
        </div>
      ) : <p className="quiet" style={{ marginTop: 10 }}>Nobody else is working and free at this time.</p>}
    </section>
  )
}

function Undo({ slot, run }: { slot: DbSlot; run: Run }) {
  return (
    <section className="sec">
      <button className="btn is-quiet" onClick={() => run<{ ok: boolean; revoked_offers: number; code?: string }>('restore_slot', { p_slot: slot.id }, (r) =>
        r.ok ? `Undone: ${slot.cancelled_customer} is back${r.revoked_offers ? `, ${plural(r.revoked_offers, 'open offer')} withdrawn` : ''}.` : `Nothing to undo: ${r.code}`)}>
        <Icon name="reset" /> Undo the cancellation ({slot.cancelled_customer})
      </button>
    </section>
  )
}

// ---------------------------------------------------------------- offers already out

function Offers({ st, slot }: { st: State; slot: DbSlot }) {
  const [qr, setQr] = useState<DbOffer | null>(null)
  const [race, setRace] = useState(false)
  const offers = st.offers.filter((o) => o.slot_id === slot.id)
  if (!offers.length) return null
  const live = offers.filter((o) => offerState(o, st) === 'waiting')
  const name = (o: DbOffer) => st.waitlist.find((x) => x.id === o.entry_id)?.name ?? o.entry_id
  return (
    <section className="sec">
      <h3>Offers out <span className="count">{offers.length}</span></h3>
      <ul className="rows">
        {offers.map((o) => {
          const s = offerState(o, st)
          const b = st.bookings.find((x) => x.offer_id === o.id && x.status === 'confirmed')
          return (
            <li key={o.id} className={`offer is-${s}`}>
              <span className="offer-name">{name(o)}</span>
              <span className="offer-state">{LIVE_TEXT[s]}{b ? ` · booking #${b.id}` : ''}{s === 'waiting' && o.expires_min != null ? ` · reply by ${clock(o.expires_min)}` : ''}</span>
              {s === 'waiting' && (
                <span className="offer-acts">
                  <button className="icon-btn" onClick={() => setQr(o)} aria-label={`Open ${name(o)}'s offer on a phone`}><Icon name="phone" /></button>
                  <a className="icon-btn" href={`#/o/${o.id}`} aria-label={`Open ${name(o)}'s offer here`}><Icon name="arrow" /></a>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {live.length >= 2 && <button className="btn" style={{ marginTop: 10 }} onClick={() => setRace(true)}><Icon name="bolt" /> Two phones, one slot</button>}
      {qr && (
        <Modal title={`${name(qr)}'s offer`} onClose={() => setQr(null)}>
          <div className="qr-one">
            <Qr text={offerUrl(qr.id)} size={208} />
            <p className="quiet">Scan with a phone to see exactly what this client gets.</p>
          </div>
        </Modal>
      )}
      {race && <Race st={st} offers={live} name={name} onClose={() => setRace(false)} />}
    </section>
  )
}

function Race({ offers, name, onClose }: { st: State; offers: DbOffer[]; name: (o: DbOffer) => string; onClose: () => void }) {
  const [pair] = useState(offers.slice(0, 2))
  const [result, setResult] = useState<{ name: string; outcome: string; booking?: number; lost_to?: number }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const tapBoth = async () => {
    setBusy(true)
    const out = await Promise.all(pair.map((o) => rpc<{ outcome: string; booking?: number; lost_to?: number }>('accept_offer', { p_offer: o.id }).catch((e) => ({ outcome: `ERROR ${(e as Error).message}` }))))
    setResult(out.map((r, i) => ({ name: name(pair[i]), ...r })))
    setBusy(false)
  }
  return (
    <Modal title="Two phones, one slot" onClose={onClose}>
      <p className="quiet">Scan one code on each phone and tap Book on both at once. Or fire both taps from here.</p>
      <div className="qr-pair">
        {pair.map((o) => <figure key={o.id}><Qr text={offerUrl(o.id)} size={140} /><figcaption>{name(o)}</figcaption></figure>)}
      </div>
      <button className="btn is-primary is-wide" onClick={tapBoth} disabled={busy || !!result}><Icon name="bolt" /> Tap both at once</button>
      {result && (
        <ul className="rows race-out" aria-live="polite">
          {result.map((r) => (
            <li key={r.name}>
              <strong>{r.name}</strong>
              <span className={`code ${r.outcome === 'CONFIRMED' ? 'is-act' : ''}`}>{r.outcome}</span>
              <span className="quiet small">{r.outcome === 'CONFIRMED' ? `booking #${r.booking}` : r.outcome === 'WAITLISTED' ? `lost to #${r.lost_to}, keeps place` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
