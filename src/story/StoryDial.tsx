// The Day Dial as art: the same face as src/Dial.tsx (10:00 to 20:00 clockwise over 300 degrees,
// one ring per staff member, an arc per appointment), drawn larger and finer, with the waitlist
// as marks around it. Each part is its own layer at its own depth, so a tilt shows real parallax
// and the sweep and the pulse never repaint the face. The timeline in scenes.ts moves it.
import { useId, type CSSProperties, type ReactNode } from 'react'
import {
  HI, LO, NOW, arjun, eligible, harsh, hhmm, inr, keeper, manav, moveTo, offered, open, reasonOf, recovered,
  shortWhy, slots, stake, staff, toMove, waitlist, winner,
} from './facts'
import { ORBIT, SPAN, ang, arc, gapPath, markAngle, markAt, midOf, pt, ringOf, ringR, segD } from './geo'

const hours = Array.from({ length: (HI - LO) / 60 + 1 }, (_, i) => LO + i * 60)
const quarters = Array.from({ length: (HI - LO) / 15 + 1 }, (_, i) => LO + i * 15).filter((m) => m % 60 !== 0)
const labelled = (h: number) => (h - LO) % (HI - LO > 720 ? 240 : 120) === 0
const fitIds = new Set(eligible.map((e) => e.id))
const movingIds = new Set(toMove.map((s) => s.id))
const gaps = [...open, harsh]
const lit = new Set(gaps.map((s) => s.id))
/** A mark's name sits outside its dot: beside it on the flanks, above or below it at the top and bottom. */
function labelAt(a: number) {
  const s = Math.sin((a * Math.PI) / 180)
  const c = -Math.cos((a * Math.PI) / 180)
  if (Math.abs(s) > 0.4) return { anchor: s > 0 ? 'start' : 'end', dx: s > 0 ? 11 : -11, dy: 4 } as const
  return { anchor: 'middle', dx: 0, dy: c < 0 ? -13 : 20 } as const
}

