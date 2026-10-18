// What the owner hears when someone is marked out: who covered which appointment (the absence
// planner in migration 012), what still needs moving, that person's tasks with a one-tap
// hand-over, and who is in to take them.
import { useEffect, useRef } from 'react'
import type { DbNotice, DbTask, State } from './api'
import { businessToday } from './calendar'
import { plural, useRun, type Book, type Run } from './desk/common'
import { Icon, Select, clock } from './ui'

const NOT_MOVED: Record<string, string> = {
  TARGET_ABSENT: 'They are out now too. Pick someone who is in.',
  ALREADY_DONE: 'That task is already done.',
  SAME_STAFF: 'It is already theirs.',
  NOT_FOUND: 'That task or person is gone.',
}

/** Give a task to someone who is in, or leave it missed. Owner only (the database checks). */
export function TaskHandOver({ st, run, task }: { st: State; run: Run; task: DbTask }) {
  const others = st.staff.filter((p) => p.present && (p.id !== task.staff_id || task.missed))
  const pick = (v: string) => run<{ ok: boolean; code?: string; to?: string }>('reassign_task', { p_task: task.id, p_to: v === 'missed' ? null : v },
    (r) => (r.ok ? (r.to ? `Given to ${r.to}.` : 'Marked missed.') : NOT_MOVED[r.code ?? ''] ?? `Not changed: ${r.code}`))
  return (
    <Select value="" onChange={pick} label={`Hand over: ${task.text}`} placeholder={task.missed ? 'Missed · give to…' : 'Give to…'}
      choices={[...others.map((p) => ({ value: p.id, label: p.name, hint: `${clock(p.shift_start)}–${clock(Math.min(p.shift_end, 1439))}` })),
        ...(task.missed ? [] : [{ value: 'missed', label: 'Leave it unassigned', hint: 'marked missed' }])]} />
  )
}

function Card({ st, run, n }: { st: State; run: Run; n: DbNotice }) {
  const d = n.detail
  const now = st.workspace.now_min
  const person = st.staff.find((p) => p.id === n.staff_id)
  const stillOut = person ? !person.present : false
  const left = st.slots.filter((s) => s.staff_id === n.staff_id && s.status === 'booked' && s.start_min >= now && stillOut)
  const taskDay = st.workspace.day ?? businessToday()
  const tasks = (st.tasks ?? []).filter((t) => t.staff_id === n.staff_id && !t.done && (!t.day || t.day === taskDay))
  const handed = d.tasks.filter((t) => {
    const task = st.tasks?.find((x) => x.id === t.id)
    return (!task?.day || task.day === taskDay) && !tasks.some((x) => x.id === t.id)
  })
  const inNow = st.staff.filter((p) => p.present && p.id !== n.staff_id)
  const at = new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
  return (
    <article className={`notice ${n.read_at ? 'is-read' : ''}`}>
      <header className="notice-head">
        <span className="notice-dot" aria-hidden="true" />
        <span className="row-main"><strong>{d.name} is out{stillOut ? '' : ' (back in now)'}</strong>
          <small>Marked out at {at} · {d.auto_cover ? `auto-cover moved ${plural(d.covered.length, 'appointment')}` : 'auto-cover is off'}{d.held ? ` · ${plural(d.held, 'open gap')} held` : ''}</small></span>
        {!n.read_at && <button className="btn is-quiet" onClick={() => run('read_notice', { p_notice: n.id })}><Icon name="check" /> Done</button>}
      </header>

      {d.covered.length > 0 && <div className="notice-part">
        <p className="overline">Covered automatically</p>
        <ul className="notice-list">{d.covered.map((c) => (
          <li key={c.slot}><span className="mono">{clock(c.start_min)}</span> {c.customer} · {c.service} <Icon name="arrow" size={14} /> <strong>{c.to_name}</strong></li>
        ))}</ul>
      </div>}

      {left.length > 0 && <div className="notice-part">
        <p className="overline is-risk">Needs a new time or person</p>
        <ul className="notice-list">{left.map((s) => (
          <li key={s.id}><span className="mono">{clock(s.start_min)}</span> {s.customer} · {s.service} <a className="btn is-quiet" href={`#/desk/slot/${s.id}`}>Move</a></li>
        ))}</ul>
        <p className="quiet small">Nobody who is in does {left.length === 1 ? 'this service' : 'these services'} free at that time.</p>
        <button className="btn" onClick={() => run<{ ok: boolean; covered: number; left: number }>('cover_absence', { p_staff: n.staff_id },
          (r) => (r.ok ? (r.covered ? `${plural(r.covered, 'appointment')} covered.` : 'Still nobody free who does it.') : null))}>
          <Icon name="bolt" /> Try auto-cover again</button>
      </div>}

      {(tasks.length > 0 || handed.length > 0) && <div className="notice-part">
        <p className="overline">{d.name}’s tasks</p>
        <ul className="notice-tasks">
          {tasks.map((t) => (
            <li key={t.id} className={t.missed ? 'is-missed' : ''}>
              <span className="row-main"><strong>{t.text}</strong>{t.missed && <small>Left unassigned · missed</small>}</span>
              <TaskHandOver st={st} run={run} task={t} />
            </li>
          ))}
          {handed.map((t) => {
            const now = (st.tasks ?? []).find((x) => x.id === t.id)
            const to = st.staff.find((p) => p.id === now?.staff_id)?.name
            return <li key={t.id} className="is-done"><span className="row-main"><strong>{t.text}</strong><small>{now ? (now.done ? 'Done' : `Given to ${to}`) : 'Removed'}</small></span></li>
          })}
        </ul>
      </div>}

      <div className="notice-part">
        <p className="overline">In now, can cover</p>
        <p className="notice-avail">{inNow.length ? inNow.map((p) => <span key={p.id} className="chip">{p.name} <small>{p.skills.join(' · ')} · {clock(p.shift_start)}–{clock(Math.min(p.shift_end, 1439))}</small></span>) : <span className="quiet">Nobody else is in.</span>}</p>
      </div>
    </article>
  )
}

