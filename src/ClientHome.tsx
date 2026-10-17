// A client's account: every place they have joined, on any device. Their place in each queue,
// offers waiting for them (each opens the offer page), their booking, and past visits.
// They join a new place from the directory or with the code it shows at the counter, and can
// change, cancel, leave or switch messages for any place from here, on any device.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { rpc } from './api'
import { signOut } from './auth.ts'
import type { Book } from './desk/common'
import { SlotDial } from './Dial'
import { DirectoryList } from './Directory'
import { readPlaces } from './Me'
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
  // Places joined on this device before signing in belong to this account from now on.
  useEffect(() => {
    const tokens = readPlaces().map((p) => p.token).slice(0, 50)
    if (tokens.length) rpc('claim_entries', { p_tokens: tokens }).then(load, () => {})
  }, [load])

  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const act = async (e: Entry, fn: 'my_entry_move' | 'my_entry_leave' | 'my_entry_consent', extra: Record<string, unknown> = {}) => {
    setBusy(`${e.ws}-${e.id}`)
    setMsg(null)
    try {
      const r = await rpc<{ ok: boolean; code?: string; move?: string }>(fn, { p_ws: e.ws, p_entry: e.id, ...extra })
      if (!r.ok) setMsg(`That did not go through (${r.code}).`)
      else if (r.move) location.hash = `#/m/${r.move}`
      await load()
    } catch (err) { setMsg((err as Error).message) }
    setBusy(null)
  }
  const [leaving, setLeaving] = useState<string | null>(null)

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

      <div className="phone-lead">
      <div>
        <p className="overline">Your places</p>
        <h1 className="phone-h">{offers.length ? `${offers.length === 1 ? 'A time opened' : `${offers.length} times opened`} for you` : booked.length ? 'You’re booked' : entries?.length ? 'You’re on the list' : 'Join your first place'}</h1>
        <p className="quiet">{entries?.length ? 'Everything you’ve joined, in one place. Offers appear here the moment a time opens.' : 'Find a place below, or use the code at its counter.'}</p>
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

      </div>

      <div className="phone-body">
      {entries === null ? <p className="quiet">{offline ? 'No connection. Retrying…' : 'Opening your places…'}</p> : entries.length > 0 && (
        <ul className="rows">
          {entries.map((e) => {
            const k = `${e.ws}-${e.id}`
            const b = e.booking
            const confirmed = b?.status === 'confirmed'
            const cancelled = e.state === 'removed' && b?.status === 'cancelled'
            const out = confirmed && b.stylist_present === false
            return (
            <li key={k} className="my-slot place">
              <span className="avatar-sm" aria-hidden="true">{e.salon.slice(0, 1)}</span>
              <span className="my-slot-main">
                <strong>{e.salon}</strong>
                <small>{confirmed ? `${b.service ?? 'Booked'} · ${span(b.start_min, b.minutes)} with ${b.stylist}`
                  : cancelled ? `Your ${b.service ?? 'appointment'} at ${clock(b.start_min)} was cancelled`
                  : e.state === 'waiting' ? `Number ${e.place} for ${e.service ?? 'an appointment'}${e.consent ? '' : ' · messages off, so no offers'}`
                  : e.state === 'removed' ? 'You left this list' : e.service ?? ''}</small>
                {out && <small className="risk-text">{b.stylist} can’t come in today. Pick a new time.</small>}
              </span>
              <span className={`tag ${e.offers.length ? 'is-beat' : out ? 'is-risk' : confirmed ? 'is-act' : ''}`}>{e.offers.length ? 'Offer' : out ? 'Move' : confirmed ? 'Booked' : cancelled ? 'Cancelled' : e.state === 'waiting' ? 'Waiting' : 'Left'}</span>
              {(confirmed || e.state === 'waiting') && (
                <span className="place-acts">
                  {confirmed && <button className={`btn ${out ? 'is-primary' : ''}`} disabled={busy === k} onClick={() => act(e, 'my_entry_move')}>{out ? 'Pick a new time' : 'Change or cancel'}</button>}
                  {e.state === 'waiting' && <button className="btn is-quiet" disabled={busy === k} onClick={() => act(e, 'my_entry_consent', { p_consent: !e.consent })}>{e.consent ? 'Stop messages' : 'Yes, message me'}</button>}
                  {e.state === 'waiting' && (leaving === k
                    ? <><button className="btn is-danger" disabled={busy === k} onClick={() => { setLeaving(null); act(e, 'my_entry_leave') }}>Yes, leave</button><button className="link" onClick={() => setLeaving(null)}>Stay</button></>
                    : <button className="link" onClick={() => setLeaving(k)}>Leave this list</button>)}
                </span>
              )}
            </li>
            )
          })}
        </ul>
      )}

      {msg && <p className="err" role="alert">{msg}</p>}

      <DirectoryList joined={(entries ?? []).filter((e) => e.state !== 'removed').map((e) => e.join_code ?? '')} />

      <form className="join-code" onSubmit={join}>
        <label className="field">Or join with a code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Its 8-letter code or sign-up link" autoComplete="off" /></label>
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

      </div>

      <footer className="phone-foot">
        <p><button className="link" onClick={signOut}>Sign out</button></p>
        <p><Icon name="shield" size={14} /> Each place sees only your sign-up with them, never your other places.</p>
      </footer>
    </main>
  )
}
