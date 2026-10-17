// The waitlist: who is waiting, in order, and whether each person said yes to messages.
// Nobody without a yes is ever offered anything; the database checks it again at booking.
import { useState, type FormEvent } from 'react'
import { servicesOf, type DbEntry } from '../api'
import { Icon, Modal, Select, clock, money } from '../ui'
import { Num } from '../motion'
import { plural, useRun, type Book, type Run } from './common'

export default function Waitlist({ book }: { book: Book }) {
  const st = book.state!
  const run = useRun(book)
  const [adding, setAdding] = useState(false)
  const waiting = st.waitlist.filter((e) => e.status === 'waiting')
  const booked = st.waitlist.filter((e) => e.status === 'booked')
  const yes = waiting.filter((e) => e.consent === true).length
  const no = waiting.filter((e) => e.consent === false).length

  const setConsent = (e: DbEntry, v: boolean | null) =>
    run<{ ok: boolean; revoked_offers: number }>('set_consent', { p_entry: e.id, p_consent: v, p_source: 'front desk' }, (r) =>
      v === true ? `${e.name} said yes to messages.` : `${e.name} will not be messaged${r.revoked_offers ? `; ${plural(r.revoked_offers, 'open offer')} withdrawn` : ''}.`)

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="overline">Front desk · waitlist</p>
          <h1>{plural(waiting.length, 'person', 'people')} waiting</h1>
          <p>{yes} said yes to messages. The rest are never contacted until they say yes; clients can also join themselves from the sign-up code.</p>
        </div>
        <button className="btn is-primary" onClick={() => setAdding(true)}><Icon name="plus" /> Add someone</button>
      </header>

      <section className="group wl-consent" aria-label="Consent">
        <div className="consent-bar" role="img" aria-label={`${yes} may be messaged, ${no} said no, ${waiting.length - yes - no} not asked`}>
          <span className="is-yes" style={{ flex: yes || 0.0001 }} /><span className="is-no" style={{ flex: no || 0.0001 }} /><span className="is-unknown" style={{ flex: waiting.length - yes - no || 0.0001 }} />
        </div>
        <dl className="figs is-three">
          <div className="is-act"><dt>May be messaged</dt><dd><Num value={yes} /></dd></div>
          <div><dt>Said no</dt><dd><Num value={no} /></dd></div>
          <div><dt>Not asked yet</dt><dd><Num value={waiting.length - yes - no} /></dd></div>
        </dl>
      </section>

      <section className="group" aria-label="Waiting">
        <div className="wl-axis" aria-hidden="true"><span>Free, 10:00 to 20:00</span></div>
        <ol className="rows">
          {waiting.map((e) => (
            <li key={e.id} className="wl-row">
              <span className="wl-pos">{e.pos}</span>
              <span className="wl-main">
                <strong>{e.name}{e.source === 'self sign-up' && <span className="tag">signed up</span>}</strong>
                <small>{e.service} · {e.minutes} min</small>
              </span>
              <Window e={e} />
              <span className="consent" role="group" aria-label={`${e.name}: may we message them?`}>
                {([[true, 'Yes', 'is-yes'], [false, 'No', 'is-no'], [null, '?', '']] as const).map(([v, t, c]) => (
                  <button key={t} className={`${e.consent === v ? 'is-on' : ''} ${c}`} aria-pressed={e.consent === v}
                    onClick={() => e.consent !== v && setConsent(e, v)} title={v === null ? 'Not asked yet' : v ? 'Said yes to messages' : 'Said no to messages'}>{t}</button>
                ))}
              </span>
            </li>
          ))}
          {waiting.length === 0 && <li className="quiet" style={{ padding: '12px 0' }}>Nobody is waiting.</li>}
        </ol>
      </section>

      {booked.length > 0 && (
        <section className="group" aria-label="Booked from the waitlist">
          <div className="group-head"><h2>Booked from the waitlist</h2></div>
          <ul className="rows">
            {booked.map((e) => (
              <li key={e.id} className="wl-row is-booked">
                <span className="wl-pos">{e.pos}</span>
                <span className="wl-main"><strong>{e.name}</strong><small>{e.service} · {e.minutes} min</small></span>
                <span className="tag is-act">Booked</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adding && <Modal title="Add to the waitlist" onClose={() => setAdding(false)}><AddEntry run={run} services={servicesOf(st)} onDone={() => setAdding(false)} /></Modal>}
    </div>
  )
}

// When this person is free, on the same 10:00 to 20:00 scale as the day.
function Window({ e }: { e: DbEntry }) {
  const from = Math.max(600, e.free_from ?? 600)
  const until = Math.min(1200, e.free_until ?? 1200)
  const any = e.free_from == null && e.free_until == null
  const at = (m: number) => `${((m - 600) / 600) * 100}%`
  return (
    <span className={`wl-win ${any ? 'is-any' : ''}`}>
      <span className="wl-track"><i style={{ left: at(from), width: `calc(${at(until)} - ${at(from)})` }} /></span>
      <small className="mono">{any ? 'any time' : `${clock(e.free_from ?? 600)}–${clock(Math.min(e.free_until ?? 1200, 1439))}`}</small>
    </span>
  )
}

function AddEntry({ run, services, onDone }: { run: Run; services: ReturnType<typeof servicesOf>; onDone: () => void }) {
  const [name, setName] = useState('')
  const [service, setService] = useState(services[0]?.id ?? '')
  const [consent, setConsent] = useState<'yes' | 'no' | 'unknown'>('unknown')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const sv = services.find((s) => s.id === service)
    if (!name.trim()) return setErr('Write the client’s name.')
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
      <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={60} /></label>
      <label className="field">Service
        <Select value={service} onChange={setService} label="Service"
          choices={services.map((s) => ({ value: s.id, label: s.name, hint: `${s.minutes} min${s.price_inr != null ? ` · ${money(s.price_inr)}` : ''}` }))} />
      </label>
      <fieldset className="seg"><legend>May we message them when a slot opens?</legend>
        {(['yes', 'no', 'unknown'] as const).map((c) => (
          <label key={c} className={consent === c ? 'is-on' : ''}><input type="radio" name="consent" checked={consent === c} onChange={() => setConsent(c)} />{c === 'unknown' ? 'Not asked' : c === 'yes' ? 'Yes' : 'No'}</label>
        ))}
      </fieldset>
      <div className="field-row">
        <label className="field">Free from<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field">Until<input type="time" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn is-primary is-big" type="submit">Add to waitlist</button>
    </form>
  )
}
