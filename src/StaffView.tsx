// A staff member's own day, on their phone. They see their appointments (first names only)
// and can mark themselves in or out. Nothing about other staff or the waitlist.
import { useCallback, useEffect, useState } from 'react'
import { ApiError, rpc } from './rpc.ts'
import { SlotDial } from './Dial'
import { Icon, Mark, clock, span } from './ui'

interface Day {
  salon: string
  now_min: number
  staff: { id: string; name: string; skills: string[]; present: boolean }
  slots: { id: string; start_min: number; minutes: number; service: string | null; status: 'free' | 'booked' | 'blocked'; refilled: boolean; customer: string }[]
  tasks?: { id: number; text: string; done: boolean }[]
}

export default function StaffView({ ws, staff, keyStr, preview }: { ws: string; staff: string; keyStr: string; preview?: boolean }) {
  const [day, setDay] = useState<Day | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'offline'>('loading')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const load = useCallback(async () => {
    try {
      setDay(await rpc<Day>('get_staff_day', { p_ws: ws, p_staff: staff, p_key: keyStr }))
      setState('ok')
    } catch (e) {
      setState(e instanceof ApiError && e.code === 'FORBIDDEN' ? 'forbidden' : 'offline')
    }
  }, [ws, staff, keyStr])

  useEffect(() => {
    load()
    const t = setInterval(() => !document.hidden && load(), 2000)
    return () => clearInterval(t)
  }, [load])

  const setPresent = async (present: boolean) => {
    setBusy(true)
    try { await rpc('set_staff_presence', { p_ws: ws, p_staff: staff, p_key: keyStr, p_present: present }); await load() } catch { setState('offline') }
    setConfirm(false)
    setBusy(false)
  }

  const toggleTask = async (id: number, done: boolean) => {
    try { await rpc('set_task', { p_ws: ws, p_key: keyStr, p_task: id, p_done: done }); await load() } catch { setState('offline') }
  }

  if (state === 'forbidden') return <main className="phone"><Mark /><h1 className="phone-h">This link no longer works</h1><p className="quiet">Ask the desk for a new stylist link.</p></main>
  if (!day) return <main className="phone"><p className="quiet">{state === 'offline' ? 'No connection. Retrying…' : 'Opening your day…'}</p></main>

  const ahead = day.slots.filter((s) => s.start_min + s.minutes > day.now_min)
  const booked = ahead.filter((s) => s.status === 'booked').length
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
        <p className="quiet">{p.skills.join(' · ')} · {booked} booked ahead · now {clock(day.now_min)}</p>
      </div>

      <SlotDial now={day.now_min} big={clock(day.now_min)} small={`${booked} booked ahead`} label={`${p.name}'s day: ${booked} booked ahead`}
        segs={day.slots.map((s) => ({
          start: s.start_min, minutes: s.minutes, past: s.start_min + s.minutes <= day.now_min,
          kind: s.refilled ? 'refilled' : s.status === 'free' ? 'open' : s.status === 'blocked' ? 'lapsed' : p.present ? 'booked' : 'risk',
        }))} />
      </div>

      <div className="phone-body">
      <div className={`presence-card ${p.present ? 'is-in' : 'is-out'}`}>
        <p className="overline">Today</p>
        <p className="presence-state">{p.present ? 'You are in' : 'You are out'}</p>
        {p.present ? (
          confirm ? (
            <div className="phone-acts">
              <p>{booked ? `The desk will move or rebook your ${booked} customers and stop offering your free time.` : 'The desk will stop offering your free time.'}</p>
              <button className="btn is-primary is-big" disabled={busy} onClick={() => setPresent(false)}>Yes, I am out today</button>
              <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn is-big" onClick={() => setConfirm(true)}>I can’t come in today</button>
          )
        ) : (
          <button className="btn is-primary is-big" disabled={busy} onClick={() => setPresent(true)}>I’m in after all</button>
        )}
      </div>

      {(day.tasks?.length ?? 0) > 0 && (
        <section aria-label="My tasks">
          <p className="overline">Tasks from the owner</p>
          <ul className="rows">
            {day.tasks!.map((t) => (
              <li key={t.id} className={`task ${t.done ? 'is-done' : ''}`}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id, !t.done)} aria-label={`${t.done ? 'Done' : 'Open'}: ${t.text}`} />
                <span className="row-main"><strong>{t.text}</strong></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="My appointments">
        <p className="overline">My day</p>
        <ol className="rows">
          {day.slots.map((s) => (
            <li key={s.id} className={`my-slot ${s.start_min + s.minutes <= day.now_min ? 'is-past' : ''}`}>
              <span className="mono" title={span(s.start_min, s.minutes)}>{clock(s.start_min)}</span>
              <span className="my-slot-main"><strong>{s.status === 'booked' ? s.customer : s.status === 'blocked' ? 'Held, you are out' : 'Open gap'}</strong><small>{s.service ? `${s.service} · ` : ''}{s.minutes} min</small></span>
              <span className={`tag ${s.refilled ? 'is-act' : s.status === 'free' ? 'is-beat' : ''}`}>{s.refilled ? 'Refilled' : s.status === 'booked' ? 'Booked' : s.status === 'free' ? 'Open' : 'Held'}</span>
            </li>
          ))}
        </ol>
      </section>
      </div>

      <footer className="phone-foot">
        {preview && <p><a href="#/"><Icon name="arrow" size={14} /> Back to all views</a></p>}
        <p><Icon name="shield" size={14} /> You see only your own day. Customers appear by first name.</p>
      </footer>
    </main>
  )
}
