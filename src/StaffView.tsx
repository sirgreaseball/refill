// A staff member's own day, on their phone. They see their appointments (first names only)
// and can mark themselves in or out. Nothing about other staff or the waitlist.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, rpc } from './rpc.ts'
import DateCalendar from './DateCalendar'
import { businessToday, formatDate } from './calendar'
import { SlotDial } from './Dial'
import { Icon, Mark, clock, span } from './ui'

interface Day {
  salon: string
  day: string
  today: string
  scheduled_days?: string[]
  now_min: number
  staff: { id: string; name: string; skills: string[]; present: boolean }
  slots: { id: string; start_min: number; minutes: number; service: string | null; status: 'free' | 'booked' | 'blocked'; refilled: boolean; customer: string }[]
  tasks?: { id: number; text: string; done: boolean; missed?: boolean }[]
}

export default function StaffView({ ws, staff, keyStr, preview }: { ws: string; staff: string; keyStr: string; preview?: boolean }) {
  const [day, setDay] = useState<Day | null>(null)
  const [selectedDate, setSelectedDate] = useState(businessToday)
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'offline'>('loading')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const request = useRef(0)
  const revision = useRef(0)
  const appliedRevision = useRef(0)
  const invalidateRequests = useCallback(() => { request.current++ }, [])

  const load = useCallback(async () => {
    const current = request.current
    const version = ++revision.current
    try {
      let result: Day | null = null
      try {
        result = await rpc<Day>('get_staff_calendar', { p_ws: ws, p_staff: staff, p_key: keyStr, p_day: selectedDate })
      } catch (err) {
        if (err instanceof ApiError && err.code === 'FORBIDDEN') throw err
        const raw = await rpc<Omit<Day, 'day' | 'today'>>('get_staff_day', { p_ws: ws, p_staff: staff, p_key: keyStr })
        result = { ...raw, day: selectedDate, today: selectedDate }
      }
      if (current !== request.current || version < appliedRevision.current) return
      if (!result || (result.day && result.day !== selectedDate)) throw new Error('Schedule unavailable')
      appliedRevision.current = version
      setDay(result)
      setState('ok')
    } catch (e) {
      if (current !== request.current || version < appliedRevision.current) return
      appliedRevision.current = version
      setState(e instanceof ApiError && e.code === 'FORBIDDEN' ? 'forbidden' : 'offline')
    }
  }, [ws, staff, keyStr, selectedDate])

  useEffect(() => {
    load()
    const t = setInterval(() => !document.hidden && load(), 2000)
    return () => { clearInterval(t); invalidateRequests() }
  }, [load, invalidateRequests])

  const selectDate = (date: string) => {
    if (date === selectedDate) return
    invalidateRequests()
    setSelectedDate(date)
    setConfirm(false)
    setState('loading')
  }

  const setPresent = async (present: boolean) => {
    if (busy || !day || selectedDate !== day.today) return
    setBusy(true)
    try { await rpc('set_staff_presence', { p_ws: ws, p_staff: staff, p_key: keyStr, p_present: present }); await load() } catch { setState('offline') }
    setConfirm(false)
    setBusy(false)
  }

  const toggleTask = async (id: number, done: boolean) => {
    if (busy) return
    setBusy(true)
    try { await rpc('set_task', { p_ws: ws, p_key: keyStr, p_task: id, p_done: done }); await load() } catch { setState('offline') }
    setBusy(false)
  }

  if (state === 'forbidden') return <main className="phone"><Mark /><h1 className="phone-h">This link no longer works</h1><p className="quiet">Ask the desk for a new stylist link.</p></main>
  if (!day) return <main className="phone"><p className="quiet" role="status">{state === 'offline' ? 'Your schedule is unavailable. Retrying…' : 'Opening your day…'}</p></main>

  const ready = day.day === selectedDate && state !== 'loading'
  const today = selectedDate === day.today
  const past = selectedDate < day.today
  const ahead = day.slots.filter((s) => !today || s.start_min + s.minutes > day.now_min)
  const booked = ahead.filter((s) => s.status === 'booked').length
  const summary = `${booked} booked${today ? ' ahead' : ''}`
  const tasks = day.tasks ?? []
  const dateLabel = formatDate(selectedDate)
  const p = day.staff

  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{p.name.slice(0, 1)}</span>
        <span><strong>{day.salon}</strong><small>{preview ? 'staff view · preview' : 'staff view'}</small></span>
      </header>

      <div className="phone-lead">
      <div>
        <h1 className="phone-h">{p.name}</h1>
        <p className="quiet">{p.skills.join(' · ')}</p>
      </div>

      <DateCalendar value={selectedDate} onChange={selectDate} today={day.today} markedDates={day.scheduled_days} disabled={busy} label="Choose a date to see your schedule" />

      {ready && <SlotDial now={today ? day.now_min : undefined} big={today ? clock(day.now_min) : String(booked)} small={today ? summary : 'appointments'} label={`${p.name}'s schedule for ${dateLabel}: ${summary}`}
        segs={day.slots.map((s) => ({
          start: s.start_min, minutes: s.minutes, past: past || (today && s.start_min + s.minutes <= day.now_min),
          kind: s.refilled ? 'refilled' : s.status === 'free' ? 'open' : s.status === 'blocked' ? 'lapsed' : !today || p.present ? 'booked' : 'risk',
        }))} />}
      </div>

      <div className="phone-body" aria-busy={!ready}>
      <div aria-live="polite">
        <p className="overline">{today ? 'Today’s schedule' : past ? 'Past schedule' : 'Upcoming schedule'}</p>
        <h2>{dateLabel}</h2>
        {ready && <p className="quiet">{summary} · {tasks.filter((t) => !t.done && !t.missed).length} open tasks</p>}
      </div>
      {state === 'offline' && <p className="banner" role="status">Couldn’t refresh your schedule. Retrying…</p>}
      {!ready && <p className="quiet" role="status">{state === 'offline' ? 'Your schedule for this date is unavailable.' : 'Loading your schedule…'}</p>}
      {ready && <>
      {today && <div className={`presence-card ${p.present ? 'is-in' : 'is-out'}`}>
        <p className="overline">Today</p>
        <p className="presence-state">{p.present ? 'You are in' : 'You are out'}</p>
        {p.present ? (
          confirm ? (
            <div className="phone-acts">
              <p>{booked ? `The desk will move or rebook your ${booked} customers and stop offering your free time.` : 'The desk will stop offering your free time.'}</p>
              <button className="btn is-primary is-big" disabled={busy} onClick={() => setPresent(false)}>Yes, I am out today</button>
              <button className="btn" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn is-big" disabled={busy} onClick={() => setConfirm(true)}>I can’t come in today</button>
          )
        ) : (
          <button className="btn is-primary is-big" disabled={busy} onClick={() => setPresent(true)}>I’m in after all</button>
        )}
      </div>}

        <section aria-label={`My tasks for ${dateLabel}`}>
          <p className="overline">Tasks from the owner</p>
          {tasks.length === 0 ? <p className="quiet">No tasks assigned for this date.</p> : (
          <ul className="rows">
            {tasks.map((t) => (
              <li key={t.id} className={`task ${t.done ? 'is-done' : ''}`}>
                <input type="checkbox" checked={t.done} disabled={busy || t.missed} onChange={() => toggleTask(t.id, !t.done)} aria-label={`${t.done ? 'Done' : t.missed ? 'Missed' : 'Open'}: ${t.text}`} />
                <span className="row-main"><strong>{t.text}</strong></span>
                {t.missed && <span className="tag">Missed</span>}
              </li>
            ))}
          </ul>
          )}
        </section>

      <section aria-label={`My appointments for ${dateLabel}`}>
        <p className="overline">Appointments</p>
        {day.slots.length === 0 ? <p className="quiet">No appointments assigned for this date.</p> : (
        <ol className="rows">
          {day.slots.map((s) => (
            <li key={s.id} className={`my-slot ${past || (today && s.start_min + s.minutes <= day.now_min) ? 'is-past' : ''}`}>
              <span className="mono" title={span(s.start_min, s.minutes)}>{clock(s.start_min)}</span>
              <span className="my-slot-main"><strong>{s.status === 'booked' ? s.customer : s.status === 'blocked' ? 'Held time' : 'Open gap'}</strong><small>{s.service ? `${s.service} · ` : ''}{s.minutes} min</small></span>
              <span className={`tag ${s.refilled ? 'is-act' : s.status === 'free' ? 'is-beat' : ''}`}>{s.refilled ? 'Refilled' : s.status === 'booked' ? 'Booked' : s.status === 'free' ? 'Open' : 'Held'}</span>
            </li>
          ))}
        </ol>
        )}
      </section>
      </>}
      </div>

      <footer className="phone-foot">
        {preview && <p><a href="#/"><Icon name="arrow" size={14} /> Back to all views</a></p>}
        <p><Icon name="shield" size={14} /> You see only your own schedule. Customers appear by first name.</p>
      </footer>
    </main>
  )
}
