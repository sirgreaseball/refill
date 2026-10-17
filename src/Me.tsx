// The customer's own page: their place in the queue, their consent, their offers.
// Opened with the private token from sign-up; shows nothing about anyone else.
import { useCallback, useEffect, useState } from 'react'
import { rpc } from './rpc.ts'
import { Icon, Mark, clock, money, span } from './ui'

interface Mine {
  state: 'waiting' | 'booked' | 'removed' | 'NOT_FOUND'
  name: string; service: string | null; minutes: number; price_inr: number | null
  consent: boolean | null; consent_at: string | null; consent_source: string | null
  free_from: number | null; free_until: number | null; salon: string; now_min: number; place: number
  offers: { id: string; start_min: number; minutes: number; expires_min: number | null; status: string; slot_status: string }[]
  booking: { status: 'confirmed' | 'cancelled'; start_min: number; minutes: number; service: string | null; stylist: string | null; stylist_present: boolean | null } | null
}

export default function Me({ token }: { token: string }) {
  const [me, setMe] = useState<Mine | null>(null)
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    try { setMe(await rpc<Mine>('get_my_entry', { p_token: token })); setOffline(false) } catch { setOffline(true) }
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

  if (!me) return <main className="phone"><p className="quiet">{offline ? 'No connection. Retrying…' : 'Opening your place in the queue…'}</p></main>
  if (me.state === 'NOT_FOUND') return <main className="phone"><Mark /><h1 className="phone-h">We could not find this sign-up</h1><p className="quiet">It may be from an old demo day.</p></main>

  const open = me.offers.filter((o) => o.status === 'sent' && o.slot_status === 'free' && (o.expires_min == null || me.now_min < o.expires_min))

  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{me.salon.slice(0, 1)}</span>
        <span><strong>{me.salon}</strong><small>your waitlist place</small></span>
      </header>

      {me.state === 'waiting' && (
        <div>
          <p className="overline">Hi {me.name.split(' ')[0]}</p>
          <h1 className="phone-h">You are number {me.place}</h1>
          <p className="quiet">For {me.service} ({me.minutes} min{me.price_inr ? `, ${money(me.price_inr)}` : ''}){me.free_from != null || me.free_until != null ? `, free ${clock(me.free_from ?? 600)}–${clock(Math.min(me.free_until ?? 1200, 1439))}` : ''}.</p>
        </div>
      )}
      {me.state === 'booked' && me.booking?.status === 'confirmed' && (
        <div className="verdict is-act">
          <h1 className="phone-h">You are booked</h1>
          <p>{me.booking.service} at {span(me.booking.start_min, me.booking.minutes)} with {me.booking.stylist}.</p>
          {me.booking.stylist_present === false && <p className="risk-text">{me.booking.stylist} can’t come in today. Please pick a new time.</p>}
          <button className="btn" disabled={busy} onClick={change}>Change or cancel</button>
        </div>
      )}
      {me.state === 'removed' && me.booking?.status === 'cancelled' && <div className="verdict"><h1 className="phone-h">Booking cancelled</h1><p>Your {me.booking.service} at {clock(me.booking.start_min)} is cancelled. Nothing more will be sent to you.</p></div>}
      {me.state === 'removed' && me.booking?.status !== 'cancelled' && <div className="verdict"><h1 className="phone-h">You left the waitlist</h1><p>Nothing more will be sent to you.</p></div>}

      {open.length > 0 && (
        <section className="bubble">
          <p><strong>A slot is open for you</strong></p>
          {open.map((o) => (
            <a key={o.id} className="btn is-primary" href={`#/o/${o.id}`}>{span(o.start_min, o.minutes)} · reply by {o.expires_min != null ? clock(o.expires_min) : 'soon'}</a>
          ))}
        </section>
      )}

      {me.state === 'waiting' && (
        <section className={`presence-card ${me.consent ? 'is-in' : 'is-out'}`} aria-label="Messages">
          <p className="overline">Messages</p>
          <p className="presence-state">{me.consent ? 'You get a message when a slot opens' : me.consent === false ? 'No messages; check this page' : 'You have not chosen yet'}</p>
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

      <footer className="phone-foot">
        <p><Icon name="shield" size={14} /> Only you can open this page. Keep the link private.</p>
        <p>Synthetic demo. No real message is ever sent.</p>
      </footer>
    </main>
  )
}
