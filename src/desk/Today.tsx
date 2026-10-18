// The front desk's day: what needs you now, who is in, and the schedule. Tap anything to
// open its sheet. The schedule is a calendar (one lane per person) or the Day Dial.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { servicesOf, type DbSlot, type State } from '../api'
import { Icon, Modal, Select, TimeSelect, clock, money, span } from '../ui'
import Dial, { dayRange } from '../Dial'
import { Num } from '../motion'
import { SlotSheet } from './SlotSheet'
import JoinQr from './JoinQr'
import { figures, first, kindOf, plural, staffFor, togglePresence, useRun, type Book, type Kind, type Run } from './common'


export default function Today({ book, initial }: { book: Book; initial?: string }) {
  const st = book.state!
  const run = useRun(book)
  const [selected, setSelected] = useState<string | null>(initial ?? null)
  const [adding, setAdding] = useState(false)
  const [qr, setQr] = useState(false)
  // Calendar or dial: one view of the day at a time, remembered on this device. Calendar first.
  const [view, setView] = useState<'dial' | 'calendar'>(() => { try { return localStorage.getItem('refill.dayView2') === 'dial' ? 'dial' : 'calendar' } catch { return 'calendar' } })
  const pickView = (v: 'dial' | 'calendar') => { setView(v); try { localStorage.setItem('refill.dayView2', v) } catch { /* private mode */ } }
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
        <span className="card-acts">
          {st.workspace.join_code && <button className="btn" onClick={() => setQr(true)}><Icon name="qr" /> Client QR</button>}
          <button className="btn is-primary" onClick={() => setAdding(true)}><Icon name="plus" /> New appointment</button>
        </span>
      </header>

      <section className={`group today-hero is-${view}`} aria-label="Today at a glance">
        <div className="today-head">
          <h2>Today</h2>
          <div className="seg day-view" role="group" aria-label="Show the day as">
            {(['calendar', 'dial'] as const).map((v) => (
              <button key={v} className={view === v ? 'is-on' : ''} aria-pressed={view === v} onClick={() => pickView(v)}>
                <Icon name={v === 'dial' ? 'clock' : 'calendar'} size={16} />{v === 'dial' ? 'Dial' : 'Calendar'}
              </button>
            ))}
          </div>
        </div>
        <span className="legend today-legend"><span><i className="is-gap" />open</span><span><i className="is-fill" />refilled</span><span><i className="is-risk" />needs moving</span><span><i className="is-booked" />booked</span></span>
        {view === 'dial'
          ? <Dial st={st} onPick={(x) => setSelected(x.id)} center={{ big: clock(now), small: queue.length ? `${queue.length} need${queue.length === 1 ? 's' : ''} you` : 'all clear' }} />
          : <div className="day-cal"><Board st={st} selected={selected} onPick={setSelected} /></div>}
        <div className="stats">
        <div className={`stat spot ${f.recovered ? 'is-act' : ''}`}><div className="stat-v"><Num value={f.recovered} format={money} /></div><div className="stat-l">Recovered today · {plural(f.refilled, 'gap')} refilled</div></div>
        <div className={`stat spot ${f.openValue ? 'is-beat' : ''}`}><div className="stat-v"><Num value={f.openValue} format={money} /></div><div className="stat-l">In {plural(f.open.length, 'open gap')} you can still fill</div></div>
        <div className={`stat spot ${f.risk.length ? 'is-risk' : ''}`}><div className="stat-v"><Num value={f.risk.length} /></div><div className="stat-l">Clients whose staff member is out</div></div>
        <div className="stat spot"><div className="stat-v"><Num value={st.waitlist.filter((e) => e.status === 'waiting').length} /></div><div className="stat-l">On the waitlist</div></div>
        </div>
      </section>

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

      {qr && st.workspace.join_code && <Modal title="Client QR" onClose={() => setQr(false)}><JoinQr code={st.workspace.join_code} salon={st.workspace.salon} /></Modal>}
      {adding && <Modal title="New appointment" onClose={() => setAdding(false)}><NewAppointment st={st} run={run} onDone={() => setAdding(false)} /></Modal>}
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
  const [DAY_START, DAY_END] = dayRange(st)
  const pct = (min: number) => `${((min - DAY_START) / (DAY_END - DAY_START)) * 100}%`
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60).filter((_, i, all) => all.length <= 13 || i % 2 === 0)
  // On a phone the calendar is wider than the screen: open it at the current time.
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const f = (Math.min(Math.max(now, DAY_START), DAY_END) - DAY_START) / (DAY_END - DAY_START)
    el.scrollLeft = Math.max(0, f * (el.scrollWidth - 112) - 40)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="board" ref={scroller}>
      <div className="board-in">
        <div className="axis" aria-hidden="true">{hours.map((h) => <span key={h} style={{ left: pct(h) }}>{clock(h % 1440)}</span>)}</div>
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

const NOT_ADDED: Record<string, string> = {
  TARGET_BUSY: 'They already have something at that time. Pick another time or someone else.',
  TARGET_OFF_SHIFT: 'That is outside their working hours.',
  TARGET_ABSENT: 'They are marked out today.',
  TOO_SOON: 'That time has already passed.',
  TOO_LARGE: 'The day is full: 300 appointments is the most one day holds.',
  INVALID_VALUE: 'Check the time and length: 5 to 720 minutes.',
  NOT_FOUND: 'That staff member is no longer on the team.',
  NOT_WAITING: 'They are no longer waiting: already booked, or they left the list.',
}

