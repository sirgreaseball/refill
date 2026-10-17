// A customer joins the waitlist themselves. Consent is an explicit choice with nothing
// pre-selected; the database refuses a sign-up without one.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { demoDay } from './day'
import { rpc } from './rpc.ts'
import { Mark, money } from './ui'

const toM = (t: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null)

export default function Join({ code }: { code: string }) {
  const sample = useMemo(() => demoDay().services, [])
  const [own, setOwn] = useState<typeof sample>([])
  const services = own.length ? own : sample
  const [salon, setSalon] = useState<string | null>(null)
  const [cap, setCap] = useState<number | null>(null)
  const [demo, setDemo] = useState(false)
  const [missing, setMissing] = useState(false)
  const [name, setName] = useState('')
  const [service, setService] = useState('')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [consent, setConsent] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    rpc<{ ok: boolean; salon?: string; max_offers?: number; kind?: string; services?: typeof sample }>('join_info', { p_code: code })
      .then((r) => { if (!r.ok) return setMissing(true); setSalon(r.salon!); setCap(r.max_offers ?? null); setOwn(r.services ?? []); setDemo(r.kind !== 'live') }, () => setMissing(true))
  }, [code])

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const sv = services.find((s) => s.id === service)
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
  if (!salon) return <main className="phone"><p className="quiet">Opening the sign-up…</p></main>

  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{salon.slice(0, 1)}</span>
        <span><strong>{salon}</strong><small>join the waitlist</small></span>
      </header>
      <div>
        <h1 className="phone-h">Get the next slot that fits you</h1>
        <p className="quiet">When someone cancels, {salon} can offer you their slot if it suits your service and your time.</p>
      </div>

      <form className="join" onSubmit={submit} noValidate>
        <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} /></label>
        <label>Service
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Choose a service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.minutes} min{s.price_inr != null ? ` · ${money(s.price_inr)}` : ''}</option>)}
          </select>
        </label>
        <div className="add-times">
          <label>Free from (optional)<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Until (optional)<input type="time" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
        </div>

        <fieldset className="consent-choice">
          <legend>May {salon} message you when a slot opens?</legend>
          <label className={consent === true ? 'is-on' : ''}>
            <input type="radio" name="consent" checked={consent === true} onChange={() => setConsent(true)} />
            <strong>Yes, message me</strong><small>One message per opening{cap ? `, at most ${cap} a day` : ''}. Stop any time.</small>
          </label>
          <label className={consent === false ? 'is-on' : ''}>
            <input type="radio" name="consent" checked={consent === false} onChange={() => setConsent(false)} />
            <strong>No messages</strong><small>You stay on the waitlist, but you won’t be offered slots until you switch messages on from your page.</small>
          </label>
        </fieldset>

        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn is-primary is-big" type="submit" disabled={busy}>Join the waitlist</button>
        <p className="quiet small">We record when and how you answered. You can change it or leave from your page.</p>
      </form>
      {demo && <footer className="phone-foot"><p>Synthetic demo. No real message is ever sent.</p></footer>}
    </main>
  )
}
