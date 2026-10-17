// A client arrives from a business's code or link. The first thing they can do is book a time
// that is open today. If nothing fits, the waitlist is the next step, and saying no is fine too.
// Consent for the waitlist is an explicit choice with nothing pre-selected; the database refuses
// a sign-up without one.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { demoDay } from './day'
import { rpc } from './rpc.ts'
import { readSession } from './auth.ts'
import { Mark, clock, money } from './ui'

const toM = (t: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null)
type Time = { staff: string; name: string; start_min: number; slot: string | null }
const NOT_BOOKED: Record<string, string> = {
  TAKEN: 'Someone took that time a moment ago. Pick another.',
  TRY_AGAIN: 'Someone booked at the same moment. Tap Book again.',
  TOO_SOON: 'That time is too close now. Pick a later one.',
  TARGET_ABSENT: 'That person is out today now. Pick another time.',
  RATE_LIMITED: 'Too many tries from this network. Wait a minute and try again.',
}

export default function Join({ code }: { code: string }) {
  const sample = useMemo(() => demoDay().services, [])
  const [own, setOwn] = useState<typeof sample>([])
  const services = own.length ? own : sample
  const [salon, setSalon] = useState<string | null>(null)
  const [cap, setCap] = useState<number | null>(null)
  const [demo, setDemo] = useState(false)
  const [missing, setMissing] = useState(false)
  // A signed-in client's name is already known; anyone else types it.
  const [name, setName] = useState(() => { try { return readSession() ? localStorage.getItem('refill.name') ?? '' : '' } catch { return '' } })
  const [service, setService] = useState('')
  const [mode, setMode] = useState<'book' | 'wait' | 'no'>('book')
  const [times, setTimes] = useState<Time[] | null>(null)
  const [pick, setPick] = useState<Time | null>(null)
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [consent, setConsent] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sv = services.find((s) => s.id === service)

  useEffect(() => {
    rpc<{ ok: boolean; salon?: string; max_offers?: number; kind?: string; services?: typeof sample }>('join_info', { p_code: code })
      .then((r) => {
        if (!r.ok) return setMissing(true)
        setSalon(r.salon!); setCap(r.max_offers ?? null); setOwn(r.services ?? []); setDemo(r.kind !== 'live')
        if (r.services?.length === 1) setService(r.services[0].id)
      }, () => setMissing(true))
  }, [code])

  // Open times for the chosen service, refreshed while the page is open.
  useEffect(() => {
    setPick(null)
    if (!sv) { setTimes(null); return }
    let alive = true
    const load = () => rpc<{ ok: boolean; times: Time[] }>('open_times', { p_code: code, p_minutes: sv.minutes, p_skill: sv.skill })
      .then((r) => { if (alive) setTimes(r.times) }, () => { if (alive) setTimes([]) })
    setTimes(null)
    load()
    const t = setInterval(() => !document.hidden && load(), 15000)
    return () => { alive = false; clearInterval(t) }
  }, [code, sv])

  // One chip per start time; the first person free then takes it unless the client picks someone.
  const starts = useMemo(() => [...new Map((times ?? []).map((t) => [t.start_min, t])).values()], [times])
  const withWhom = pick ? (times ?? []).filter((t) => t.start_min === pick.start_min) : []

  const book = async () => {
    if (!name.trim()) return setErr('Write your name.')
    if (!sv || !pick) return setErr('Pick a time.')
    setErr(null)
    setBusy(true)
    try {
      const r = await rpc<{ ok: boolean; token?: string; code?: string }>('book_time', {
        p_code: code, p_staff: pick.staff, p_start: pick.start_min,
        p_entry: { name: name.trim(), service: sv.name, minutes: sv.minutes, skill: sv.skill, price_inr: sv.price_inr },
      })
      if (r.ok) { location.hash = `#/me/${r.token}`; return }
      setErr(NOT_BOOKED[r.code ?? ''] ?? `Could not book: ${r.code}`)
      const fresh = await rpc<{ times: Time[] }>('open_times', { p_code: code, p_minutes: sv.minutes, p_skill: sv.skill }).catch(() => null)
      if (fresh) { setTimes(fresh.times); setPick(null) }
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }

  const wait = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!name.trim()) return setErr('Write your name.')
    if (!sv) return setErr('Pick the service you want.')
    if (consent === null) return setErr('Choose whether we may message you. Nothing is ticked for you.')
    const f = toM(from)
    const u = toM(until)
    if (f != null && u != null && u - f < sv.minutes) return setErr(`That window is shorter than a ${sv.minutes}-minute ${sv.name}.`)
    setErr(null)
    setBusy(true)
    try {
      const r = await rpc<{ ok: boolean; token?: string; code?: string }>('join_waitlist', {
        p_code: code,
        p_entry: { name: name.trim(), service: sv.name, minutes: sv.minutes, skill: sv.skill, price_inr: sv.price_inr, consent, free_from: f, free_until: u },
      })
      if (!r.ok) setErr(`Could not join: ${r.code}`)
      else location.hash = `#/me/${r.token}`
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }

  if (missing) return <main className="phone"><Mark /><h1 className="phone-h">This sign-up link is not active</h1><p className="quiet">Ask the business for its current code.</p></main>
  if (!salon) return <main className="phone"><p className="quiet">Opening the booking page…</p></main>

  const none = times !== null && times.length === 0
  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{salon.slice(0, 1)}</span>
        <span><strong>{salon}</strong><small>{mode === 'wait' ? 'join the waitlist' : 'book a time'}</small></span>
      </header>

      {mode === 'no' ? (
        <div className="verdict">
          <h1 className="phone-h">No problem</h1>
          <p>Nothing was booked and nobody will message you. Scan the code again any time.</p>
          <button className="btn" onClick={() => setMode('book')}>Look at times again</button>
        </div>
      ) : <>
        <div className="phone-lead">
          <h1 className="phone-h">{mode === 'wait' ? 'Get the next time that fits' : 'Book a time today'}</h1>
          <p className="quiet">{mode === 'wait'
            ? `When someone cancels, ${salon} can offer you their time if it suits your service and your hours.`
            : 'Pick a service and a time. If nothing fits, join the waitlist and get offered the next opening.'}</p>
        </div>

        <div className="phone-body">
        <form className="join" onSubmit={mode === 'wait' ? wait : (e) => { e.preventDefault(); book() }} noValidate>
          <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} /></label>
          <label>Service
            <select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">Choose a service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.minutes} min{s.price_inr != null ? ` · ${money(s.price_inr)}` : ''}</option>)}
            </select>
          </label>

          {mode === 'book' && sv && (
            <section className="book-times" aria-label="Open times today">
              <p className="overline">{times === null ? 'Finding open times…' : none ? 'Nothing open today' : `Open today · ${starts.length} time${starts.length === 1 ? '' : 's'}`}</p>
              {starts.length > 0 && (
                <div className="time-chips" role="group" aria-label="Pick a time">
                  {starts.map((t) => (
                    <button key={t.start_min} type="button" className={`time-chip ${pick?.start_min === t.start_min ? 'is-on' : ''} ${t.slot ? 'is-gap' : ''}`}
                      aria-pressed={pick?.start_min === t.start_min} onClick={() => setPick(t)}>{clock(t.start_min)}</button>
                  ))}
                </div>
              )}
              {pick && withWhom.length > 1 && (
                <label>With
                  <select value={pick.staff} onChange={(e) => setPick(withWhom.find((t) => t.staff === e.target.value) ?? pick)}>
                    {withWhom.map((t) => <option key={t.staff} value={t.staff}>{t.name}</option>)}
                  </select>
                </label>
              )}
              {none && <p className="quiet">Every time for a {sv.name.toLowerCase()} is taken today. Join the waitlist and {salon} can offer you a time the moment someone cancels.</p>}
            </section>
          )}

          {mode === 'wait' && <>
            <div className="add-times">
              <label>Free from (optional)<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label>Until (optional)<input type="time" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
            </div>
            <fieldset className="consent-choice">
              <legend>May {salon} message you when a time opens?</legend>
              <label className={consent === true ? 'is-on' : ''}>
                <input type="radio" name="consent" checked={consent === true} onChange={() => setConsent(true)} />
                <strong>Yes, message me</strong><small>One message per opening{cap ? `, at most ${cap} a day` : ''}. Stop any time.</small>
              </label>
              <label className={consent === false ? 'is-on' : ''}>
                <input type="radio" name="consent" checked={consent === false} onChange={() => setConsent(false)} />
                <strong>No messages</strong><small>You stay on the waitlist, but you won’t be offered times until you switch messages on from your page.</small>
              </label>
            </fieldset>
          </>}

          {err && <p className="err" role="alert">{err}</p>}
          <div className="phone-acts">
            {mode === 'book' && !none && (
              <button className="btn is-primary is-big" type="submit" disabled={busy || !pick}>{pick ? `Book ${clock(pick.start_min)} with ${pick.name}` : sv ? 'Pick a time' : 'Choose a service'}</button>
            )}
            {mode === 'book' && (none
              ? <><button type="button" className="btn is-primary is-big" onClick={() => { setErr(null); setMode('wait') }}>Join the waitlist</button>
                  <button type="button" className="link" onClick={() => setMode('no')}>Not now</button></>
              : <button type="button" className="link" onClick={() => { setErr(null); setMode('wait') }}>None of these suit you? Join the waitlist</button>)}
            {mode === 'wait' && <>
              <button className="btn is-primary is-big" type="submit" disabled={busy}>Join the waitlist</button>
              <button type="button" className="link" onClick={() => { setErr(null); setMode('book') }}>Back to open times</button>
            </>}
          </div>
          {mode === 'wait' && <p className="quiet small">We record when and how you answered. You can change it or leave from your page.</p>}
        </form>
        </div>
      </>}
      {demo && <footer className="phone-foot"><p>Synthetic demo. No real message is ever sent.</p></footer>}
    </main>
  )
}