/** Book a client in (someone new, or someone already waiting, so it reaches their phone), or
 *  leave the name blank to add open time the waitlist can be offered. */
function NewAppointment({ st, run, onDone }: { st: State; run: Run; onDone: () => void }) {
  const services = servicesOf(st)
  const waiting = st.waitlist.filter((e) => e.status === 'waiting')
  const [entry, setEntry] = useState('')
  const en = waiting.find((e) => e.id === entry)
  const [service, setService] = useState(services[0]?.id ?? '')
  const sv = services.find((x) => x.id === service)
  const able = st.staff.filter((p) => p.present && (!sv || p.skills.includes(sv.skill)))
  const [staff, setStaff] = useState(able[0]?.id ?? '')
  const who = able.find((p) => p.id === staff) ?? able[0]
  // The first quarter hour that can still be offered to the waitlist (the owner's lead time).
  const next = Math.ceil((st.workspace.now_min + st.workspace.min_lead_min + 1) / 15) * 15
  const [minutes, setMinutes] = useState(String(sv?.minutes ?? 30))
  // Every quarter hour this person is on shift and free for the whole appointment.
  const len = Math.max(5, Number(minutes) || 30)
  const free = useMemo(() => {
    if (!who) return []
    const busy = st.slots.filter((x) => x.staff_id === who.id)
    const out: number[] = []
    for (let m = Math.ceil(Math.max(next, who.shift_start) / 15) * 15; m + len <= Math.min(who.shift_end, 1440); m += 15) {
      if (!busy.some((x) => x.start_min < m + len && x.start_min + x.minutes > m)) out.push(m)
    }
    return out
  }, [st.slots, who, next, len])
  const [start, setStart] = useState<number | null>(null)
  const time = start != null && free.includes(start) ? start : free[0] ?? null
  const [customer, setCustomer] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const pickService = (id: string) => {
    setService(id)
    const n = services.find((x) => x.id === id)
    if (n) setMinutes(String(n.minutes))
  }
  const pickEntry = (id: string) => {
    setEntry(id)
    const e = waiting.find((x) => x.id === id)
    const match = e && services.find((x) => x.name === e.service || x.skill === e.skill)
    if (match) pickService(match.id)
  }
  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!who) return setErr('Nobody who is in today does this service.')
    if (time == null) return setErr(`${who.name} has no free time left today for ${len} minutes. Pick someone else or a shorter length.`)
    setErr(null)
    const name = en ? en.name : customer.trim()
    const r = await run<{ ok: boolean; code?: string }>('add_appointment', {
      p_appt: { staff: who.id, start_min: time, minutes: Number(minutes), customer: en ? null : name || null, entry: en?.id ?? null, service: sv?.name ?? null, skill: sv?.skill ?? null, price_inr: sv?.price_inr ?? null },
    }, (x) => (x.ok ? (name ? `${name} booked at ${clock(time)} with ${who.name}.` : `Open time added at ${clock(time)} with ${who.name}. Offer it from Today.`) : null))
    if (r && !r.ok) setErr(NOT_ADDED[r.code ?? ''] ?? `Not added: ${r.code}`)
    else if (r) onDone()
  }

  return (
    <form className="add" onSubmit={submit} noValidate>
      {waiting.length > 0 && (
        <label className="field">Who
          <Select value={entry} onChange={pickEntry} label="Who"
            choices={[{ value: '', label: 'Someone new, or open time' }, ...waiting.map((e) => ({ value: e.id, label: e.name, hint: `waiting for ${e.service ?? e.skill}` }))]} />
        </label>
      )}
      {!en && <label className="field">Client<input value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={60} autoComplete="off" placeholder="Leave blank to add open time" /></label>}
      <label className="field">Service
        <Select value={service} onChange={pickService} label="Service"
          choices={services.map((x) => ({ value: x.id, label: x.name, hint: `${x.minutes} min${x.price_inr != null ? ` · ${money(x.price_inr)}` : ''}` }))} />
      </label>
      <label className="field">With
        <Select value={who?.id ?? ''} onChange={setStaff} disabled={able.length === 0} placeholder="Nobody in today does this" label="With"
          choices={able.map((p) => ({ value: p.id, label: p.name, hint: `${clock(p.shift_start)}–${clock(Math.min(p.shift_end, 1439))}` }))} />
      </label>
      <div className="field-row">
        <label className="field">Starts today<TimeSelect value={time} onChange={setStart} times={free} label="Starts" empty="Nothing free today" /></label>
        <label className="field">Minutes<input type="number" inputMode="numeric" min={5} max={720} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn is-primary is-big" type="submit" disabled={!who}>{en ? `Book ${en.name.split(' ')[0]}` : customer.trim() ? 'Book it' : 'Add open time'}</button>
      {en && <p className="quiet small">The booking goes to {en.name.split(' ')[0]}’s own page and account, and any offer still out to them is withdrawn.</p>}
    </form>
  )
}
