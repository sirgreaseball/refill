import { AbsoluteFill } from 'remotion'
import { Glow, SceneFrame, Sfx, Tag, Voice, Words, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { Icon } from '../ui'

const sc = sceneOf('usp')

// One layer of the stack, seen from above at an angle.
function Plane({ p, y, label, sub, solid, glow }: { p: number; y: number; label: string; sub: string; solid?: boolean; glow?: number }) {
  return (
    <div style={{ position: 'absolute', left: 960 - 420, top: y, width: 840, height: 480, transform: `perspective(2200px) rotateX(58deg) rotateZ(-34deg) translateZ(${(1 - p) * -200}px)`, opacity: p, borderRadius: 40, border: `2px solid ${solid ? `rgba(198,242,78,${0.25 + (glow ?? 0) * 0.5})` : C.line2}`, background: solid ? `linear-gradient(135deg, #1b1f12, ${C.surface})` : 'rgba(244,241,234,0.035)', boxShadow: solid ? `0 0 ${80 + (glow ?? 0) * 120}px -30px ${C.act}` : 'none', backdropFilter: solid ? undefined : 'blur(6px)' }}>
      <div style={{ position: 'absolute', left: 44, bottom: 84, fontFamily: F.mono, fontSize: 30, letterSpacing: '0.2em', color: solid ? C.act : C.ink2 }}>{label}</div>
      <div style={{ position: 'absolute', left: 44, bottom: 36, fontFamily: F.sans, fontSize: 30, color: C.ink3 }}>{sub}</div>
      {/* a grid etched in the plane */}
      <svg width={840} height={480} style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
        {Array.from({ length: 9 }, (_, i) => <line key={'v' + i} x1={i * 105} y1={0} x2={i * 105} y2={480} stroke={C.line2} />)}
        {Array.from({ length: 5 }, (_, i) => <line key={'h' + i} x1={0} y1={i * 120} x2={840} y2={i * 120} stroke={C.line2} />)}
      </svg>
    </div>
  )
}

export function Usp() {
  const t = useSec()
  const t20 = sc.cue['20']
  const t21 = sc.cue['21']
  const tApp = at(sc, '20', 'app')
  const tDb = at(sc, '20', 'database')
  const head = tw(t, tApp - 0.6, 1.2, inOut)
  const app = tw(t, tApp - 0.2, 1.2)
  const db = tw(t, tDb - 0.15, 1.2)
  const drop = tw(t, tDb + 0.2, 1.4, inOut)
  const aside = tw(t, t21 - 0.5, 1.6, inOut)
  const tSeal = at(sc, '21', 'guaranteed')
  const seal = tw(t, tSeal - 0.1, 0.9)

  const G = [
    { w: 'sixty', title: 'A 60-minute service never takes a 30-minute slot', code: 'DURATION_TOO_LONG' },
    { w: 'consent', title: 'Consent checked at outreach, and again at booking', code: 'NO_CONSENT' },
    { w: 'one', title: 'One slot, one booking', code: 'bookings_one_per_slot' },
  ]

  return (
    <SceneFrame sc={sc} drift={0.02}>
      <Glow color={C.act} x={960 - aside * 520} y={640} size={1200} opacity={0.12 * db} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `translateY(${-head * 360}px) scale(${1 - head * 0.45})`, opacity: 1 - aside }}>
        <Words text="Here's what makes Refill different." at={t20 - 0.1} stagger={0.08} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 104, color: C.ink, justifyContent: 'center' }} wordStyle={(i) => ({ color: i === 3 ? C.act : C.ink })} />
      </AbsoluteFill>

      <AbsoluteFill style={{ transform: `translate(${-aside * 520}px, ${aside * 30}px) scale(${1 - aside * 0.22})` }}>
        <Plane p={db} y={560} label="DATABASE" sub="the last word on every rule" solid glow={seal} />
        {/* every rule passes down into the database: light running through both layers */}
        {[-70, 0, 70].map((dx, i) => (
          <div key={i} style={{ position: 'absolute', left: 958 + dx, top: 330, width: 4, height: 470 * drop, borderRadius: 2, opacity: 0.85 * drop, background: `repeating-linear-gradient(180deg, ${C.act} 0 18px, transparent 18px 40px)`, backgroundPositionY: `${(t * 90 + i * 13) % 40}px`, boxShadow: `0 0 16px ${C.act}88`, maskImage: 'linear-gradient(transparent, black 20%, black 80%, transparent)' }} />
        ))}
        <Plane p={app} y={250 - drop * 30} label="APP" sub="screens can show anything" />
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 900, right: 110, top: 240, opacity: tw(t, t21 - 0.3, 1.0) }}>
        {G.map((g, i) => {
          const s = at(sc, '21', g.w) - 0.2
          const p = tw(t, s, 1.0)
          const ticks = g.w === 'consent' ? [at(sc, '21', 'outreach'), at(sc, '21', 'booking')] : []
          return (
            <div key={g.w} style={{ display: 'flex', gap: 30, alignItems: 'flex-start', padding: '34px 0', borderTop: `1.5px solid ${C.line}`, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, filter: `blur(${(1 - p) * 8}px)` }}>
              <div style={{ width: 84, height: 84, borderRadius: 24, flex: 'none', background: seal > 0.5 ? `${C.act}22` : C.surface2, border: `1.5px solid ${seal > 0.5 ? C.act + '88' : C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + Math.max(0, 1 - Math.abs(t - (tSeal + i * 0.12)) / 0.2) * 0.12})` }}>
                <Icon name="lock" size={40} color={seal > 0.5 ? C.act : C.ink} />
              </div>
              <div>
                <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 50, color: C.ink, lineHeight: 1.1 }}>{g.title}</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 16, alignItems: 'center' }}>
                  <Tag color={C.ink2}>{g.code}</Tag>
                  {ticks.map((tk, j) => {
                    const q = tw(t, tk - 0.1, 0.5)
                    return <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: F.sans, fontSize: 24, color: C.act, opacity: q }}><Icon name="check" size={24} color={C.act} sw={2.6} />{j ? 'at booking' : 'at outreach'}</span>
                  })}
                </div>
              </div>
            </div>
          )
        })}
        <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 36, color: C.act, marginTop: 20, opacity: seal, transform: `translateY(${(1 - seal) * 14}px)` }}>Guaranteed by the data itself.</div>
      </div>

      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={t20 - 0.3} vol={0.3} />
      <Sfx name="whoosh" at={tApp - 0.2} vol={0.3} />
      <Sfx name="hit-low" at={tDb - 0.1} vol={0.45} />
      <Sfx name="scan" at={tDb + 0.2} vol={0.25} />
      <Sfx name="whoosh-soft" at={t21 - 0.5} vol={0.3} />
      {G.map((g) => <Sfx key={g.w} name="tick" at={at(sc, '21', g.w) - 0.2} vol={0.35} />)}
      <Sfx name="tick" at={at(sc, '21', 'outreach') - 0.1} vol={0.3} rate={1.3} />
      <Sfx name="tick" at={at(sc, '21', 'booking') - 0.1} vol={0.3} rate={1.3} />
      {[0, 1, 2].map((i) => <Sfx key={i} name="lock" at={tSeal + i * 0.12} vol={0.4} />)}
      <Sfx name="bloom" at={tSeal + 0.3} vol={0.3} />
    </SceneFrame>
  )
}
