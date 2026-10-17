// A client's account: every place they have joined, on any device. Their place in each queue,
// offers waiting for them (each opens the offer page), their booking, and past visits.
// They join a new place with the code it shows at the counter.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { rpc } from './api'
import { signOut } from './auth.ts'
import type { Book } from './desk/common'
import { SlotDial } from './Dial'
import { Icon, clock, span } from './ui'

interface Entry {
  ws: string; id: string; salon: string; business_type: string | null; join_code: string | null; now_min: number
  state: 'waiting' | 'booked' | 'removed'; service: string | null; minutes: number; consent: boolean | null; place: number
  offers: { id: string; start_min: number; minutes: number; expires_min: number | null }[]
  booking: { status: 'confirmed' | 'cancelled'; start_min: number; minutes: number; service: string | null; stylist: string | null; stylist_present: boolean | null } | null
  history: { day: string; start_min: number; minutes: number; service: string | null; staff: string | null }[]
}

export default function ClientHome({ book }: { book: Book }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [code, setCode] = useState('')
  const name = book.profile?.name ?? ''

  const load = useCallback(async () => {
    try { setEntries(await rpc<Entry[]>('my_entries', {})); setOffline(false) } catch { setOffline(true) }
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(() => !document.hidden && load(), 4000)
    return () => clearInterval(t)
  }, [load])

  const join = (ev: FormEvent) => {
    ev.preventDefault()
    const c = code.trim().toLowerCase().replace(/.*#\/join\//, '')
    if (/^[0-9a-f]{8}$/.test(c)) location.hash = `#/join/${c}`
  }
  const booked = (entries ?? []).filter((e) => e.booking?.status === 'confirmed')
  const offers = (entries ?? []).flatMap((e) => e.offers.map((o) => ({ ...o, salon: e.salon })))
  const visits = (entries ?? []).flatMap((e) => e.history.map((h) => ({ ...h, salon: e.salon })))
    .sort((a, b) => b.day.localeCompare(a.day) || b.start_min - a.start_min)

  return (
    <main className="phone client-home">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{(name || book.profile?.email || 'R').slice(0, 1).toUpperCase()}</span>
        <span><strong>{name || 'Your account'}</strong><small>{book.profile?.email}</small></span>
      </header>

      <div>
        <p className="overline">Your places</p>
        <h1 className="phone-h">{offers.length ? `${offers.length === 1 ? 'A time opened' : `${offers.length} times opened`} for you` : booked.length ? 'You’re booked' : entries?.length ? 'You’re on the list' : 'Join your first place'}</h1>
        <p className="quiet">{entries?.length ? 'Everything you’ve joined, in one place. Offers appear here the moment a time opens.' : 'Ask the place you visit for its sign-up code, or scan the code at its counter.'}</p>
      </div>

      {offers.length > 0 && (
        <section className="phone-acts" aria-label="Open offers">
          {offers.map((o) => <a key={o.id} className="btn is-primary is-big" href={`#/o/${o.id}`}>{o.salon.split(',')[0]} · {clock(o.start_min)}{o.expires_min != null ? ` · reply by ${clock(o.expires_min)}` : ''}</a>)}
        </section>
      )}

      {booked[0]?.booking && (
        <SlotDial segs={[{ start: booked[0].booking.start_min, minutes: booked[0].booking.minutes, kind: booked[0].booking.stylist_present === false ? 'risk' : 'refilled' }]}
          now={booked[0].now_min} big={clock(booked[0].booking.start_min)} small={`${booked[0].salon.split(',')[0]} · ${booked[0].booking.stylist ?? ''}`}
          label={`Booked at ${booked[0].salon}: ${span(booked[0].booking.start_min, booked[0].booking.minutes)}`} />
      )}

      {entries === null ? <p className="quiet">{offline ? 'No connection. Retrying…' : 'Opening your places…'}</p> : entries.length > 0 && (
        <ul className="rows">
          {entries.map((e) => (
            <li key={`${e.ws}-${e.id}`} className="my-slot place">
              <span className="avatar-sm" aria-hidden="true">{e.salon.slice(0, 1)}</span>
              <span className="my-slot-main">
                <strong>{e.salon}</strong>
                <small>{e.booking?.status === 'confirmed' ? `${e.booking.service ?? 'Booked'} · ${span(e.booking.start_min, e.booking.minutes)} with ${e.booking.stylist}`
                  : e.state === 'waiting' ? `Number ${e.place} for ${e.service ?? 'an appointment'}${e.consent ? '' : ' · messages off'}`
                  : e.state === 'removed' ? 'You left this list' : e.service ?? ''}</small>
              </span>
              <span className={`tag ${e.offers.length ? 'is-beat' : e.booking?.status === 'confirmed' ? 'is-act' : ''}`}>{e.offers.length ? 'Offer' : e.booking?.status === 'confirmed' ? 'Booked' : e.state === 'waiting' ? 'Waiting' : 'Left'}</span>
            </li>
          ))}
        </ul>
      )}

      <form className="join-code" onSubmit={join}>
        <label className="field">Join a place<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Its 8-letter code or sign-up link" autoComplete="off" /></label>
        <button className="btn" type="submit" disabled={!/^[0-9a-f]{8}$/i.test(code.trim().replace(/.*#\/join\//, ''))}><Icon name="arrow" /> Join</button>
      </form>

      {visits.length > 0 && (
        <section aria-label="Past visits">
          <p className="overline">Past visits</p>
          <ul className="rows">
            {visits.map((h, i) => (
              <li key={i} className="my-slot">
                <span className="mono">{clock(h.start_min)}</span>
                <span className="my-slot-main"><strong>{h.service ?? 'Appointment'} · {h.salon.split(',')[0]}</strong><small>{new Date(`${h.day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{h.staff ? ` · ${h.staff}` : ''}</small></span>
                <span className="tag">Visited</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="phone-foot">
        <p><button className="link" onClick={signOut}>Sign out</button></p>
        <p><Icon name="shield" size={14} /> Each place sees only your sign-up with them, never your other places.</p>
      </footer>
    </main>
  )
}
