// A new business sets itself up: what it offers and who does it. Any kind of appointment
// business works: a salon, a clinic, a tutor, a gaming parlour run by its owner alone. Nothing
// here is sample data; the demo is one tap away for anyone who wants to look around first.
import { useState, type FormEvent } from 'react'
import { skillOf } from './api'
import type { Book } from './desk/common'
import { Icon } from './ui'

const TYPES = ['Salon', 'Spa', 'Clinic', 'Tuition', 'Fitness', 'Other']
const toMin = (t: string) => (/^\d\d:\d\d$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : NaN)
const CODES: Record<string, string> = {
  INVALID_VALUE: 'Something is out of range. Names up to 60 letters, services 5 to 720 minutes, a shift that ends after it starts.',
  MISSING_FIELD: 'A name is missing.',
  RATE_LIMITED: 'Too many tries from this network. Wait a minute and try again.',
}

type Service = { name: string; minutes: string; price: string }
type Person = { name: string; from: string; until: string; does: number[] }

export default function Setup({ book }: { book: Book }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('Salon')
  const [other, setOther] = useState('')
  const [services, setServices] = useState<Service[]>([{ name: '', minutes: '60', price: '' }])
  const [team, setTeam] = useState<Person[]>([{ name: '', from: '10:00', until: '19:00', does: [0] }])
  // Just me: the owner is the only one who takes appointments, so there is no team to list.
  const [solo, setSolo] = useState(true)
  const [hours, setHours] = useState({ from: '10:00', until: '19:00' })
  const me = book.profile?.name?.trim() || 'Me'
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setService = (i: number, v: Partial<Service>) => setServices(services.map((x, j) => (j === i ? { ...x, ...v } : x)))
  const setPerson = (i: number, v: Partial<Person>) => setTeam(team.map((x, j) => (j === i ? { ...x, ...v } : x)))
  const dropService = (i: number) => {
    setServices(services.filter((_, j) => j !== i))
    setTeam(team.map((p) => ({ ...p, does: p.does.filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)) })))
  }
  const addService = () => {
    setServices([...services, { name: '', minutes: '30', price: '' }])
    setTeam(team.map((p) => ({ ...p, does: [...p.does, services.length] })))
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const list = services.map((s) => ({ ...s, name: s.name.trim() }))
    if (!name.trim()) return setErr('Write the name of your business.')
    if (list.some((s) => !s.name)) return setErr('Give every service a name, or remove the empty one.')
    if (list.some((s) => !(Number(s.minutes) >= 5 && Number(s.minutes) <= 720))) return setErr('Each service takes 5 to 720 minutes.')
    const people = solo ? [{ name: me, from: hours.from, until: hours.until, does: list.map((_, k) => k) }] : team
    if (people.some((p) => !p.name.trim())) return setErr('Give every team member a name, or remove the empty one.')
    if (people.some((p) => !(toMin(p.from) < toMin(p.until)))) return setErr('Each working day must end after it starts.')
    if (people.some((p) => p.does.length === 0)) return setErr('Tick at least one service for each team member.')
    setErr(null)
    setBusy(true)
    try {
      const code = await book.createBusiness({
        name: name.trim(), type: type === 'Other' ? other.trim() || 'Other' : type,
        services: list.map((s) => ({ name: s.name, minutes: Number(s.minutes), skill: skillOf(s.name), price_inr: s.price ? Number(s.price) : null })),
        staff: people.map((p) => ({ name: p.name.trim(), shift_start: toMin(p.from), shift_end: toMin(p.until), skills: [...new Set(p.does.map((k) => skillOf(list[k].name)))] })),
      })
      if (code) setErr(CODES[code] ?? `The database refused it: ${code}`)
      else location.hash = '#/'
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }

  return (
    <main className="page is-narrow">
      <form className="stack setup" onSubmit={submit} noValidate>
        <header className="page-head">
          <div>
            <p className="overline">Set up</p>
            <h1>Your business, ready in a minute</h1>
            <p>Add what you offer and who does it. Clients book an open time from your code, or join your waitlist when nothing fits. When someone cancels, Refill offers the time to the next person who fits and said yes to messages.</p>
          </div>
        </header>

        <section className="group" aria-label="Your business">
          <div className="group-head"><h2>Your business</h2></div>
          <div className="add">
            <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="organization" placeholder="For example, Kesar Salon" /></label>
            <fieldset className="seg"><legend>What kind of business</legend>
              {TYPES.map((t) => <label key={t} className={type === t ? 'is-on' : ''}><input type="radio" name="type" checked={type === t} onChange={() => setType(t)} />{t}</label>)}
            </fieldset>
            {type === 'Other' && <label className="field">Describe it<input value={other} onChange={(e) => setOther(e.target.value)} maxLength={40} placeholder="For example, Physiotherapy" /></label>}
          </div>
        </section>

        <section className="group" aria-label="Services">
          <div className="group-head"><h2>What you offer</h2><p>How long each takes decides which open times it fits.</p></div>
          <ul className="rows setup-rows">
            {services.map((s, i) => (
              <li key={i} className="setup-service">
                <label className="field">Service<input value={s.name} onChange={(e) => setService(i, { name: e.target.value })} maxLength={60} placeholder={i === 0 ? 'For example, Haircut' : ''} /></label>
                <label className="field">Minutes<input type="number" inputMode="numeric" min={5} max={720} value={s.minutes} onChange={(e) => setService(i, { minutes: e.target.value })} /></label>
                <label className="field">Price, ₹<input type="number" inputMode="numeric" min={0} value={s.price} onChange={(e) => setService(i, { price: e.target.value })} placeholder="Optional" /></label>
                {services.length > 1 && <button type="button" className="icon-btn" onClick={() => dropService(i)} aria-label={`Remove ${s.name || 'this service'}`}><Icon name="x" /></button>}
              </li>
            ))}
          </ul>
          <button type="button" className="btn is-quiet" onClick={addService}><Icon name="plus" /> Add a service</button>
        </section>

        <section className="group" aria-label="Team">
          <div className="group-head"><h2>Who does it</h2><p>Nobody is booked outside their hours or for a service they don’t do.</p></div>
          <div className="seg day-view" role="group" aria-label="Who takes appointments">
            <button type="button" className={solo ? 'is-on' : ''} aria-pressed={solo} onClick={() => setSolo(true)}><Icon name="user" size={16} />Just me</button>
            <button type="button" className={solo ? '' : 'is-on'} aria-pressed={!solo} onClick={() => setSolo(false)}><Icon name="users" size={16} />Me and a team</button>
          </div>
          {solo ? (
            <div className="add">
              <div className="add-times">
                <label className="field">You open at<input type="time" value={hours.from} onChange={(e) => setHours({ ...hours, from: e.target.value })} /></label>
                <label className="field">You close at<input type="time" value={hours.until} onChange={(e) => setHours({ ...hours, until: e.target.value })} /></label>
              </div>
              <p className="quiet small">You take every booking yourself, for every service. Add staff any time from Team.</p>
            </div>
          ) : <>
          <ul className="rows setup-rows">
            {team.map((p, i) => (
              <li key={i} className="setup-person">
                <div className="setup-person-top">
                  <label className="field">Name<input value={p.name} onChange={(e) => setPerson(i, { name: e.target.value })} maxLength={60} placeholder={i === 0 ? 'For example, Riya' : ''} /></label>
                  <label className="field">From<input type="time" value={p.from} onChange={(e) => setPerson(i, { from: e.target.value })} /></label>
                  <label className="field">Until<input type="time" value={p.until} onChange={(e) => setPerson(i, { until: e.target.value })} /></label>
                  {team.length > 1 && <button type="button" className="icon-btn" onClick={() => setTeam(team.filter((_, j) => j !== i))} aria-label={`Remove ${p.name || 'this person'}`}><Icon name="x" /></button>}
                </div>
                <div className="chips" role="group" aria-label={`Services ${p.name || 'this person'} does`}>
                  {services.map((s, k) => (
                    <button key={k} type="button" className={p.does.includes(k) ? 'is-on' : ''} aria-pressed={p.does.includes(k)}
                      onClick={() => setPerson(i, { does: p.does.includes(k) ? p.does.filter((x) => x !== k) : [...p.does, k] })}>
                      {s.name.trim() || `Service ${k + 1}`}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn is-quiet" onClick={() => setTeam([...team, { name: '', from: '10:00', until: '19:00', does: services.map((_, k) => k) }])}><Icon name="plus" /> Add a person</button>
          </>}
        </section>

        <div className="setup-go">
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn is-primary is-big" type="submit" disabled={busy}>{busy ? 'Opening…' : 'Open my desk'}</button>
          <button type="button" className="link" onClick={() => book.setMode('demo')}>Look around the demo first</button>
        </div>
      </form>
    </main>
  )
}
