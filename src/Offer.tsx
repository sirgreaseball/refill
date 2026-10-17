// What the customer sees on their phone: one message, one decision.
// The state comes from the database every two seconds, so if someone else books
// the slot first, this page says so before the customer even taps.
import { useCallback, useEffect, useState } from 'react'
import { rpc } from './api'
import { SlotDial } from './Dial'
import { Icon, Mark, clock, money, span } from './ui'

interface OfferView {
  state: 'OPEN' | 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED' | 'TAKEN' | 'DECLINED' | 'NO_CONSENT' | 'WITHDRAWN' | 'BOOKED_ELSEWHERE' | 'EXPIRED' | 'NOT_FOUND'
  reason?: 'STAFF_ABSENT' | 'LEFT_WAITLIST' | 'TAKEN' | 'CHANGED' | null
  moved?: boolean
  salon: string
  kind?: string
  expires_min: number | null
  now_min: number
  slot: { start_min: number; minutes: number; skill: string; staff: string | null }
  entry: { name: string; service: string | null; minutes: number; price_inr: number | null; consent_at: string | null; consent_source: string | null }
  booking: number | null
  winner: number | null
  place: number
}

export default function Offer({ id }: { id: string }) {
  const [v, setV] = useState<OfferView | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [lastTap, setLastTap] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setV(await rpc<OfferView>('get_offer', { p_offer: id })); setFailed(false) } catch { setFailed(true) }
  }, [id])

  useEffect(() => {
    load()
    const t = setInterval(() => !document.hidden && load(), 2000)
    return () => clearInterval(t)
  }, [load])

  const act = async (fn: string) => {
    setBusy(true)
    try {
      const r = await rpc<{ outcome?: string }>(fn, { p_offer: id })
      setLastTap(r.outcome ?? null)
      await load()
    } catch { setFailed(true) }
    setBusy(false)
  }

  if (!v) return <main className="phone"><p className="quiet">{failed ? 'No connection. This page retries on its own.' : 'Opening your message…'}</p></main>

  if (v.state === 'NOT_FOUND') {
    return <main className="phone"><Mark /><h1 className="phone-h">This offer does not exist</h1><p className="quiet">The link may be from an old demo day.</p></main>
  }

  const first = v.entry.name.split(' ')[0]
  const when = span(v.slot.start_min, v.slot.minutes)
  const consentLine = v.entry.consent_at
    ? `You get this because you said yes to messages (${v.entry.consent_source}, ${new Date(v.entry.consent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}).`
    : 'You get this because you said yes to messages.'

  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{v.salon.slice(0, 1)}</span>
        <span><strong>{v.salon}</strong><small>via Refill</small></span>
      </header>

      <div className="phone-lead">
      <SlotDial segs={[{ start: v.slot.start_min, minutes: v.slot.minutes, kind: v.state === 'OPEN' ? 'open' : v.state === 'CONFIRMED' ? 'refilled' : 'lapsed' }]} now={v.now_min}
        big={clock(v.slot.start_min)} small={`${v.slot.minutes} min${v.slot.staff ? ` · ${v.slot.staff}` : ''}`}
        label={`${when}${v.slot.staff ? ` with ${v.slot.staff}` : ''}: ${v.state === 'OPEN' ? 'open for you' : v.state === 'CONFIRMED' ? 'booked for you' : v.state === 'CANCELLED' ? 'cancelled' : 'no longer yours'}`} />

      {!(v.moved || v.state === 'CANCELLED') && <div className="bubble">
        <p>Hi {first}, a {v.slot.minutes}-minute {v.slot.skill} slot just opened today at <strong>{clock(v.slot.start_min)}</strong>{v.slot.staff ? <> with {v.slot.staff}</> : null}.</p>
        <p>It fits your {v.entry.service ?? 'appointment'} ({v.entry.minutes} min{v.entry.price_inr ? `, ${money(v.entry.price_inr)}` : ''}). Want it?</p>
      </div>}
      </div>

      <div className="phone-body">

      {v.state === 'OPEN' && (
        <div className="phone-acts">
          <button className="btn is-primary is-big" disabled={busy} onClick={() => act('accept_offer')}>Book {clock(v.slot.start_min)}</button>
          <button className="btn" disabled={busy} onClick={() => act('decline_offer')}>Not today</button>
          <button className="link" disabled={busy} onClick={() => act('stop_messages')}>Stop messages from {v.salon.split(',')[0]}</button>
          {v.expires_min != null && <p className="quiet small hold">Held for you until {clock(v.expires_min)}. After that it goes to the next person.</p>}
        </div>
      )}

      {v.state === 'EXPIRED' && (
        <div className="verdict"><h1 className="phone-h">This offer has expired</h1><p>It was held for you until {v.expires_min != null ? clock(v.expires_min) : 'a set time'}. You keep your place on the waitlist for the next gap that fits.</p></div>
      )}

      {v.state === 'CONFIRMED' && (
        <div className="verdict is-act">
          <svg className="tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" pathLength={100} /></svg>
          <h1 className="phone-h">{v.moved ? 'Your time changed' : 'You’re booked'}</h1>
          <p>{v.moved ? 'The front desk moved your appointment. It is now ' : ''}{when}{v.slot.staff ? ` with ${v.slot.staff}` : ''}{v.booking ? ` · booking #${v.booking}` : ''}</p>
          {lastTap === 'ALREADY_CONFIRMED' && <p className="quiet">You tapped again. Still one booking.</p>}
        </div>
      )}

      {(v.state === 'TAKEN' || v.state === 'WAITLISTED') && (
        <div className="verdict">
          <h1 className="phone-h">Someone got there first</h1>
          <p>{v.winner ? `Booking #${v.winner} took the ${clock(v.slot.start_min)} slot a moment earlier. ` : ''}You keep your place on the waitlist{v.place ? `: number ${v.place}` : ''}. We will message you when the next gap fits.</p>
        </div>
      )}

      {v.state === 'DECLINED' && (
        <div className="verdict"><h1 className="phone-h">No problem</h1><p>You stay on the waitlist for the next gap that fits.</p></div>
      )}

      {v.state === 'CANCELLED' && (
        <div className="verdict"><h1 className="phone-h">Appointment cancelled</h1><p>Your {v.entry.service ?? 'appointment'}{v.booking ? ` (booking #${v.booking})` : ''} is cancelled, so please don’t come in for it. Call {v.salon.split(',')[0]} if this looks wrong.</p></div>
      )}

      {v.state === 'WITHDRAWN' && (
        <div className="verdict"><h1 className="phone-h">This offer was withdrawn</h1><p>{v.reason === 'STAFF_ABSENT'
          ? `${v.slot.staff ?? 'The staff member'} can’t come in today, so this slot is not available. You keep your place on the waitlist and can still be offered the next gap that fits.`
          : v.reason === 'LEFT_WAITLIST' ? 'You left the waitlist, so this offer is closed.'
          : 'The salon changed this slot, so it is no longer on offer. You keep your place on the waitlist for the next gap that fits.'}</p></div>
      )}

      {v.state === 'NO_CONSENT' && (
        <div className="verdict"><h1 className="phone-h">Messages stopped</h1><p>{v.salon.split(',')[0]} will not message you again. This offer is closed.</p></div>
      )}

      {v.state === 'BOOKED_ELSEWHERE' && (
        <div className="verdict"><h1 className="phone-h">You already have a slot</h1><p>You booked another gap today, so this one goes to the next person.</p></div>
      )}

      </div>

      <footer className="phone-foot">
        <p>{consentLine}</p>
        {v.kind !== 'live' && <p><Icon name="shield" size={14} /> Synthetic demo. No real message was sent.</p>}
      </footer>
    </main>
  )
}
