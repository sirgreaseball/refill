// Everything that happened today, newest first, in one sentence each. The same log is the
// evidence judges can export: JSON for the whole state, CSV for the sentences.
import { useState } from 'react'
import type { DbEvent } from '../api'
import { Icon, download, stamp } from '../ui'
import { chip, sentence, type Book } from './common'

const FILTERS: [string, (e: DbEvent) => boolean][] = [
  ['All', () => true],
  ['Offers', (e) => e.kind.startsWith('OFFER')],
  ['Bookings', (e) => ['BOOKED', 'SELF_BOOKED', 'APPOINTMENT_ADDED', 'WAITLIST_RETAINED', 'ACCEPT_REPEATED', 'ACCEPT_REJECTED', 'CANCELLED', 'CANCEL_UNDONE', 'MOVED', 'MOVE_LINK_SENT'].includes(e.kind)],
  ['Team', (e) => e.kind.startsWith('STAFF') || ['REASSIGNED', 'POLICY_CHANGED', 'DESK_LINK_MADE'].includes(e.kind)],
  ['Consent', (e) => e.kind.startsWith('CONSENT') || e.code === 'NO_CONSENT' || e.kind.startsWith('WAITLIST_')],
]

export default function Activity({ book }: { book: Book }) {
  const st = book.state!
  const [f, setF] = useState(0)
  const [all, setAll] = useState(false)
  const rows = st.events.filter(FILTERS[f][1])
  const shown = all ? rows : rows.slice(0, 50)

  const exportJson = () => download(`refill-evidence-${st.workspace.id.slice(0, 8)}.json`,
    JSON.stringify({ exported_at: new Date().toISOString(), synthetic: true, ...st, events: [...st.events].reverse() }, null, 2))
  const exportCsv = () => {
    // A cell starting with = + - @ would run as a formula in Excel or Sheets; prefix it so it stays text.
    const q = (v: unknown) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""')}"`
    const lines = [['id', 'at', 'kind', 'code', 'slot', 'entry', 'booking', 'sentence'].join(',')]
    for (const e of [...st.events].reverse()) lines.push([e.id, e.at, e.kind, e.code, e.slot_id, e.entry_id, e.booking_id, sentence(e, st)].map(q).join(','))
    download(`refill-evidence-${st.workspace.id.slice(0, 8)}.csv`, lines.join('\n'), 'text/csv')
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="overline">Front desk · activity</p>
          <h1>What happened today</h1>
          <p>Every offer, booking, refusal and change, with the rule behind it. Nothing here can be edited or deleted.</p>
        </div>
        <span className="head-acts">
          <button className="btn" onClick={exportCsv}><Icon name="download" /> CSV</button>
          <button className="btn is-quiet" onClick={exportJson}><Icon name="download" /> JSON</button>
        </span>
      </header>
      <div className="chips" role="group" aria-label="Filter">
        {FILTERS.map(([label, keep], i) => <button key={label} className={i === f ? 'is-on' : ''} aria-pressed={i === f} onClick={() => setF(i)}>{label}<span className="count">{st.events.filter(keep).length}</span></button>)}
      </div>
      <section className="group">
        <ol className="rows ev">
          {shown.map((e) => {
            const tone = e.kind === 'BOOKED' || e.kind === 'SELF_BOOKED' ? 'is-act' : e.kind === 'CANCELLED' ? 'is-beat' : e.kind === 'STAFF_ABSENT' || e.code === 'NO_CONSENT' ? 'is-risk' : ''
            return (
            <li key={e.id} className={tone}>
              <span className="ev-at">{stamp(e.at)}</span>
              <span className={`code ${tone}`}>{chip(e)}</span>
              <span className="ev-text">{sentence(e, st)}</span>
            </li>
            )
          })}
          {shown.length === 0 && <li className="quiet" style={{ padding: '12px 0' }}>Nothing yet.</li>}
        </ol>
        {rows.length > 50 && !all && <button className="btn is-quiet" onClick={() => setAll(true)}>Show all {rows.length}</button>}
      </section>
    </div>
  )
}
