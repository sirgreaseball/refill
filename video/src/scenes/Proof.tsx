import { Glow, SceneFrame, Sfx, Voice, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { Icon, Persona } from '../ui'

const sc = sceneOf('proof')
const CHECKS: [string, number][] = [
  ['A 60-minute request cannot occupy a 30-minute slot', 10],
  ['Two requests, one slot: one booking, one waitlist entry', 10],
  ['No contact consent: excluded from outreach', 5],
]

export function Proof() {
  const t = useSec()
  const tLab = at(sc, '22', 'lab')
  const tCheck = at(sc, '22', 'check')
  const tReal = at(sc, '22', 'real')
  const passed = CHECKS.filter((_, i) => t > tCheck + i * 0.35).length
  const pts = CHECKS.slice(0, passed).reduce((a, c) => a + c[1], 0)
  const big = tw(t, tLab - 0.3, 1.2)
  const race = tw(t, tReal - 0.1, 0.9)
  return (
    <SceneFrame sc={sc} drift={0.03}>
      <Glow color={C.act} x={520} y={560} size={1000} opacity={0.08 + 0.1 * (passed / 3)} />
      <Persona at={0.1} n="PROOF" label="The Lab" sub="fillthechair.vercel.app/#/lab" />
      <div style={{ position: 'absolute', left: 150, top: 300, opacity: big, transform: `scale(${0.92 + big * 0.08})`, transformOrigin: '0 50%' }}>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 330, lineHeight: 0.9, color: passed === 3 ? C.act : C.ink, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{passed}<span style={{ color: C.ink3 }}>/3</span></div>
        <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: '0.16em', color: C.ink2, marginTop: 20 }}>CASE CHECKS PASS · {pts}/25 POINTS</div>
      </div>
      <div style={{ position: 'absolute', left: 860, right: 120, top: 280 }}>
        {CHECKS.map(([k, n], i) => {
          const s = tCheck + i * 0.35
          const p = tw(t, s - 0.4, 0.8)
          const ok = tw(t, s, 0.4)
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '28px 0', borderTop: `1.5px solid ${C.line}`, opacity: p }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, flex: 'none', border: `2px solid ${ok > 0 ? C.act : C.line2}`, background: `rgba(198,242,78,${ok * 0.15})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ transform: `scale(${ok})` }}><Icon name="check" size={30} color={C.act} sw={2.8} /></div>
              </div>
              <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 34, color: C.ink, flex: 1 }}>{k}</div>
              <div style={{ fontFamily: F.mono, fontSize: 24, color: ok > 0.5 ? C.act : C.ink3 }}>{n} pts</div>
            </div>
          )
        })}
        <div style={{ marginTop: 26, padding: '22px 28px', borderRadius: 18, background: C.surface, border: `1.5px solid ${C.line}`, fontFamily: F.mono, fontSize: 22, color: C.ink2, opacity: race, transform: `translateY(${(1 - race) * 20}px)`, display: 'flex', gap: 18, alignItems: 'center' }}>
          <Icon name="db" size={30} color={C.act} />
          <span>live race · 8 simultaneous taps · <span style={{ color: C.act }}>1 booking</span> · 3 of 3 runs</span>
        </div>
      </div>
      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={tLab - 0.4} vol={0.3} />
      {CHECKS.map((_, i) => <Sfx key={i} name="ding" at={tCheck + i * 0.35} vol={0.25} rate={1 + i * 0.12} />)}
      <Sfx name="scan" at={tReal - 0.1} vol={0.25} />
    </SceneFrame>
  )
}
