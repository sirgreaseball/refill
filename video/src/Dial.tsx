// The Day Dial, frame-driven: the app's geometry (src/Dial.tsx in Refill), with every state
// change animated from the timeline instead of CSS.
import React from 'react'
import { C as DARK, F } from './theme'
import day from './data/day.json'
import { tw, useSec } from './kit'

const C = 200
const SPAN = 300
const LO = 600
const HI = 1200
export const ang = (m: number) => -SPAN / 2 + ((Math.min(Math.max(m, LO), HI) - LO) / (HI - LO)) * SPAN
export const pt = (r: number, a: number, c = C) => [c + r * Math.sin((a * Math.PI) / 180), c - r * Math.cos((a * Math.PI) / 180)] as const
export function arc(r: number, a1: number, a2: number, c = C) {
  const [x1, y1] = pt(r, a1, c)
  const [x2, y2] = pt(r, a2, c)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export type Kind = 'booked' | 'open' | 'refilled' | 'risk' | 'held' | 'free'
export const OUTER = 168
export const STEP = 26
export const ringOf = (staff: string) => OUTER - day.staff.findIndex((p) => p.id === staff) * STEP

type Props = {
  build?: number // 0..1 the face drawing itself
  kinds?: Record<string, Kind>
  refill?: Record<string, number> // lime draw progress per slot
  now?: number // minutes, the hand
  big?: string
  small?: string
  out?: string[] // staff ids who are out
  focus?: string | null // slot to single out; the rest dim
  dim?: number // 0..1 how much the rest dims
  size?: number
  style?: React.CSSProperties
  boost?: number // 0..1 brighten booked arcs
  rings?: number[] // 0..1 highlight per ring
  palette?: Palette // colours; the dark tokens unless a light deck asks otherwise
}
export type Palette = typeof DARK & { inkRgb?: string; outTrack?: string }

export function Dial({ build = 1, kinds = {}, refill = {}, now = 675, big, small, out = [], focus = null, dim = 0, size = 900, style, boost = 0, rings = [], palette }: Props) {
  const K: Palette = palette ?? DARK
  const t = useSec()
  const hours = Array.from({ length: 11 }, (_, i) => LO + i * 60)
  const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.6))
  const [hx, hy] = pt(OUTER + 14, ang(now))
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ overflow: 'visible', ...style }}>
      <defs>
        <filter id="glow" filterUnits="userSpaceOnUse" x="-100" y="-100" width="600" height="600">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {hours.map((h, i) => {
        const p = tw(build, 0.02 * i, 0.4)
        const lab = (h - LO) % 120 === 0
        const [x1, y1] = pt(OUTER + 12, ang(h))
        const [x2, y2] = pt(OUTER + (lab ? 20 : 16), ang(h))
        const [tx, ty] = pt(OUTER + 31, ang(h))
        return (
          <g key={h} opacity={p}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={K.ink3} strokeWidth={1.2} />
            {lab && <text x={tx} y={ty} dy="0.35em" textAnchor="middle" fill={K.ink3} style={{ font: `500 10px ${F.mono}` }}>{String(h / 60)}</text>}
          </g>
        )
      })}
      {day.staff.map((p, i) => {
        const r = OUTER - i * STEP
        const isOut = out.includes(p.id)
        const rp = tw(build, 0.08 + i * 0.07, 0.55)
        const pad = (12 / r) * (180 / Math.PI)
        const [gx1, gy1] = pt(r, 210 - pad)
        const [gx2, gy2] = pt(r, 150 + pad)
        return (
          <g key={p.id}>
            <path d={arc(r, -SPAN / 2, SPAN / 2)} fill="none" stroke={isOut ? K.outTrack ?? '#3a2422' : K.surface3} strokeWidth={15} strokeLinecap="round" pathLength={100} strokeDasharray={`${rp * 100} 100`} />
            {(rings[i] ?? 0) > 0 && <path d={arc(r, -SPAN / 2, SPAN / 2)} fill="none" stroke={K.ink} strokeOpacity={0.14 * rings[i]} strokeWidth={19} strokeLinecap="round" />}
            {day.slots.filter((s) => s.staff === p.id).map((s, j) => {
              const k: Kind = kinds[s.id] ?? (s.status === 'free' ? 'free' : 'booked')
              const sp = tw(build, 0.3 + i * 0.06 + j * 0.035, 0.5)
              const a1 = ang(s.start) + 0.9
              const a2 = Math.max(a1 + 0.5, ang(s.start + s.min) - 0.9)
              const d = arc(r, a1, a2)
              const faded = focus && focus !== s.id ? 1 - dim * 0.75 : 1
              const past = s.start + s.min <= now ? 0.32 : 1
              const lime = refill[s.id] ?? 0
              if (k === 'free') return null
              const stroke = k === 'open' ? K.beat : k === 'risk' ? K.danger : k === 'refilled' ? K.act : k === 'held' ? K.ink3 : `rgba(${K.inkRgb ?? '244,241,234'},${0.22 + 0.45 * boost})`
              return (
                <g key={s.id} opacity={sp * faded * past}>
                  <path d={d} fill="none" stroke={stroke} strokeWidth={13} strokeLinecap={k === 'held' ? 'butt' : 'round'} strokeDasharray={k === 'held' ? '2 3' : undefined}
                    filter={k === 'open' || k === 'risk' ? 'url(#glow)' : undefined} opacity={k === 'open' ? pulse : 1} />
                  {lime > 0 && <path d={d} fill="none" stroke={K.act} strokeWidth={13} strokeLinecap="round" pathLength={100} strokeDasharray={`${lime * 100} 100`} filter="url(#glow)" />}
                </g>
              )
            })}
            <path id={`gap-${p.id}`} d={`M ${gx1.toFixed(2)} ${gy1.toFixed(2)} A ${r} ${r} 0 0 0 ${gx2.toFixed(2)} ${gy2.toFixed(2)}`} fill="none" />
            <text dominantBaseline="central" fill={isOut ? K.danger : K.ink2} opacity={rp} style={{ font: `600 10.5px ${F.sans}` }}>
              <textPath href={`#gap-${p.id}`} startOffset="50%" textAnchor="middle">{p.name}</textPath>
            </text>
          </g>
        )
      })}
      <g opacity={tw(build, 0.6, 0.4)} style={{ transform: `rotate(${ang(now)}deg)`, transformOrigin: '200px 200px' }}>
        <line x1={C} y1={C - (OUTER - 3 * STEP) + 12} x2={C} y2={C - OUTER - 10} stroke={K.ink} strokeWidth={1.6} strokeLinecap="round" />
      </g>
      <circle cx={hx} cy={hy} r={3.5} fill={K.act} opacity={tw(build, 0.6, 0.4)} />
      {big && <text x={C} y={C + 6} textAnchor="middle" fill={K.ink} opacity={tw(build, 0.5, 0.5)} style={{ font: `500 54px ${F.display}`, fontVariantNumeric: 'tabular-nums' }}>{big}</text>}
      {small && <text x={C} y={C + 30} textAnchor="middle" fill={K.ink2} opacity={tw(build, 0.6, 0.5)} style={{ font: `500 11px ${F.mono}`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{small}</text>}
    </svg>
  )
}

// Where a slot's arc sits on screen (centre of the arc) for a dial of `size` px placed at (left, top).
export function slotPoint(id: string, size: number, left: number, top: number) {
  const s = day.slots.find((x) => x.id === id)!
  const [x, y] = pt(ringOf(s.staff), ang(s.start + s.min / 2))
  return [left + (x / 400) * size, top + (y / 400) * size] as const
}
