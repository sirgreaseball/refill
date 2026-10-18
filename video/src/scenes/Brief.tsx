import { AbsoluteFill } from 'remotion'
import { Glow, Overline, Reveal, SceneFrame, Sfx, Voice, Words, inOut, out, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { arc, pt } from '../Dial'

const sc = sceneOf('brief')

// A watch bezel: 60 ticks drawing on one by one, turning slowly behind everything.
function Bezel({ p, size, rot }: { p: number; size: number; rot: number }) {
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ position: 'absolute', left: 960 - size / 2, top: 540 - size / 2, transform: `rotate(${rot}deg)` }}>
      {Array.from({ length: 60 }, (_, i) => {
        const a = i * 6
        const big = i % 5 === 0
        const [x1, y1] = pt(186, a)
        const [x2, y2] = pt(big ? 172 : 179, a)
        const o = tw(p, i / 75, 0.12)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={big ? C.ink2 : C.ink3} strokeWidth={big ? 1.4 : 0.9} opacity={o} />
      })}
      <path d={arc(160, -150, 150)} stroke={C.line2} strokeWidth={0.8} fill="none" pathLength={100} strokeDasharray={`${tw(p, 0.3, 0.7, inOut) * 100} 100`} />
    </svg>
  )
}

const BRIEF = [
  { k: 'Who', v: 'Salon or tutoring-centre owner', w: 'salon' },
  { k: 'Goal', v: 'Fill slots that are genuinely open', w: 'fill' },
  { k: 'And', v: 'Cut missed sessions', w: 'cut' },
  { k: 'Never', v: 'Overbook', w: 'without' },
]

export function Brief() {
  const t = useSec()
  const bez = tw(t, 0.1, 2.6, inOut)
  const tTitle = at(sc, '01', 'appointment')
  const lift = tw(t, sc.cue['02'] - 0.2, 1.4, inOut)
  return (
    <SceneFrame sc={sc} drift={0.02}>
      <Glow color={C.beat} x={960} y={560} size={1300} opacity={0.08 + lift * 0.04} />
      <div style={{ opacity: 1 - lift * 0.55 }}>
        <Bezel p={bez} size={1180 + lift * 260} rot={t * 1.2} />
      </div>
      <AbsoluteFill style={{ transform: `translateY(${-lift * 250}px) scale(${1 - lift * 0.3})`, alignItems: 'center', justifyContent: 'center' }}>
        <Reveal at={0.5} dur={1.6}>
          <Overline style={{ justifyContent: 'center' }}>Fynd × NMIMS Hyderabad · Product and business simulation</Overline>
        </Reveal>
        <div style={{ height: 40 }} />
        <Reveal at={at(sc, '01', 'case') - 0.15} dur={1.2} blur={14}>
          <div style={{ fontFamily: F.mono, fontSize: 34, letterSpacing: '0.4em', color: C.beat, textAlign: 'center' }}>CASE C29</div>
        </Reveal>
        <div style={{ height: 22 }} />
        <Words text="Appointment Recovery Desk" at={tTitle - 0.1} stagger={0.11} dur={1.3} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 150, color: C.ink, letterSpacing: '-0.02em', justifyContent: 'center', lineHeight: 1 }} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 300, right: 300, top: 470 }}>
        {BRIEF.map((b, i) => {
          const s = at(sc, '02', b.w) - 0.1
          const p = tw(t, s, 1.1)
          const rule = tw(t, s - 0.1, 1.4, inOut)
          const last = i === BRIEF.length - 1
          return (
            <div key={b.k} style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 60, padding: '26px 0' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: 1.5, width: `${rule * 100}%`, background: C.line2 }} />
              <div style={{ width: 200, fontFamily: F.mono, fontSize: 24, letterSpacing: '0.16em', textTransform: 'uppercase', color: last ? C.danger : C.ink3, opacity: p }}>{b.k}</div>
              <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 64, color: C.ink, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, filter: `blur(${(1 - p) * 8}px)`, letterSpacing: '-0.01em' }}>{b.v}</div>
              {last && <div style={{ position: 'absolute', left: 260, bottom: 18, height: 4, borderRadius: 2, background: C.danger, width: 290 * tw(t, s + 0.5, 0.9, out), boxShadow: `0 0 24px ${C.danger}` }} />}
            </div>
          )
        })}
      </div>
      <Voice sc={sc} />
      <Sfx name="bezel" at={0.1} vol={0.55} />
      <Sfx name="whoosh-soft" at={tTitle - 0.3} vol={0.5} />
      <Sfx name="hit-low" at={at(sc, '01', 'case') - 0.1} vol={0.5} />
      {BRIEF.map((b) => <Sfx key={b.w} name="tick" at={at(sc, '02', b.w) - 0.05} vol={0.35} />)}
      <Sfx name="thud" at={at(sc, '02', 'without') + 0.4} vol={0.45} />
    </SceneFrame>
  )
}
