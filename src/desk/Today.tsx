// The front desk's day: what needs you now, who is in, and the schedule. Tap anything to
// open its sheet. On a phone the schedule becomes a list of what is still ahead.
import { useMemo, useState } from 'react'
import type { DbSlot, State } from '../api'
import { Icon, clock, money, span } from '../ui'
import { Num } from '../motion'
import { SlotSheet } from './SlotSheet'
import { figures, first, kindOf, plural, staffFor, togglePresence, useRun, type Book, type Kind } from './common'

const DAY_START = 600
const DAY_END = 1200
const pct = (min: number) => `${((min - DAY_START) / (DAY_END - DAY_START)) * 100}%`

export default function Today({ book, initial }: { book: Book; initial?: string }) {
  const st = book.state!
  const run = useRun(book)
  const [selected, setSelected] = useState<string | null>(initial ?? null)
  const now = st.workspace.now_min
  const f = useMemo(() => figures(st), [st])
  const sel = st.slots.find((s) => s.id === selected) ?? null
  const queue = [...f.risk, ...f.held, ...f.open].sort((a, b) => a.start_min - b.start_min)

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="overline">Front desk · {clock(now)}</p>
          <h1>{queue.length ? `${plural(queue.length, 'thing')} need${queue.length === 1 ? 's' : ''} you` : 'All clear'}</h1>
          <p>Tap an appointment when a client cancels or needs a new time. Tap an open gap to offer it to the waitlist.</p>
        </div>
      </header>

      <div className="stats">
        <div className={`stat spot ${f.recovered ? 'is-act' : ''}`}><div className="stat-v"><Num value={f.recovered} format={money} /></div><div className="stat-l">Recovered today · {plural(f.refilled, 'gap')} refilled</div></div>
        <div className={`stat spot ${f.openValue ? 'is-beat' : ''}`}><div className="stat-v"><Num value={f.openValue} format={money} /></div><div className="stat-l">In {plural(f.open.length, 'open gap')} you can still fill</div></div>
        <div className={`stat spot ${f.risk.length ? 'is-risk' : ''}`}><div className="stat-v"><Num value={f.risk.length} /></div><div className="stat-l">Clients whose staff member is out</div></div>
        <div className="stat spot"><div className="stat-v"><Num value={st.waitlist.filter((e) => e.status === 'waiting').length} /></div><div className="stat-l">On the waitlist</div></div>
      </div>

      <section className="group spot" aria-label="Needs you now">
        <div className="group-head"><h2>Needs you now</h2></div>
        {queue.length === 0 ? <p className="all-clear"><Icon name="check" /> Nothing waiting. New cancellations appear here.</p> : (
          <div className="queue">
            {queue.map((s) => <QueueItem key={s.id} st={st} s={s} onPick={setSelected} />)}
          </div>
        )}
      </section>

      <section className="group spot" aria-label="Who is in today">
        <div className="group-head"><h2>Team today</h2><p>Tap to mark someone out. Their clients are flagged; nothing moves on its own.</p></div>
        <div className="roster">
          {st.staff.map((p) => (
            <button key={p.id} className={`roster-chip ${p.present ? '' : 'is-out'}`} onClick={() => togglePresence(run, p)}
              aria-label={`${p.name} is ${p.present ? 'in' : 'out'}. Tap to mark ${p.present ? 'out' : 'in'}`}>
              {p.name} <small>{clock(p.shift_start)}–{clock(p.shift_end)}</small><span className="state">{p.present ? 'In' : 'Out'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="group spot" aria-label="Schedule">
        <div className="group-head"><h2>Schedule</h2><p className="hide-phone">Amber is an open gap, green was refilled, red needs moving.</p></div>
        <Board st={st} selected={selected} onPick={setSelected} />
        <Agenda st={st} selected={selected} onPick={setSelected} />
      </section>

      {sel && <SlotSheet key={sel.id} st={st} slot={sel} run={run} onClose={() => setSelected(null)} />}
    </div>
  )
}

function QueueItem({ st, s, onPick }: { st: State; s: DbSlot; onPick: (id: string) => void }) {
  const k = kindOf(st, s)
  const staff = staffFor(st, s)
  const offers = st.offers.filter((o) => o.slot_id === s.id && o.status === 'sent').length
  const [title, side] =
    k === 'risk' ? [`${s.customer}: ${staff?.name} is out`, 'Move'] :
      k === 'blocked' ? [`Held gap: ${staff?.name} is out`, 'Reassign'] :
        [`Open gap · ${s.service}`, offers ? `${plural(offers, 'offer')} out` : money(s.price_inr)]
  return (
    <button className={`q-item is-${k}`} onClick={() => onPick(s.id)}>
      <span className="q-time">{clock(s.start_min)}</span>
      <span className="q-main"><strong>{title}</strong><small>{s.minutes} min · {k === 'risk' ? `${s.service}, needs a new time or someone else` : `with ${staff?.name ?? 'staff'}`}</small></span>
      <span className="q-side">{side}</span>
    </button>
  )
}

const label = (st: State, s: DbSlot, k: Kind) => {
  const who = staffFor(st, s)?.name
  const state = k === 'open' ? `open gap, ${money(s.price_inr)}` : k === 'lapsed' ? 'open, too late to fill'
    : k === 'blocked' ? `held, ${who} is out` : k === 'risk' ? `${s.customer} needs moving` : k === 'refilled' ? `refilled by ${s.customer}` : `booked by ${s.customer}`
  return `${span(s.start_min, s.minutes)}, ${s.service ?? s.skill}, with ${who}: ${state}`
}

function Board({ st, selected, onPick }: { st: State; selected: string | null; onPick: (id: string) => void }) {
  const now = st.workspace.now_min
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60)
  return (
    <div className="board">
      <div className="board-in">
        <div className="axis" aria-hidden="true">{hours.map((h) => <span key={h} style={{ left: pct(h) }}>{clock(h)}</span>)}</div>
        {st.staff.map((p) => (
          <div className={`lane ${p.present ? '' : 'is-out'}`} key={p.id}>
            <div className="lane-name"><strong>{p.name}{p.present ? '' : ' · out'}</strong><small>{p.skills.join(' · ')}</small></div>
            <div className="track">
              <div className="past-veil" style={{ width: pct(Math.min(Math.max(now, DAY_START), DAY_END)) }} aria-hidden="true" />
              {st.slots.filter((s) => s.staff_id === p.id).map((s) => {
                const k = kindOf(st, s)
                return (
                  <button key={s.id}
                    className={`blk is-${k} ${s.minutes <= 30 ? 'is-short' : ''} ${s.id === selected ? 'is-sel' : ''} ${s.start_min + s.minutes <= now ? 'is-past' : ''}`}
                    style={{ left: pct(s.start_min), width: `calc(${pct(s.start_min + s.minutes)} - ${pct(s.start_min)} - 3px)` }}
                    onClick={() => onPick(s.id)} aria-label={label(st, s, k)} title={label(st, s, k)}>
                    <span className="blk-time">{clock(s.start_min)}</span>
                    <span className="blk-text">{k === 'open' || k === 'lapsed' ? 'Open' : k === 'blocked' ? 'Held' : first(s.customer)}</span>
                  </button>
                )
              })}
              {now >= DAY_START && now <= DAY_END && <div className="now" style={{ left: pct(now) }} aria-hidden="true" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Agenda({ st, selected, onPick }: { st: State; selected: string | null; onPick: (id: string) => void }) {
  const now = st.workspace.now_min
  const ahead = st.slots.filter((s) => s.start_min + s.minutes > now)
  return (
    <ol className="agenda" aria-label="Appointments still ahead">
      {ahead.map((s) => {
        const k = kindOf(st, s)
        const who = staffFor(st, s)?.name
        return (
          <li key={s.id}>
            <button className={`agenda-row is-${k} ${s.id === selected ? 'is-sel' : ''}`} onClick={() => onPick(s.id)} aria-label={label(st, s, k)}>
              <span className="agenda-time">{clock(s.start_min)}</span>
              <span className="agenda-main">
                <strong>{k === 'open' ? 'Open gap' : k === 'lapsed' ? 'Open, too late' : k === 'blocked' ? `Held: ${who} out` : k === 'risk' ? `${s.customer}: needs moving` : s.customer}</strong>
                <small>{s.service} · {s.minutes} min · {who}</small>
              </span>
              <span>{k === 'open' ? <span className="tag is-beat">{money(s.price_inr)}</span> : k === 'refilled' ? <span className="tag is-act">Refilled</span> : k === 'risk' ? <span className="tag is-risk">Move</span> : null}</span>
            </button>
          </li>
        )
      })}
      {ahead.length === 0 && <li className="quiet" style={{ padding: '12px 0' }}>Nothing left today.</li>}
    </ol>
  )
}