/** The owner's inbox on Overview. New notices first; the last few read ones stay below. */
export default function Notices({ book }: { book: Book }) {
  const st = book.state!
  const run = useRun(book)
  const all = st.notices ?? []
  const fresh = all.filter((n) => !n.read_at)
  const shown = [...fresh, ...all.filter((n) => n.read_at).slice(0, Math.max(0, 2 - fresh.length))]
  if (!shown.length) return null
  return (
    <section className="group spot notices" aria-label="Notifications" id="notices">
      <div className="group-head">
        <h2><Icon name="bell" /> {fresh.length ? `${plural(fresh.length, 'new notice')}` : 'Notices'}</h2>
        {fresh.length > 1 && <button className="btn is-quiet" onClick={() => run('read_notice', { p_notice: null })}>Mark all done</button>}
      </div>
      {shown.map((n) => <Card key={n.id} st={st} run={run} n={n} />)}
    </section>
  )
}

/** For the top bar: a bell with the owner's unread count, a toast for each new notice, and a
 *  system notification when the tab is in the background (if the owner allowed it). */
export function useNoticeAlerts(st: State | null, toast: (t: string) => void) {
  const seen = useRef<number | null>(null)
  const fresh = st?.role === 'owner' ? (st.notices ?? []).filter((n) => !n.read_at) : []
  const top = fresh[0]?.id ?? 0
  useEffect(() => {
    if (!st || st.role !== 'owner') return
    if (seen.current === null) { seen.current = top; return }
    if (top > seen.current) {
      const n = fresh[0]
      const text = `${n.detail.name} is out. ${n.detail.covered.length ? `${plural(n.detail.covered.length, 'appointment')} covered automatically. ` : ''}${n.detail.left.length ? `${n.detail.left.length} to move.` : ''}`
      toast(text)
      try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('Refill', { body: text, tag: `notice-${n.id}` }) } catch { /* not supported */ }
    }
    seen.current = Math.max(seen.current, top)
  }, [top]) // eslint-disable-line react-hooks/exhaustive-deps
  return fresh.length
}
