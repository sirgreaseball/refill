// What an owner manages: the team (add, change, remove), tasks for them, the services on
// offer, and the history of every appointment. Every change goes through a database function
// that checks the owner key and refuses anything that would strand a booked client.
import { useEffect, useState, type FormEvent } from 'react'
import { servicesOf, skillOf, type DbHistory, type DbService, type DbStaff, type State } from './api'
import { kindOf, plural, staffFor, useRun, type Book, type Run } from './desk/common'
import { Icon, Modal, Select, clock, money } from './ui'

const hhmm = (m: number) => clock(Math.min(m, 1439))
const toMin = (t: string) => (/^\d\d:\d\d$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : NaN)
const NOT_SAVED: Record<string, string> = {
  INVALID_VALUE: 'Something is out of range: a name up to 60 letters, a working day that ends after it starts.',
  MISSING_FIELD: 'A name is missing.',
  OUTSIDE_SHIFT: 'Some booked clients would fall outside these hours. Move them first, or keep the hours wider.',
  TOO_LARGE: 'That is the most this business can hold.',
  NOT_FOUND: 'That is no longer there. The page has refreshed.',
}

// ---------------------------------------------------------------- the team

/** Add someone, or change their name, hours and services. Removing is two taps, and refused while they have clients ahead. */
export function StaffForm({ st, run, person, onDone }: { st: State; run: Run; person?: DbStaff; onDone: () => void }) {
  const services = servicesOf(st)
  const [name, setName] = useState(person?.name ?? '')
  const [from, setFrom] = useState(hhmm(person?.shift_start ?? 600))
  const [until, setUntil] = useState(hhmm(person?.shift_end ?? 1200))
  const [does, setDoes] = useState<Set<string>>(() => new Set(person ? person.skills : services.map((s) => s.skill)))
  const [armed, setArmed] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const skills = [...new Set(services.map((s) => s.skill))]

  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!name.trim()) return setErr('Write their name.')
    if (!(toMin(from) < toMin(until))) return setErr('Their working day must end after it starts.')
    if (does.size === 0) return setErr('Tick at least one service they do.')
    setErr(null)
    const r = await run<{ ok: boolean; code?: string; count?: number }>('save_staff', {
      p_staff: { id: person?.id, name: name.trim(), skills: [...does], shift_start: toMin(from), shift_end: toMin(until) === 1439 ? 1440 : toMin(until) },
    }, (x) => (x.ok ? (person ? `${name.trim()} updated.` : `${name.trim()} added to the team.`) : null))
    if (r && !r.ok) setErr(NOT_SAVED[r.code ?? ''] ?? `Not saved: ${r.code}`)
    else if (r) onDone()
  }
  const remove = async () => {
    if (!person) return
    if (!armed) return setArmed(true)
    const r = await run<{ ok: boolean; code?: string; count?: number; revoked_offers?: number }>('remove_staff', { p_staff: person.id },
      (x) => (x.ok ? `${person.name} removed from the team${x.revoked_offers ? `; ${plural(x.revoked_offers, 'open offer')} withdrawn` : ''}.` : null))
    if (r && !r.ok) { setArmed(false); setErr(r.code === 'HAS_BOOKINGS' ? `${person.name} still has ${plural(r.count ?? 0, 'client')} ahead today. Move or cancel them first.` : NOT_SAVED[r.code ?? ''] ?? `Not removed: ${r.code}`) }
    else if (r) onDone()
  }

  return (
    <form className="add" onSubmit={save} noValidate>
      <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" /></label>
      <div className="field-row">
        <label className="field">Works from<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field">Until<input type="time" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
      </div>
      <div className="field">Services they do
        <div className="chips" role="group" aria-label="Services they do">
          {skills.map((k) => {
            const label = services.filter((s) => s.skill === k).map((s) => s.name).join(', ')
            return <button key={k} type="button" className={does.has(k) ? 'is-on' : ''} aria-pressed={does.has(k)}
              onClick={() => { const n = new Set(does); if (n.has(k)) n.delete(k); else n.add(k); setDoes(n) }}>{label}</button>
          })}
        </div>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn is-primary is-big" type="submit">{person ? 'Save changes' : 'Add to the team'}</button>
      {person && <button type="button" className={`btn is-danger ${armed ? 'is-armed' : ''}`} onClick={remove}>{armed ? `Tap again to remove ${person.name}` : 'Remove from the team'}</button>}
    </form>
  )
}

