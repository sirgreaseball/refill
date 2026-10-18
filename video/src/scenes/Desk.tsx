import { AbsoluteFill } from 'remotion'
import { Glow, SceneFrame, Sfx, Tag, Voice, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { Dial, slotPoint } from '../Dial'
import { Btn, Icon, Persona } from '../ui'

const sc = sceneOf('desk')

// Kabir's 12:00 hour, matched against the waitlist with the engine's own rules.
const FITS = [
  ['Meera', 'Hair spa', '60 min'],
  ['Sameer', 'Manicure', '45 min'],
  ['Omar', 'Haircut', '30 min'],
  ['Tanvi', 'Gel polish', '60 min'],
  ['Vikram', 'Blow-dry', '30 min'],
  ['Ira', 'Manicure', '45 min'],
]
const SKIPS: [string, string, string][] = [
  ['Arnav', 'NO_CONSENT', 'consent'],
  ['Nisha', 'NO_CONSENT', 'consent'],
  ['Fatima', 'NO_CONSENT', 'consent'],
  ['Yusuf', 'NO_CONSENT', 'consent'],
  ['Rhea', 'SKILL_MISMATCH', 'skill'],
  ['Naina', 'SKILL_MISMATCH', 'skill'],
  ['Leela', 'DURATION_TOO_LONG', 'time'],
  ['Aarav', 'DURATION_TOO_LONG', 'time'],
  ['Zoya', 'NOT_AVAILABLE', 'time'],
  ['Kiran', 'NOT_AVAILABLE', 'time'],
  ['Priya', 'NOT_AVAILABLE', 'time'],
]

const SIZE = 880
export function Desk() {
  const t = useSec()
  const t8 = sc.cue['08']
  const t10 = sc.cue['10']
  const t11 = sc.cue['11']
  const tCancel = at(sc, '09', 'cancels')
  const tGlow = at(sc, '09', 'glow')
  const build = tw(t, t8 - 0.6, 3.0, inOut)
  const ringT = at(sc, '08', 'ring')
  const rings = [0, 1, 2, 3].map((i) => tw(t, ringT + i * 0.18, 0.4) * (1 - tw(t, ringT + 1.2 + i * 0.1, 0.8)))
  const boost = tw(t, at(sc, '08', 'arc') - 0.1, 0.5) * (1 - tw(t, at(sc, '08', 'arc') + 1.0, 1.0))
  const open = t > tCancel
  const zoom = tw(t, tCancel - 0.3, 1.6, inOut) * (1 - tw(t, t10 - 0.6, 1.4, inOut))
  const aside = tw(t, t10 - 0.6, 1.6, inOut)

  // dial placement: centred, then aside to the left
  const L0 = 960 - SIZE / 2
  const T0 = 560 - SIZE / 2
  const [kx, ky] = slotPoint('K2', SIZE, L0, T0)
  const s = 1 + zoom * 0.55
  const camX = zoom * (960 - kx * s) + aside * -240
  const camY = zoom * (520 - ky * s) + aside * 196
  const dialScale = s * (1 - aside * 0.26)

  const panel = tw(t, t10 - 0.2, 1.3)
  const tFits = at(sc, '10', 'fits')
  const tSkip = at(sc, '10', 'skipped')
  const tTap = at(sc, '11', 'tap')
  const tDb = at(sc, '11', 'database')
  const scan = tw(t, tDb - 0.1, 1.6, inOut)
  const toast = tw(t, tCancel + 0.1, 0.9) * (1 - tw(t, t10 - 0.8, 0.8))

  return (
    <SceneFrame sc={sc} drift={0.02}>
      <Glow color={C.beat} x={open ? 960 - aside * 490 : 960} y={520 + aside * 90} size={1100} opacity={open ? 0.12 + 0.1 * tw(t, tGlow - 0.2, 1) : 0.0} />
      <Persona at={0.3} n="POV 01" label="Front desk" sub="Kesar Salon, today" color={C.ink} />

      <AbsoluteFill style={{ transform: `translate(${camX}px, ${camY}px) scale(${dialScale})`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: L0, top: T0 }}>
          <Dial size={SIZE} build={build} now={675} big="11:15" small="Kesar Salon · today" rings={rings} boost={boost}
            kinds={open ? { K2: 'open' } : {}} focus={open ? 'K2' : null} dim={zoom * 0.8} />
        </div>
      </AbsoluteFill>

      {/* toast: the late cancellation */}
      <div style={{ position: 'absolute', right: 120, top: 96, transform: `translateY(${(1 - toast) * -24}px)`, opacity: toast, display: 'flex', alignItems: 'center', gap: 18, padding: '20px 32px', borderRadius: 20, background: 'rgba(24,24,28,0.82)', border: `1.5px solid ${C.line2}`, backdropFilter: 'blur(20px)', fontFamily: F.sans, fontSize: 30, color: C.ink, whiteSpace: 'nowrap' }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: C.beat, boxShadow: `0 0 16px ${C.beat}` }} />
        Harsh cancelled 12:00 · Hair spa with Kabir
        <Tag color={C.danger}>LATE · 45 MIN NOTICE</Tag>
      </div>

      {/* the matching panel */}
      <div style={{ position: 'absolute', left: 900, top: 190, width: 900, opacity: panel, transform: `translateX(${(1 - panel) * 60}px)`, filter: `blur(${(1 - panel) * 10}px)` }}>
        <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.beat }}>OPEN GAP · KABIR · 12:00 – 13:00</div>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 62, color: C.ink, marginTop: 10 }}>Who can take it</div>
        <div style={{ display: 'flex', gap: 28, marginTop: 34 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.mono, fontSize: 22, color: C.act, letterSpacing: '0.12em', marginBottom: 14, opacity: tw(t, tFits - 0.2, 0.6) }}>FITS · 6</div>
            {FITS.map(([n, svc, min], i) => {
              const p = tw(t, tFits - 0.1 + i * 0.07, 0.8)
              const sent = i < 3
              const checked = sent && scan * 3.4 > i + 0.4
              const offered = tw(t, at(sc, '11', 'sends') - 0.1 + i * 0.1, 0.6) * (sent ? 1 : 0)
              return (
                <div key={n} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', marginBottom: 8, borderRadius: 14, background: sent ? `rgba(198,242,78,${0.04 + offered * 0.06})` : C.surface, border: `1.5px solid ${sent ? `rgba(198,242,78,${0.12 + offered * 0.3})` : C.line}`, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 28, color: C.ink }}>{n}</span>
                  <span style={{ fontFamily: F.sans, fontSize: 24, color: C.ink2, marginLeft: 'auto', marginRight: 18 }}>{svc} · {min}</span>
                  <span style={{ width: 30, display: 'flex', justifyContent: 'center' }}>{checked ? <Icon name="check" size={28} color={C.act} sw={2.8} /> : offered > 0.5 ? <Icon name="bolt" size={24} color={C.act} /> : null}</span>
                </div>
              )
            })}
          </div>
          <div style={{ flex: 1.05 }}>
            <div style={{ fontFamily: F.mono, fontSize: 22, color: C.ink3, letterSpacing: '0.12em', marginBottom: 14, opacity: tw(t, tSkip - 0.2, 0.6) }}>NOT OFFERED · 11</div>
            {SKIPS.map(([n, code, w], i) => {
              const p = tw(t, tSkip - 0.1 + i * 0.045, 0.7)
              const hi = tw(t, at(sc, '10', w, 12) - 0.15, 0.4) * (1 - tw(t, at(sc, '10', w, 12) + 1.1, 0.6))
              const col = code === 'NO_CONSENT' ? C.danger : code === 'SKILL_MISMATCH' ? C.beat : C.ink2
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', opacity: p * (0.55 + 0.45 * hi + (hi > 0 ? 0 : 0.2)), transform: `translateX(${hi * 10}px)` }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 25, color: hi > 0.3 ? C.ink : C.ink2 }}>{n}</span>
                  <Tag color={col} style={{ fontSize: 17, boxShadow: hi > 0 ? `0 0 ${hi * 24}px -4px ${col}` : 'none' }}>{code}</Tag>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 26, opacity: tw(t, t11 - 0.6, 0.8) }}>
          <Btn at={tTap + 0.05} w={330}>Send 3 offers</Btn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.mono, fontSize: 21, color: scan > 0 ? C.act : C.ink3, opacity: tw(t, tDb - 0.2, 0.6) }}>
            <Icon name="db" size={30} color={scan > 0 ? C.act : C.ink3} />
            send_offers() re-checks every rule
          </div>
        </div>
        {/* the database's second look, a beam down the offered rows */}
        {scan > 0 && scan < 1 && <div style={{ position: 'absolute', left: -10, width: 450, top: 245 + scan * 210, height: 3, background: C.act, boxShadow: `0 0 26px 6px ${C.act}66`, opacity: Math.sin(scan * Math.PI) }} />}
      </div>

      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={t8 - 0.6} vol={0.4} />
      {[0, 1, 2, 3].map((i) => <Sfx key={i} name="tick" at={ringT + i * 0.18} vol={0.28} rate={1 + i * 0.08} />)}
      <Sfx name="crack" at={tCancel - 0.02} vol={0.55} />
      <Sfx name="whoosh" at={tCancel - 0.3} vol={0.3} />
      <Sfx name="shimmer" at={tGlow - 0.5} vol={0.55} />
      <Sfx name="whoosh-soft" at={t10 - 0.6} vol={0.35} />
      {FITS.map((_, i) => <Sfx key={i} name="count" at={tFits - 0.1 + i * 0.07} vol={0.35} />)}
      {['consent', 'skill', 'time'].map((w) => <Sfx key={w} name="deny" at={at(sc, '10', w, 12) - 0.12} vol={0.3} />)}
      <Sfx name="tap" at={tTap + 0.05} vol={0.7} />
      <Sfx name="send" at={at(sc, '11', 'sends') - 0.05} vol={0.45} />
      <Sfx name="scan" at={tDb - 0.1} vol={0.4} />
      {[0, 1, 2].map((i) => <Sfx key={i} name="tick" at={tDb - 0.1 + ((i + 0.4) / 3.4) * 1.6 * 0.8} vol={0.35} rate={1.2} />)}
    </SceneFrame>
  )
}