function Layer({ className = '', z, children, ...rest }: { className?: string; z: number; children: ReactNode } & Record<`data-${string}`, string>) {
  return (
    <svg className={`sd-layer ${className}`} style={{ '--z': z } as CSSProperties} viewBox="-280 -280 560 560" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

export default function StoryDial({ label }: { label: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hx, hy] = midOf(ringOf(harsh.staffId), harsh.startMin, harsh.minutes)
  const handA = ang(NOW)
  const inner = ringR(staff.length - 1)
  const [h1x, h1y] = pt(inner - 16, handA)
  const [h2x, h2y] = pt(200, handA)
  const [tx, ty] = pt(205, handA)
  return (
    <div className="sd" role="img" aria-label={label}>
      {/* At rest the face drifts a degree or so, so it is never quite still; the pointer tilts it further. */}
      <div className="sd-drift">
      <div className="sd-tilt">
        <div className="sd-face">
          <Layer className="sd-bezel" z={0}>
            {/* The bezel turns a little with the scroll, like a crown, and settles home. */}
            <g className="sd-bezel-g">
            <path className="sd-hair" d={arc(184, -SPAN / 2, SPAN / 2)} />
            {quarters.map((m) => {
              const [x1, y1] = pt(188, ang(m))
              const [x2, y2] = pt(192, ang(m))
              return <line key={m} className="sd-q" x1={x1} y1={y1} x2={x2} y2={y2} />
            })}
            {hours.map((h) => {
              const [x1, y1] = pt(186, ang(h))
              const [x2, y2] = pt(labelled(h) ? 198 : 194, ang(h))
              const [nx, ny] = pt(213, ang(h))
              return (
                <g key={h} className="sd-hour">
                  <line x1={x1} y1={y1} x2={x2} y2={y2} />
                  {labelled(h) && <text x={nx} y={ny} dy="0.35em" textAnchor="middle">{hhmm(h % 1440).slice(0, 2)}</text>}
                </g>
              )
            })}
            </g>
          </Layer>

          {staff.map((p, i) => {
            const r = ringR(i)
            return (
              <Layer key={p.id} className="sd-ring" z={4 + i * 5} data-ring={p.id}>
                <path className="sd-track" d={arc(r, -SPAN / 2, SPAN / 2)} pathLength={100} />
                {(p.shift_start > LO || p.shift_end < HI) && <path className="sd-shift" d={arc(r, ang(p.shift_start), ang(p.shift_end))} pathLength={100} />}
                {p.id === arjun.id && <path className="sd-track is-out" data-out d={arc(r, -SPAN / 2, SPAN / 2)} />}
                {slots.filter((s) => s.staffId === p.id).map((s) => {
                  const d = segD(r, s.startMin, s.minutes)
                  return (
                    <g key={s.id} className={`sd-arc ${s.startMin + s.minutes <= NOW ? 'is-past' : ''}`} data-arc={s.id}>
                      {s.status !== 'free' && <path className="sd-seg" d={d} />}
                      {lit.has(s.id) && <path className="sd-ov is-act" data-ov="act" d={d} pathLength={100} />}
                      {movingIds.has(s.id) && <path className="sd-ov is-danger" data-ov="danger" d={d} />}
                    </g>
                  )
                })}
                <path id={`${uid}g${i}`} d={gapPath(r)} fill="none" stroke="none" />
                <text className="sd-name" dominantBaseline="central"><textPath href={`#${uid}g${i}`} startOffset="50%" textAnchor="middle">{p.name}</textPath></text>
                {p.id === arjun.id && <text className="sd-name is-out" data-out dominantBaseline="central"><textPath href={`#${uid}g${i}`} startOffset="50%" textAnchor="middle">{p.name} · out</textPath></text>}
              </Layer>
            )
          })}

          {/* The open gaps glow amber and breathe, each on a layer just above its ring, so the pulse never repaints the face. */}
          {staff.map((p, i) => gaps.some((s) => s.staffId === p.id) && (
            <Layer key={p.id} className="sd-pulse" z={5 + i * 5} data-ring={p.id}>
              {gaps.filter((s) => s.staffId === p.id).map((s) => {
                const d = segD(ringR(i), s.startMin, s.minutes)
                return <g key={s.id} data-arc={s.id} className={s.id === harsh.id ? 'is-later' : undefined}><path className="sd-glow" data-ov="beat" d={d} /><path className="sd-ov is-beat" data-ov="beat" d={d} /></g>
              })}
            </Layer>
          ))}

          <Layer className="sd-orbit" z={24}>
            {/* Manav's appointment at the same time on another ring; the timeline slides it there. */}
            <path className="sd-mover is-danger" data-mover d={segD(ringOf(moveTo.id), manav.startMin, manav.minutes)} />
            <path className="sd-mover" data-mover d={segD(ringOf(moveTo.id), manav.startMin, manav.minutes)} />
            {offered.map((e) => {
              const [x, y] = markAt(e.id)
              return <line key={e.id} className="sd-line" data-offer={e.id} x1={x} y1={y} x2={hx} y2={hy} pathLength={100} />
            })}
            {waitlist.map((e, i) => {
              const a = markAngle(i)
              const [x, y] = pt(ORBIT, a)
              const l = labelAt(a)
              const why = reasonOf(e.id)
              const [ox, oy] = pt(18, a)
              return (
                <g key={e.id} className={`sd-mark ${fitIds.has(e.id) ? 'is-fit' : 'is-no'}`} data-mark={e.id} data-ox={ox.toFixed(1)} data-oy={(oy + 10).toFixed(1)}>
                  <circle className="sd-dot" cx={x} cy={y} r="4" />
                  <circle className="sd-dot is-lit" data-lit cx={x} cy={y} r="4.6" />
                  <text className="sd-who" x={x + l.dx} y={y + l.dy} textAnchor={l.anchor}>{e.name}</text>
                  {why && <text className="sd-why" data-why x={x + l.dx} y={y + l.dy + 12} textAnchor={l.anchor}>{shortWhy(e, why)}</text>}
                </g>
              )
            })}
            {[winner, keeper].map((e) => {
              const [x, y] = markAt(e.id)
              return <circle key={e.id} className="sd-tap" data-tap={e.id} cx={x} cy={y} r="5" data-dx={(hx - x).toFixed(1)} data-dy={(hy - y).toFixed(1)} />
            })}
            {([[winner, 'booked'], [keeper, 'keeps their place']] as const).map(([e, t]) => {
              const a = markAngle(waitlist.indexOf(e))
              const [x, y] = pt(ORBIT, a)
              const l = labelAt(a)
              return <text key={e.id} className={`sd-result ${e === winner ? 'is-won' : ''}`} data-result={e.id} x={x + l.dx} y={y + l.dy + 12} textAnchor={l.anchor}>{t}</text>
            })}
            {/* The loud moment: a wave of lime leaves the refilled slot. */}
            <circle className="sd-wave" data-wave cx={hx} cy={hy} r="8" />
            <g data-ripples />
          </Layer>

          <div className="sd-sweep" aria-hidden="true"><svg viewBox="-280 -280 560 560"><line x1="0" y1="-186" x2="0" y2="-199" /></svg></div>
          <Layer className="sd-hand" z={26}>
            {/* The reading hand: it follows the pointer round the face and reads the time there. */}
            <line className="sd-ghost" data-ghost x1="0" y1={-(inner - 16)} x2="0" y2="-200" />
            <g data-hand>
              <line x1={h1x} y1={h1y} x2={h2x} y2={h2y} />
              <circle className="sd-tip" cx={tx} cy={ty} r="4" />
            </g>
          </Layer>
        </div>

        <div className="sd-center" aria-hidden="true">
          <p className="sd-c" data-c="time"><b>{hhmm(NOW)}</b><small>demo clock</small></p>
          <p className="sd-c" data-c="stake"><b className="is-beat">{inr(stake)}</b><small>at stake</small></p>
          <p className="sd-c" data-c="fits"><b>{eligible.length}<i>/{waitlist.length}</i></b><small>fit the gap</small></p>
          <p className="sd-c" data-c="won"><b className="is-act">{inr(recovered)}</b><small>back in the book</small></p>
          <p className="sd-c" data-c="move"><b className="is-danger">{toMove.length - 1}</b><small>still to move</small></p>
        </div>
      </div>
      </div>
    </div>
  )
}
