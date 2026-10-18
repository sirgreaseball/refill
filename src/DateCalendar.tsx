import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { addDays, formatDate, monthDays, shiftMonth } from './calendar'
import { Icon } from './ui'

interface Props {
  value: string
  onChange: (date: string) => void
  today: string
  min?: string
  max?: string
  markedDates?: string[]
  disabled?: boolean
  label?: string
}

export default function DateCalendar({ value, onChange, today, min, max, markedDates = [], disabled = false, label = 'Choose a date' }: Props) {
  const [month, setMonth] = useState(() => shiftMonth(value || today, 0))
  const [focusDay, setFocusDay] = useState(value || today)
  const calendar = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const titleId = useId()
  useEffect(() => {
    if (value) { setMonth(shiftMonth(value, 0)); setFocusDay(value) }
  }, [value])
  useEffect(() => {
    if (pendingFocus.current) {
      calendar.current?.querySelector<HTMLButtonElement>(`[data-day="${pendingFocus.current}"]`)?.focus()
      pendingFocus.current = null
    }
  }, [month, focusDay])

  const allowed = (date: string) => !disabled && (!min || date >= min) && (!max || date <= max)
  const days = monthDays(month)
  const firstEnabled = days.find((d) => d && allowed(d))
  const tabDay = days.includes(focusDay) && allowed(focusDay) ? focusDay : firstEnabled
  const previous = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)
  const title = new Date(`${month}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' })

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday }
    let target = event.key in offsets ? addDays(day, offsets[event.key])
      : event.key === 'PageUp' ? shiftMonth(day, -1) : event.key === 'PageDown' ? shiftMonth(day, 1) : null
    if (!target) return
    event.preventDefault()
    if (min && target < min) target = min
    if (max && target > max) target = max
    if (!allowed(target)) return
    pendingFocus.current = target
    setFocusDay(target)
    setMonth(shiftMonth(target, 0))
  }

  return (
    <section className="date-calendar" aria-label={label}>
      <div className="calendar-label"><span className="overline"><Icon name="calendar" size={15} /> {label}</span>
        <button className="link" type="button" disabled={!allowed(today)} onClick={() => { onChange(today); setMonth(shiftMonth(today, 0)); setFocusDay(today) }}>Today</button>
      </div>
      <div className="calendar-heading">
        <button className="icon-btn calendar-prev" type="button" aria-label="Previous month" disabled={disabled || !!(min && addDays(month, -1) < min)} onClick={() => setMonth(previous)}><Icon name="chevron" /></button>
        <strong id={titleId} aria-live="polite">{title}</strong>
        <button className="icon-btn calendar-next" type="button" aria-label="Next month" disabled={disabled || !!(max && next > max)} onClick={() => setMonth(next)}><Icon name="chevron" /></button>
      </div>
      <div className="calendar-grid" role="group" aria-labelledby={titleId} ref={calendar}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span className="calendar-weekday" key={d}>{d}</span>)}
        {days.map((day, i) => day ? <button key={day} type="button" data-day={day}
          className={`calendar-day ${day === value ? 'is-selected' : ''} ${day === today ? 'is-today' : ''}`}
          aria-label={`${formatDate(day)}${markedDates.includes(day) ? ', appointments or tasks scheduled' : ''}`}
          aria-pressed={day === value} aria-current={day === today ? 'date' : undefined}
          disabled={!allowed(day)} tabIndex={day === tabDay ? 0 : -1}
          onFocus={() => setFocusDay(day)} onKeyDown={(e) => moveFocus(e, day)} onClick={() => onChange(day)}>
          {Number(day.slice(-2))}{markedDates.includes(day) && <i className="calendar-marker" aria-hidden="true" />}
        </button> : <span key={`blank-${i}`} aria-hidden="true" />)}
      </div>
      <p className="calendar-caption">{value ? formatDate(value) : 'Select a day to see available times'}{markedDates.length > 0 && <span><i className="calendar-marker" /> Scheduled</span>}</p>
    </section>
  )
}
