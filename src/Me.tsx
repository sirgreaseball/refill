// The customer's own page: their place in the queue, their consent, their offers.
// Opened with the private token from sign-up; shows nothing about anyone else.
import { useCallback, useEffect, useState } from 'react'
import { rpc } from './rpc.ts'
import { readSession } from './auth.ts'
import { formatDate } from './calendar'
import { SlotDial } from './Dial'
import { Icon, Mark, clock, money, span } from './ui'

interface Mine {
  state: 'waiting' | 'booked' | 'removed' | 'NOT_FOUND'
  name: string; service: string | null; minutes: number; price_inr: number | null
  consent: boolean | null; consent_at: string | null; consent_source: string | null
  free_from: number | null; free_until: number | null; salon: string; now_min: number; place: number; kind?: string
  offers: { id: string; start_min: number; minutes: number; expires_min: number | null; status: string; slot_status: string }[]
  booking: { status: 'confirmed' | 'cancelled'; day?: string; scheduled?: boolean; start_min: number; minutes: number; service: string | null; stylist: string | null; stylist_present: boolean | null } | null
  history?: { day: string; start_min: number; minutes: number; service: string | null; staff: string | null }[]
}

// Every place this phone has joined, so one person can switch between their salon, clinic and tutor.
// Kept on this device only; each entry is the private link that place gave them.
type Place = { token: string; salon: string }
const PLACES = 'refill.places'
export function readPlaces(): Place[] {
  try { const p = JSON.parse(localStorage.getItem(PLACES) ?? '[]'); return Array.isArray(p) ? p.filter((x) => typeof x?.token === 'string') : [] } catch { return [] }
}
function keepPlace(token: string, salon: string | null) {
  try {
    const rest = readPlaces().filter((x) => x.token !== token)
    localStorage.setItem(PLACES, JSON.stringify(salon ? [{ token, salon }, ...rest] : rest))
  } catch { /* private mode: this page still works */ }
}

/** Your places: every waitlist this phone has joined. */
export function Places() {
  const places = readPlaces()
  return (
    <main className="phone">
      <header className="phone-top"><span className="avatar" aria-hidden="true">R</span><span><strong>Your places</strong><small>on this phone</small></span></header>
      <div className="phone-lead">
        <h1 className="phone-h">{places.length ? 'Pick a place' : 'No places yet'}</h1>
        <p className="quiet">{places.length ? 'Each one keeps your place in its queue, your messages choice and your past visits.' : 'Join a waitlist from a business’s sign-up link and it appears here.'}</p>
      </div>
      {places.length > 0 && (
        <div className="phone-body"><ul className="rows">
          {places.map((p) => <li key={p.token}><a className="row place-row" href={`#/me/${p.token}`}><span className="row-main"><strong>{p.salon}</strong><small>Open my page</small></span><Icon name="arrow" size={16} /></a></li>)}
        </ul></div>
      )}
    </main>
  )
}