/** Short jobs for the team: the owner writes them, the staff member ticks them off from their own link. */
export function Tasks({ book }: { book: Book }) {
  const st = book.state!
  const run = useRun(book)
  const [who, setWho] = useState(st.staff[0]?.id ?? '')
  const [text, setText] = useState('')
  const tasks = st.tasks ?? []
  const add = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!text.trim() || !who) return
    const r = await run<{ ok: boolean; code?: string }>('add_task', { p_staff: who, p_text: text.trim() }, (x) => (x.ok ? 'Task added.' : `Not added: ${x.code}`))
    if (r?.ok) setText('')
  }
  return (
    <section className="group spot" aria-label="Tasks">
      <div className="group-head"><h2>Tasks</h2><p>{tasks.filter((t) => !t.done).length} open. Staff tick them off from their own link.</p></div>
      <form className="task-add" onSubmit={add}>
        <Select value={who} onChange={setWho} label="For" choices={st.staff.map((p) => ({ value: p.id, label: p.name }))} />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="For example, restock towels" aria-label="Task" />
        <button className="btn" type="submit" disabled={!text.trim() || !who}><Icon name="plus" /> Add</button>
      </form>
      {tasks.length > 0 && (
        <ul className="rows">
          {tasks.map((t) => (
            <li key={t.id} className={`task ${t.done ? 'is-done' : ''}`}>
              <input type="checkbox" checked={t.done} onChange={() => run('set_task', { p_task: t.id, p_done: !t.done })} aria-label={`${t.done ? 'Done' : 'Open'}: ${t.text}`} />
              <span className="row-main"><strong>{t.text}</strong><small>{st.staff.find((p) => p.id === t.staff_id)?.name ?? 'Former staff member'}</small></span>
              <button className="icon-btn" onClick={() => run('remove_task', { p_task: t.id })} aria-label={`Delete task: ${t.text}`}><Icon name="x" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- services

export function Services({ book }: { book: Book }) {
  const st = book.state!
  const run = useRun(book)
  const [editing, setEditing] = useState<DbService | 'new' | null>(null)
  const own = st.services ?? []
  const shown = servicesOf(st)
  return (
    <section className="group spot" aria-label="Services">
      <div className="group-head"><h2>Services</h2>
        <button className="btn" onClick={() => setEditing('new')}><Icon name="plus" /> Add a service</button>
      </div>
      {own.length === 0 && <p className="quiet small" style={{ marginBottom: 8 }}>This demo uses the sample salon list below. Add a service to use your own list instead.</p>}
      <ul className="rows">
        {shown.map((s) => (
          <li key={s.id} className="row">
            <span className="row-main"><strong>{s.name}</strong><small>{s.minutes} min{s.price_inr != null ? ` · ${money(s.price_inr)}` : ''}</small></span>
            {own.length > 0 && <button className="btn is-quiet" onClick={() => setEditing(s)}>Edit</button>}
          </li>
        ))}
      </ul>
      {editing && <Modal title={editing === 'new' ? 'Add a service' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
        <ServiceForm run={run} service={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
      </Modal>}
    </section>
  )
}

function ServiceForm({ run, service, onDone }: { run: Run; service?: DbService; onDone: () => void }) {
  const [name, setName] = useState(service?.name ?? '')
  const [minutes, setMinutes] = useState(String(service?.minutes ?? 30))
  const [price, setPrice] = useState(service?.price_inr != null ? String(service.price_inr) : '')
  const [err, setErr] = useState<string | null>(null)
  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!name.trim()) return setErr('Write the service name.')
    if (!(Number(minutes) >= 5 && Number(minutes) <= 720)) return setErr('A service takes 5 to 720 minutes.')
    // An existing service keeps its skill, so the staff who do it still match.
    const r = await run<{ ok: boolean; code?: string }>('save_service', {
      p_service: { id: service?.id, name: name.trim(), minutes: Number(minutes), skill: service?.skill ?? skillOf(name), price_inr: price ? Number(price) : null },
    }, (x) => (x.ok ? `${name.trim()} saved.` : null))
    if (r && !r.ok) setErr(NOT_SAVED[r.code ?? ''] ?? `Not saved: ${r.code}`)
    else if (r) onDone()
  }
  const remove = async () => {
    if (!service) return
    const r = await run<{ ok: boolean }>('remove_service', { p_service: service.id }, (x) => (x.ok ? `${service.name} removed.` : null))
    if (r) onDone()
  }
  return (
    <form className="add" onSubmit={save} noValidate>
      <label className="field">Service<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" /></label>
      <div className="field-row">
        <label className="field">Minutes<input type="number" inputMode="numeric" min={5} max={720} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
        <label className="field">Price, ₹<input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Optional" /></label>
      </div>
      {!service && <p className="quiet small">New services start with nobody able to do them. Tick them for your team on the Team page.</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn is-primary is-big" type="submit">Save</button>
      {service && <button type="button" className="btn is-danger" onClick={remove}>Remove this service</button>}
    </form>
  )
}

// ---------------------------------------------------------------- history

const STATUS: Record<DbHistory['status'], string> = { booked: 'Booked', unfilled: 'Unfilled', held: 'Held, staff out' }

/** Every appointment: today's live book first, then each past day the clock has closed. */
export function History({ book }: { book: Book }) {
  const st = book.state!
  const [past, setPast] = useState<DbHistory[] | null>(null)
  const owner = st.role === 'owner'
  const act = book.act
  useEffect(() => { if (owner) act<DbHistory[]>('get_history').then(setPast, () => setPast([])) }, [owner, act, st.workspace.day])
  if (!owner) return <div className="stack"><header className="page-head"><div><p className="overline">Owner</p><h1>Owner only</h1><p>This key is the front desk’s. The database refuses the history for it.</p></div></header></div>

  const days = [...new Set((past ?? []).map((h) => h.day))]
  const today = [...st.slots].sort((a, b) => a.start_min - b.start_min || (a.staff_id ?? '').localeCompare(b.staff_id ?? ''))
  const live = st.workspace.kind === 'live'
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="overline">Owner · history</p>
          <h1>Every appointment</h1>
          <p>{live ? 'Today is live below. At midnight the day closes into this history and the book starts fresh.' : 'A demo day never closes, so only today is here. A live business keeps every past day.'}</p>
        </div>
      </header>
      <section className="group spot" aria-label="Today">
        <div className="group-head"><h2>Today{st.workspace.day ? ` · ${day(st.workspace.day)}` : ''}</h2><p>{plural(today.filter((s) => s.status === 'booked').length, 'booking')}</p></div>
        {today.length === 0 ? <p className="quiet">Nothing booked yet today. Add an appointment from the front desk.</p> : (
          <ul className="rows">
            {today.map((s) => {
              const k = kindOf(st, s)
              return (
                <li key={s.id} className="hist-row">
                  <span className="mono">{clock(s.start_min)}</span>
                  <span className="row-main"><strong>{s.customer ?? (k === 'blocked' ? 'Held' : 'Open time')}</strong><small>{s.service ?? s.skill} · {s.minutes} min · {staffFor(st, s)?.name ?? 'former staff member'}</small></span>
                  <span className={`tag ${k === 'refilled' ? 'is-act' : k === 'open' ? 'is-beat' : k === 'risk' || k === 'blocked' ? 'is-risk' : ''}`}>{k === 'refilled' ? 'Refilled' : k === 'booked' ? 'Booked' : k === 'risk' ? 'Needs moving' : k === 'blocked' ? 'Held' : k === 'lapsed' ? 'Unfilled' : 'Open'}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      {past === null && <p className="quiet">Loading past days…</p>}
      {days.map((d) => {
        const rows = past!.filter((h) => h.day === d)
        const booked = rows.filter((h) => h.status === 'booked')
        return (
          <section key={d} className="group spot" aria-label={day(d)}>
            <div className="group-head"><h2>{day(d)}</h2><p>{plural(booked.length, 'booking')} · {booked.filter((h) => h.refilled).length} refilled · {money(booked.reduce((n, h) => n + (h.price_inr ?? 0), 0))}</p></div>
            <ul className="rows">
              {rows.map((h) => (
                <li key={h.id} className="hist-row">
                  <span className="mono">{clock(h.start_min)}</span>
                  <span className="row-main"><strong>{h.customer ?? (h.status === 'held' ? 'Held' : 'Open time')}</strong><small>{h.service ?? 'Appointment'} · {h.minutes} min · {h.staff_name ?? 'staff'}</small></span>
                  <span className={`tag ${h.refilled ? 'is-act' : ''}`}>{h.refilled ? 'Refilled' : STATUS[h.status]}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {past !== null && days.length === 0 && live && <p className="quiet">No past days yet. Your first one appears here after midnight.</p>}
    </div>
  )
}

const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
