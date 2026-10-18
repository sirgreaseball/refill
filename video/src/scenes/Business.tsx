import { Card, Glow, SceneFrame, Sfx, Tag, Voice, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { Icon, Persona } from '../ui'

const sc = sceneOf('business')

export function Business() {
  const t = useSec()
  const tSub = at(sc, '23', 'subscription')
  const tPilot = at(sc, '23', 'pilot')
  const tFilled = at(sc, '23', 'filled')
  const tNo = at(sc, '23', 'noshows')
  const tStaff = at(sc, '23', 'staff')
  const tSyn = at(sc, '24', 'synthetic')
  const tEarn = at(sc, '24', 'earn')
  const sub = tw(t, tSub - 0.4, 1.1)
  const pilot = tw(t, tPilot - 0.3, 1.1)
  const days = tw(t, tPilot, 1.8, inOut)
  const fillDays = tw(t, tEarn - 0.1, 2.0, inOut)
  const stamp = tw(t, tSyn - 0.05, 0.5)
  const metrics: [string, number, string][] = [['Filled cancellations', tFilled, 'share of cancelled slots refilled'], ['No-show rate', tNo, 'before vs during the pilot'], ['Staff correction effort', tStaff, 'minutes the desk spends fixing'], ]

  return (
    <SceneFrame sc={sc} drift={0.02}>
      <Glow color={C.act} x={1300} y={560} size={1000} opacity={0.06 + 0.08 * fillDays} />
      <Persona at={0.1} n="BUSINESS" label="The model and the pilot" sub="Salon or tutoring-centre owner" />

      <div style={{ position: 'absolute', left: 120, top: 260, width: 600, opacity: sub, transform: `translateY(${(1 - sub) * 40}px)`, filter: `blur(${(1 - sub) * 10}px)` }}>
        <Card style={{ padding: '44px 46px', height: 640 }}>
          <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.ink3 }}>PRICING</div>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 64, color: C.ink, marginTop: 14, lineHeight: 1.05 }}>One subscription per location</div>
          <div style={{ marginTop: 40 }}>
            {['Kesar Salon · Jubilee Hills', 'A tutoring centre', 'The next location'].map((n, i) => {
              const p = tw(t, tSub + 0.2 + i * 0.2, 0.8)
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 0', borderTop: `1px solid ${C.line}`, opacity: p * (i === 2 ? 0.45 : 1), transform: `translateX(${(1 - p) * 20}px)` }}>
                  <Icon name="pin" size={30} color={i === 0 ? C.act : C.ink2} />
                  <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 30, color: C.ink }}>{n}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: F.mono, fontSize: 20, color: C.ink3 }}>/ month</span>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 26, color: C.ink3, marginTop: 30 }}>Price, cost to serve and the first customer are tested in the pilot.</div>
        </Card>
      </div>

      <div style={{ position: 'absolute', left: 780, right: 120, top: 260, opacity: pilot, transform: `translateY(${(1 - pilot) * 40}px)` }}>
        <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.act }}>NEXT · 30-DAY PILOT · ONE REAL CALENDAR</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 30, height: 90, alignItems: 'flex-end' }}>
          {Array.from({ length: 30 }, (_, i) => {
            const on = days * 30 > i
            const lit = fillDays * 30 > i
            return <div key={i} style={{ flex: 1, height: i % 7 === 0 ? 90 : 60, borderRadius: 6, background: lit ? C.act : on ? C.surface3 : 'transparent', border: `1.5px solid ${on ? (lit ? C.act : C.line2) : 'transparent'}`, boxShadow: lit ? `0 0 14px -2px ${C.act}` : 'none' }} />
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 20, color: C.ink3, marginTop: 12 }}><span>DAY 1</span><span>DAY 30</span></div>
        <div style={{ display: 'flex', gap: 24, marginTop: 50 }}>
          {metrics.map(([k, s, note]) => {
            const p = tw(t, s - 0.25, 0.9)
            return (
              <div key={k} style={{ flex: 1, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
                <Card style={{ padding: '30px 30px', height: 270 }}>
                  <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 84, color: C.ink3, lineHeight: 1 }}>—</div>
                  <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 30, color: C.ink, marginTop: 24 }}>{k}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 22, color: C.ink3, marginTop: 8 }}>{note}</div>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* the honesty stamp */}
      <div style={{ position: 'absolute', right: 120, top: 100, display: 'flex', opacity: stamp, transform: `scale(${1.15 - stamp * 0.15})` }}>
        <Tag color={C.beat} style={{ fontSize: 26, padding: '12px 24px' }}>ALL DATA SYNTHETIC · NO LIVE REVENUE CLAIMED</Tag>
      </div>

      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={tSub - 0.4} vol={0.3} />
      {[0, 1, 2].map((i) => <Sfx key={i} name="pop" at={tSub + 0.2 + i * 0.2} vol={0.25} rate={1 + i * 0.1} />)}
      <Sfx name="riser-short" at={tPilot - 0.2} vol={0.25} />
      {metrics.map(([k, s]) => <Sfx key={k} name="tick" at={s - 0.2} vol={0.35} />)}
      <Sfx name="stamp" at={tSyn - 0.05} vol={0.5} />
      <Sfx name="shimmer" at={tEarn - 0.1} vol={0.35} />
    </SceneFrame>
  )
}