export default function Me({ token }: { token: string }) {
  const [me, setMe] = useState<Mine | null>(null)
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    try {
      const m = await rpc<Mine>('get_my_entry', { p_token: token })
      setMe(m)
      keepPlace(token, m.state === 'NOT_FOUND' ? null : m.salon)
      setOffline(false)
    } catch { setOffline(true) }
  }, [token])

  useEffect(() => {
    load()
    const t = setInterval(() => !document.hidden && load(), 3000)
    return () => clearInterval(t)
  }, [load])

  const act = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true)
    try { await rpc(fn, { p_token: token, ...args }); await load() } catch { setOffline(true) }
    setBusy(false)
  }

  const change = async () => {
    setBusy(true)
    try {
      const r = await rpc<{ ok: boolean; move?: string }>('my_move', { p_token: token })
      if (r.ok && r.move) location.hash = `#/m/${r.move}`
    } catch { setOffline(true) }
    setBusy(false)
  }

  const cancelScheduled = async () => {
    setBusy(true)
    setMessage(null)
    try {
      let result: { ok: boolean } | null = null
      try {
        result = await rpc<{ ok: boolean }>('cancel_scheduled_booking', { p_token: token })
      } catch {
        result = await rpc<{ ok: boolean }>('leave_waitlist', { p_token: token }).catch(() => ({ ok: false }))
      }
      if (!result?.ok) setMessage('This appointment could not be cancelled. Refresh and try again.')
      else { setCancelling(false); await load() }
    } catch { setMessage('Couldn’t cancel your appointment. Please try again.') }
    setBusy(false)
  }

  if (!me) return <main className="phone"><p className="quiet">{offline ? 'No connection. Retrying…' : 'Opening your place in the queue…'}</p></main>
  if (me.state === 'NOT_FOUND') return <main className="phone"><Mark /><h1 className="phone-h">We could not find this sign-up</h1><p className="quiet">It may be from an old demo day.</p></main>

  const open = me.offers.filter((o) => o.status === 'sent' && o.slot_status === 'free' && (o.expires_min == null || me.now_min < o.expires_min))
  document.title = open.length ? `(${open.length}) A time opened · Refill` : 'Refill · appointment recovery desk'

  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{me.salon.slice(0, 1)}</span>
        <span><strong>{me.salon}</strong><small>{me.state === 'booked' ? 'your booking' : 'your waitlist place'}</small></span>
      </header>
      <div className="phone-lead">
      {readPlaces().length > 1 && (
        <nav className="chips places" aria-label="Your places">
          {readPlaces().map((p) => <a key={p.token} href={`#/me/${p.token}`} className={p.token === token ? 'is-on' : ''} aria-current={p.token === token ? 'page' : undefined}>{p.salon.split(',')[0]}</a>)}
        </nav>
      )}

      {open.length > 0 && (
        <section className="bubble offer-now" aria-live="polite">
          <p className="overline">Just opened</p>
          <p><strong>{open.length === 1 ? 'A time is open for you' : `${open.length} times are open for you`}</strong></p>
          {open.map((o) => (
            <a key={o.id} className="btn is-primary is-big" href={`#/o/${o.id}`}>{span(o.start_min, o.minutes)} · reply by {o.expires_min != null ? clock(o.expires_min) : 'soon'}</a>
          ))}
        </section>
      )}
      {me.state === 'waiting' && (
        <SlotDial segs={[{ start: Math.max(600, me.free_from ?? 600), minutes: Math.min(1200, me.free_until ?? 1200) - Math.max(600, me.free_from ?? 600), kind: 'booked' }]} now={me.now_min} big={me.free_from != null ? clock(me.free_from) : 'Any'} small={me.free_until != null ? `free until ${clock(Math.min(me.free_until, 1439))}` : me.free_from != null ? 'free from then on' : 'time today'}
          label={`Number ${me.place} in the queue`} />
      )}
      {me.booking && (me.state === 'booked' || me.state === 'removed') && (
        <SlotDial segs={[{ start: me.booking.start_min, minutes: me.booking.minutes, kind: me.booking.status === 'cancelled' ? 'lapsed' : !me.booking.scheduled && me.booking.stylist_present === false ? 'risk' : 'refilled' }]} now={me.booking.scheduled ? undefined : me.now_min}
          big={clock(me.booking.start_min)} small={`${me.booking.minutes} min · ${me.booking.stylist ?? ''}`}
          label={`${me.booking.service}${me.booking.day ? ` on ${formatDate(me.booking.day)}` : ''} at ${span(me.booking.start_min, me.booking.minutes)}`} />
      )}
      {me.state === 'waiting' && (
        <div>
          <p className="overline">Hi {me.name.split(' ')[0]}</p>
          <h1 className="phone-h">You are number {me.place}</h1>
          <p className="quiet">For {me.service} ({me.minutes} min{me.price_inr ? `, ${money(me.price_inr)}` : ''}){me.free_from != null || me.free_until != null ? `, free ${clock(me.free_from ?? 600)}–${clock(Math.min(me.free_until ?? 1200, 1439))}` : ''}.</p>
        </div>
      )}
      </div>

      <div className="phone-body">
      {message && <p className="err" role="alert">{message}</p>}
      {me.state === 'booked' && me.booking?.status === 'confirmed' && (
        <div className="verdict is-act">
          <h1 className="phone-h">You are booked</h1>
          {me.booking.day && <p className="overline">{formatDate(me.booking.day)}</p>}
          <p>{me.booking.service} at {span(me.booking.start_min, me.booking.minutes)} with {me.booking.stylist}.</p>
          {!me.booking.scheduled && me.booking.stylist_present === false && <p className="risk-text">{me.booking.stylist} can’t come in today. Please pick a new time.</p>}
          {me.booking.scheduled ? (
            cancelling ? <div className="phone-acts">
              <p>Cancel your appointment{me.booking.day ? ` on ${formatDate(me.booking.day)}` : ''}?</p>
              <button className="btn is-danger" disabled={busy} onClick={cancelScheduled}>Yes, cancel appointment</button>
              <button className="link" disabled={busy} onClick={() => setCancelling(false)}>Keep appointment</button>
            </div> : <button className="btn" disabled={busy} onClick={() => setCancelling(true)}>Cancel appointment</button>
          ) : <button className="btn" disabled={busy} onClick={change}>Change or cancel</button>}
        </div>
      )}
      {me.state === 'removed' && me.booking?.status === 'cancelled' && <div className="verdict"><h1 className="phone-h">Booking cancelled</h1><p>Your {me.booking.service}{me.booking.day ? ` on ${formatDate(me.booking.day)}` : ''} at {clock(me.booking.start_min)} is cancelled. Nothing more will be sent to you.</p></div>}
      {me.state === 'removed' && me.booking?.status !== 'cancelled' && <div className="verdict"><h1 className="phone-h">You left the waitlist</h1><p>Nothing more will be sent to you.</p></div>}


      {me.state === 'waiting' && (
        <section className={`presence-card ${me.consent ? 'is-in' : 'is-out'}`} aria-label="Messages">
          <p className="overline">Messages</p>
          <p className="presence-state">{me.consent ? 'You get a message when a slot opens' : me.consent === false ? 'No messages, so no offers' : 'You have not chosen yet'}</p>
          {me.consent !== true && <p className="quiet small">Open slots are only offered to people who said yes to messages. Switch on to be offered the next one that fits.</p>}
          {me.consent_at && <p className="quiet small">Recorded {new Date(me.consent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {me.consent_source}</p>}
          <button className="btn" disabled={busy} onClick={() => act('set_my_consent', { p_consent: !me.consent })}>{me.consent ? 'Stop messages' : 'Yes, message me'}</button>
        </section>
      )}

      {me.state === 'waiting' && (
        leaving ? (
          <div className="phone-acts">
            <p>Leave the waitlist? Any open offer to you is withdrawn.</p>
            <button className="btn" disabled={busy} onClick={() => act('leave_waitlist', {})}>Yes, leave</button>
            <button className="link" onClick={() => setLeaving(false)}>Stay on the list</button>
          </div>
        ) : <button className="link" onClick={() => setLeaving(true)}>Leave the waitlist</button>
      )}

      {(me.history?.length ?? 0) > 0 && (
        <section aria-label="Past visits">
          <p className="overline">Your past visits</p>
          <ul className="rows">
            {me.history!.map((h, i) => (
              <li key={i} className="my-slot">
                <span className="mono">{clock(h.start_min)}</span>
                <span className="my-slot-main"><strong>{h.service ?? 'Appointment'}</strong><small>{new Date(`${h.day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{h.staff ? ` · ${h.staff}` : ''}</small></span>
                <span className="tag">Visited</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      </div>

      <footer className="phone-foot">
        {readSession() ? <p><a href="#/">Your account: all your places</a></p> : readPlaces().length > 0 && <p><a href="#/me">All your places</a></p>}
        <p><Icon name="shield" size={14} /> Only you can open this page. Keep the link private.</p>
        {me.kind !== 'live' && <p>Synthetic demo. No real message is ever sent.</p>}
      </footer>
    </main>
  )
}
