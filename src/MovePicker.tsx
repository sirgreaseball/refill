// The times an appointment can move to, as the database lists them: same time with another
// staff member first, then each staff member's free times. Pick one, then confirm. Used by the desk and
// by the customer's own move page, so both see exactly the same choices.
import { useState } from 'react'
import type { MoveOption } from './api'
import { clock } from './ui'

export function MovePicker({ options, busy, confirm, onPick, onCancel }: {
  options: MoveOption[]; busy?: boolean; confirm: (o: MoveOption) => string
  onPick: (o: MoveOption) => void; onCancel?: () => void
}) {
  const [chosen, setChosen] = useState<MoveOption | null>(null)
  const same = options.filter((o) => o.same_time)
  const later = options.filter((o) => !o.same_time)
  const byStylist = [...new Set(later.map((o) => o.name))].map((name) => [name, later.filter((o) => o.name === name)] as const)
  const on = (o: MoveOption) => chosen?.staff === o.staff && chosen.start_min === o.start_min

  if (options.length === 0) {
    return (
      <div className="move-picker">
        <p className="quiet">Nobody who does this service is free later today.</p>
        {onCancel && <button className="link" onClick={onCancel}>Back</button>}
      </div>
    )
  }
  return (
    <div className="move-picker">
      {same.length > 0 && (
        <div className="move-group">
          <p className="overline">Same time, someone else</p>
          <div className="time-chips">
            {same.map((o) => (
              <button key={o.staff} className={`time-chip is-wide ${on(o) ? 'is-on' : ''}`} onClick={() => setChosen(o)} aria-pressed={on(o)}>
                {clock(o.start_min)} with {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {byStylist.map(([name, list]) => (
        <div className="move-group" key={name}>
          <p className="overline">{name}</p>
          <div className="time-chips">
            {list.map((o) => (
              <button key={o.start_min} className={`time-chip ${o.gap ? 'is-gap' : ''} ${on(o) ? 'is-on' : ''}`} onClick={() => setChosen(o)}
                aria-pressed={on(o)} aria-label={`${clock(o.start_min)} with ${name}${o.gap ? ', fills an open gap' : ''}`}>
                {clock(o.start_min)}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="move-go">
        <button className="btn is-primary" disabled={!chosen || busy} onClick={() => chosen && onPick(chosen)}>
          {chosen ? confirm(chosen) : 'Pick a time'}
        </button>
        {onCancel && <button className="link" onClick={onCancel}>Back</button>}
      </div>
    </div>
  )
}
