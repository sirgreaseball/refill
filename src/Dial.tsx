// The Day Dial: the day as a watch face. 10:00 to 20:00 runs clockwise around 300 degrees,
// one ring per staff member, each appointment an arc on its ring. Open gaps glow amber and
// pulse, refills draw themselves in lime, red needs moving, and a hand marks the clock.
// The brighter band on a ring is that person's working hours; their name is set along the
// ring in the gap at the bottom, so it never runs into the arcs or off the face.
// Every arc is a button that opens the appointment at the front desk.
import type { DbSlot, State } from './api'
import { kindOf } from './desk/common'
import { clock } from './ui'

// The face covers 10:00 to 20:00, widened to whole hours when the team works earlier or later.
const DAY_START = 600
const DAY_END = 1200
export function dayRange(st: State): [number, number] {
  const lo = Math.min(DAY_START, ...st.staff.map((p) => p.shift_start), ...st.slots.map((s) => s.start_min))
  const hi = Math.max(DAY_END, ...st.staff.map((p) => p.shift_end), ...st.slots.map((s) => s.start_min + s.minutes))
  return [Math.max(0, Math.floor(lo / 60) * 60), Math.min(1440, Math.ceil(hi / 60) * 60)]
}
const C = 200
const SPAN = 300
const angle = (lo: number, hi: number) => (m: number) => -SPAN / 2 + ((Math.min(Math.max(m, lo), hi) - lo) / (hi - lo)) * SPAN
// Hour marks, with a label every two hours, or every four on a long day.
const marks = (lo: number, hi: number) => Array.from({ length: (hi - lo) / 60 + 1 }, (_, i) => lo + i * 60)
const labelled = (h: number, lo: number, hi: number) => (h - lo) % (hi - lo > 720 ? 240 : 120) === 0
const pt = (r: number, a: number, c = C) => [c + r * Math.sin((a * Math.PI) / 180), c - r * Math.cos((a * Math.PI) / 180)] as const
function arc(r: number, a1: number, a2: number, c = C) {
  const [x1, y1] = pt(r, a1, c)
  const [x2, y2] = pt(r, a2, c)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}
// The 60-degree gap at the bottom of a ring, drawn left to right so a name set on it reads upright.
// Returns the path and how many letters fit between the ends of the ring.
function gap(r: number) {
  const pad = (12 / r) * (180 / Math.PI)
  const [x1, y1] = pt(r, 210 - pad)
  const [x2, y2] = pt(r, 150 + pad)
  const room = r * ((60 - 2 * pad) * Math.PI) / 180
  return { d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`, fit: Math.max(3, Math.floor(room / 6.4)) }
}
const fitName = (n: string, fit: number) => (n.length <= fit ? n : `${n.slice(0, fit - 1).trimEnd()}…`)

export default function Dial({ st, onPick, center }: { st: State; onPick: (s: DbSlot) => void; center: { big: string; small: string } }) {
  const now = st.workspace.now_min
  const outer = 168
  const step = Math.min(26, 92 / Math.max(1, st.staff.length - 1))
  const [lo, hi] = dayRange(st)
  const ang = angle(lo, hi)
  const hours = marks(lo, hi)
  const [hx, hy] = pt(outer + 14, ang(now))

  return (
    <svg className="dial" viewBox="0 0 400 400" role="group" aria-label={`Today's appointments, demo clock ${clock(now)}`}>
      <defs>
        {/* The glow covers the whole face. Sized from a shallow arc's own box, it clipped the stroke into a flat bar. */}
        <filter id="dial-glow" filterUnits="userSpaceOnUse" x="0" y="0" width="400" height="400"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {hours.map((h) => {
        const [x1, y1] = pt(outer + 12, ang(h))
        const [x2, y2] = pt(outer + (labelled(h, lo, hi) ? 20 : 16), ang(h))
        const [tx, ty] = pt(outer + 30, ang(h))
        return (
          <g key={h} className="dial-hour">
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            {labelled(h, lo, hi) && <text x={tx} y={ty} dy="0.35em" textAnchor="middle">{clock(h % 1440).slice(0, 2)}</text>}
          </g>
        )
      })}
      {st.staff.map((p, i) => {
        const r = outer - i * step
        const g = gap(r)
        return (
          <g key={p.id} className={`dial-ring ${p.present ? '' : 'is-out'}`}>
            <path className="dial-track" d={arc(r, -SPAN / 2, SPAN / 2)} />
            {(p.shift_start > lo || p.shift_end < hi) && p.shift_end > p.shift_start && (
              <path className="dial-shift" d={arc(r, ang(p.shift_start), ang(p.shift_end))} />
            )}
            {st.slots.filter((s) => s.staff_id === p.id).map((s) => {
              const k = kindOf(st, s)
              const a1 = ang(s.start_min) + 0.9
              const a2 = Math.max(a1 + 0.5, ang(s.start_min + s.minutes) - 0.9)
              return (
                <path key={s.id} className={`dial-seg is-${k} ${s.start_min + s.minutes <= now ? 'is-past' : ''}`} d={arc(r, a1, a2)}
                  pathLength={100} role="button" tabIndex={0}
                  aria-label={`${p.name}, ${clock(s.start_min)}, ${s.service}: ${k === 'open' ? 'open gap' : k === 'risk' ? `${s.customer} needs moving` : k === 'blocked' ? 'held' : s.customer ?? k}`}
                  onClick={() => onPick(s)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(s)}>
                  <title>{`${p.name} · ${clock(s.start_min)} ${s.service ?? ''} · ${k === 'open' ? 'open gap' : s.customer ?? k}`}</title>
                </path>
              )
            })}
            <path id={`dial-gap-${p.id}`} d={g.d} fill="none" stroke="none" />
            <text className="dial-name" dominantBaseline="central"><textPath href={`#dial-gap-${p.id}`} startOffset="50%" textAnchor="middle">{fitName(p.name, g.fit)}</textPath><title>{p.name}</title></text>
          </g>
        )
      })}
      <g className="dial-hand" style={{ transform: `rotate(${ang(now)}deg)` }}>
        <line x1={C} y1={C - (outer - (st.staff.length - 1) * step) + 12} x2={C} y2={C - outer - 10} />
      </g>
      <circle className="dial-hand-tip" cx={hx} cy={hy} r="3.5" />
      <text className="dial-big" x={C} y={C + 6} textAnchor="middle">{center.big}</text>
      <text className="dial-small" x={C} y={C + 30} textAnchor="middle">{center.small}</text>
    </svg>
  )
}

