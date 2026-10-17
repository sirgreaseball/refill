// The Day Dial: the day as a watch face. 10:00 to 20:00 runs clockwise around 300 degrees,
// one ring per staff member, each appointment an arc on its ring. Open gaps glow amber and
// pulse, refills draw themselves in lime, red needs moving, and a hand marks the demo clock.
// Every arc is a button that opens the appointment at the front desk.
import type { DbSlot, State } from './api'
import { kindOf } from './desk/common'
import { clock } from './ui'

const DAY_START = 600
const DAY_END = 1200
const C = 200
const SPAN = 300
const ang = (m: number) => -SPAN / 2 + ((Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / (DAY_END - DAY_START)) * SPAN
const pt = (r: number, a: number) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)] as const
function arc(r: number, a1: number, a2: number) {
  const [x1, y1] = pt(r, a1)
  const [x2, y2] = pt(r, a2)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export default function Dial({ st, onPick, center }: { st: State; onPick: (s: DbSlot) => void; center: { big: string; small: string } }) {
  const now = st.workspace.now_min
  const outer = 168
  const step = Math.min(26, 92 / Math.max(1, st.staff.length - 1))
  const hours = Array.from({ length: 11 }, (_, i) => DAY_START + i * 60)
  const [hx, hy] = pt(outer + 14, ang(now))

  return (
    <svg className="dial" viewBox="0 0 400 400" role="group" aria-label={`Today's appointments, demo clock ${clock(now)}`}>
      <defs>
        <filter id="dial-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {hours.map((h) => {
        const [x1, y1] = pt(outer + 12, ang(h))
        const [x2, y2] = pt(outer + (h % 120 === 0 ? 20 : 16), ang(h))
        const [tx, ty] = pt(outer + 30, ang(h))
        return (
          <g key={h} className="dial-hour">
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            {h % 120 === 0 && <text x={tx} y={ty} dy="0.35em" textAnchor="middle">{clock(h).slice(0, 2)}</text>}
          </g>
        )
      })}
      {st.staff.map((p, i) => {
        const r = outer - i * step
        return (
          <g key={p.id} className={`dial-ring ${p.present ? '' : 'is-out'}`}>
            <path className="dial-track" d={arc(r, -SPAN / 2, SPAN / 2)} />
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
            <text className="dial-name" x={pt(r, -SPAN / 2 - 4)[0] - 4} y={pt(r, -SPAN / 2 - 4)[1] + 4} textAnchor="end">{p.name}</text>
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
