// A customer's private link to move or cancel one appointment. It lists only times the
// database confirms will work: a staff member who is in, does the service and is working then.
// The link shows nothing about anyone else, and every choice is re-checked under lock.
import { useCallback, useEffect, useState } from 'react'
import type { MoveOption } from './api'
import { MovePicker } from './MovePicker'
import { rpc } from './rpc.ts'
import { SlotDial } from './Dial'
import { Icon, Mark, clock, span } from './ui'

interface Appt { start_min: number; minutes: number; service: string | null; stylist: string | null; stylist_present?: boolean }
interface View {
  state: 'open' | 'moved' | 'cancelled' | 'withdrawn' | 'NOT_FOUND'
  salon: string; kind?: string; now_min: number; reason: 'STAFF_ABSENT' | 'CUSTOMER_REQUEST' | 'SALON_REQUEST'; customer: string
  current: Appt | null; moved_to: Appt | null; options: MoveOption[]
}
const NOT_DONE: Record<string, string> = {
  TARGET_BUSY: 'Someone took that time a moment ago. Pick another.',
  TOO_SOON: 'That time is now too close to start. Pick another.',
  TARGET_ABSENT: 'That staff member is no longer in today. Pick another.',
  TARGET_OFF_SHIFT: 'That staff member is not working then. Pick another.',
  ALREADY_STARTED: 'Your appointment has already started.',
  ALREADY_OVER: 'Your appointment is already over.',
}

export default function Move({ id }: { id: string }) {
  const [v, setV] = useState<View | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    try { setV(await rpc<View>('get_move', { p_move: id })); setOffline(false) } catch { setOffline(true) }
  }, [id])
  useEffect(() => {
    load()
    const t = setInterval(() => !document.hidden && load(), 3000)
    return () => clearInterval(t)
  }, [load])

  const act = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true)
    setErr(null)
    try {
      const r = await rpc<{ ok: boolean; code?: string }>(fn, { p_move: id, ...args })
      if (!r.ok) setErr(NOT_DONE[r.code ?? ''] ?? `Not done: ${r.code}`)
      await load()
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
    setCancelling(false)
  }

  if (!v) return <main className="phone"><p className="quiet">{offline ? 'No connection. Retrying…' : 'Opening your appointment…'}</p></main>
  if (v.state === 'NOT_FOUND') return <main className="phone"><Mark /><h1 className="phone-h">We could not find this link</h1><p className="quiet">It may be from an old demo day.</p></main>

  const c = v.current
  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{v.salon.slice(0, 1)}</span>
        <span><strong>{v.salon}</strong><small>your appointment</small></span>
      </header>

      {v.state === 'open' && c && (
        <>
          <div>
            <p className="overline">Hi {v.customer}</p>
            <h1 className="phone-h">{v.reason === 'STAFF_ABSENT' ? 'Your appointment needs a new time' : 'Change your appointment'}</h1>
            <p className="quiet">
              {v.reason === 'STAFF_ABSENT'
                ? `${c.stylist} can’t come in today, so your ${c.service} at ${clock(c.start_min)} can’t go ahead with them. Pick what suits you.`
                : `You have ${c.service} at ${span(c.start_min, c.minutes)} with ${c.stylist}. Pick a new time, or cancel.`}
            </p>
          </div>
          <figure className="dial-fig">
            <SlotDial segs={[{ start: c.start_min, minutes: c.minutes, kind: c.stylist_present === false ? 'risk' : 'booked' }]} now={v.now_min}
              big={clock(c.start_min)} small={`${c.minutes} min · ${c.stylist ?? ''}`} label={`Booked now: ${span(c.start_min, c.minutes)}`} />
            <figcaption><span className="overline">Booked now</span> {span(c.start_min, c.minutes)} · {c.service} · {c.stylist}{c.stylist_present === false ? ' (out today)' : ''}</figcaption>
          </figure>
          <MovePicker options={v.options} busy={busy}
            confirm={(o) => `Move to ${clock(o.start_min)} with ${o.name}`}
            onPick={(o) => act('choose_move', { p_staff: o.staff, p_start: o.start_min })} />
          {err && <p className="err" role="alert">{err}</p>}
          {cancelling ? (
            <div className="phone-acts">
              <p>Cancel your {c.service} at {clock(c.start_min)}? The time goes to someone on the waitlist.</p>
              <button className="btn" disabled={busy} onClick={() => act('cancel_my_booking', {})}>Yes, cancel it</button>
              <button className="link" onClick={() => setCancelling(false)}>Keep it</button>
            </div>
          ) : <button className="link" onClick={() => setCancelling(true)}>Cancel my appointment instead</button>}
        </>
      )}

      {v.state === 'moved' && v.moved_to && (
        <SlotDial segs={[{ start: v.moved_to.start_min, minutes: v.moved_to.minutes, kind: 'refilled' }]} now={v.now_min}
          big={clock(v.moved_to.start_min)} small={`${v.moved_to.minutes} min · ${v.moved_to.stylist ?? ''}`} label={`Moved to ${span(v.moved_to.start_min, v.moved_to.minutes)}`} />
      )}
      {v.state === 'moved' && v.moved_to && (
        <div className="verdict is-act">
          <h1 className="phone-h">You’re moved</h1>
          <p>{v.moved_to.service} at {span(v.moved_to.start_min, v.moved_to.minutes)} with {v.moved_to.stylist}. See you then.</p>
        </div>
      )}
      {v.state === 'cancelled' && (
        <div className="verdict">
          <h1 className="phone-h">Cancelled</h1>
          <p>Your appointment is cancelled. Thank you for telling us: the time can go to someone else.</p>
        </div>
      )}
      {v.state === 'withdrawn' && (
        <div className="verdict">
          <h1 className="phone-h">Nothing to do</h1>
          <p>{v.salon} has already updated this appointment. Call them if anything looks wrong.</p>
        </div>
      )}

      <footer className="phone-foot">
        <p><Icon name="shield" size={14} /> Only times that truly work are listed. Every choice is checked again before it is booked.</p>
        {v.kind !== 'live' && <p>Synthetic demo. No real message is ever sent.</p>}
      </footer>
    </main>
  )
}