/** A chronograph sub-dial: one value from 0 to 100 on the same 300-degree arc as the Day Dial. */
export function SubDial({ pct, label, sub, out }: { pct: number; label: string; sub: string; out?: boolean }) {
  const v = Math.min(100, Math.max(0, pct))
  return (
    <figure className={`subdial ${out ? 'is-out' : ''}`}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${pct}% of shift booked${out ? ', out today' : ''}`}>
        {[0, 25, 50, 75, 100].map((t) => {
          const [x1, y1] = pt(56, -SPAN / 2 + (t / 100) * SPAN, 60)
          const [x2, y2] = pt(52, -SPAN / 2 + (t / 100) * SPAN, 60)
          return <line key={t} className="subdial-tick" x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
        <path className="dial-track subdial-track" d={arc(44, -SPAN / 2, SPAN / 2, 60)} />
        {v > 0 && <path className="subdial-v" d={arc(44, -SPAN / 2, -SPAN / 2 + Math.max(0.6, (v / 100) * SPAN), 60)} pathLength={100} />}
        <text className="subdial-n" x="60" y="64" textAnchor="middle">{pct}<tspan dx="1">%</tspan></text>
      </svg>
      <figcaption><strong>{label}</strong><small>{sub}</small></figcaption>
    </figure>
  )
}

/** Appointments on one ring of the day's watch face: each arc on the 10:00 to 20:00 ring, the demo clock's hand, and the time in the middle. */
type Seg = { start: number; minutes: number; kind: 'open' | 'refilled' | 'booked' | 'risk' | 'lapsed'; past?: boolean }
export function SlotDial({ segs, now, big, small, label }: { segs: Seg[]; now?: number; big: string; small: string; label: string }) {
  const c = 100
  const r = 76
  const lo = Math.max(0, Math.floor(Math.min(DAY_START, ...segs.map((g) => g.start)) / 60) * 60)
  const hi = Math.min(1440, Math.ceil(Math.max(DAY_END, ...segs.map((g) => g.start + g.minutes)) / 60) * 60)
  const ang = angle(lo, hi)
  const hours = marks(lo, hi)
  const showNow = now != null && now >= lo && now <= hi
  return (
    <svg className="dial slotdial" viewBox="0 0 200 200" role="img" aria-label={label}>
      <defs>
        <filter id="dial-glow" filterUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {hours.map((h) => {
        const [x1, y1] = pt(r + 9, ang(h), c)
        const [x2, y2] = pt(r + (labelled(h, lo, hi) ? 14 : 12), ang(h), c)
        const [tx, ty] = pt(r + 22, ang(h), c)
        return (
          <g key={h} className="dial-hour">
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            {labelled(h, lo, hi) && <text x={tx} y={ty} dy="0.35em" textAnchor="middle">{clock(h % 1440).slice(0, 2)}</text>}
          </g>
        )
      })}
      <path className="dial-track" d={arc(r, -SPAN / 2, SPAN / 2, c)} />
      {segs.map((g) => {
        const a1 = ang(g.start) + 0.8
        return <path key={g.start} className={`dial-seg is-${g.kind} ${g.past ? 'is-past' : ''}`} d={arc(r, a1, Math.max(a1 + 1, ang(g.start + g.minutes) - 0.8), c)} pathLength={100} />
      })}
      {showNow && (() => {
        const [x1, y1] = pt(r - 12, ang(now), c)
        const [x2, y2] = pt(r + 12, ang(now), c)
        return <g className="slotdial-now"><line x1={x1} y1={y1} x2={x2} y2={y2} /><circle cx={x2} cy={y2} r="2.2" /></g>
      })()}
      <text className="dial-big" x={c} y={c + 8} textAnchor="middle">{big}</text>
      <text className="dial-small" x={c} y={c + 26} textAnchor="middle">{small}</text>
    </svg>
  )
}
