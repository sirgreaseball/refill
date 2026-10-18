import { Glow, SceneFrame, Sfx, Tag, Voice, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { Dial, Kind } from '../Dial'
import { Icon, Persona, Phone, Tap } from '../ui'

const sc = sceneOf('staff')
const PW = 400
const ROWS: [string, string, string, string][] = [
  ['A1', '10:30', 'Rohan', 'Haircut'],
  ['A2', '11:00', 'Lakshmi', 'Global colour'],
  ['A3', '14:00', 'Kunal', 'Blow-dry'],
  ['A4', '15:00', 'Tara', 'Hair spa'],
  ['A5', '16:30', 'Manav', 'Haircut'],
  ['A6', '17:30', 'Neha', 'Root colour'],
]

export function Staff() {
  const t = useSec()
  const tOwn = at(sc, '16', 'own')
  const tCant = at(sc, '16', "can't") + 0.05
  const tHeld = at(sc, '16', 'held')
  const tFlag = at(sc, '16', 'flagged')
  const tNothing = at(sc, '16', 'nothing')
  const inP = tw(t, 0.2, 1.6, inOut)
  const outP = tw(t, tCant + 0.05, 0.9, inOut)
  const held = t > tHeld - 0.1
  const flag = (i: number) => t > tFlag - 0.15 + i * 0.1
  const kinds: Record<string, Kind> = {}
  if (held) kinds.A3 = 'held'
  ;['A2', 'A4', 'A5', 'A6'].forEach((id, i) => { if (flag(i)) kinds[id] = 'risk' })
  const needs = tw(t, tFlag + 0.2, 0.9)
  const wait = tw(t, tNothing - 0.1, 1.0)
  const PX = 250
  const PY = 190

  return (
    <SceneFrame sc={sc} drift={0.025}>
      <Glow color={C.danger} x={1300} y={540} size={1100} opacity={0.14 * outP} />
      <Persona at={0.2} n="POV 03" label="Staff" sub="Arjun's own link" />

      <div style={{ position: 'absolute', left: PX, top: PY + (1 - inP) * 600, opacity: inP }}>
        <Phone w={PW}>
          <div style={{ position: 'absolute', inset: '74px 28px 28px' }}>
            <div style={{ fontFamily: F.mono, fontSize: 15, letterSpacing: '0.16em', color: C.ink3 }}>KESAR SALON · ARJUN</div>
            <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 40, color: C.ink, marginTop: 8 }}>Your day</div>
            <div style={{ marginTop: 18 }}>
              {ROWS.map(([id, time, who, svc], i) => {
                const k = kinds[id]
                const p = tw(t, tOwn - 0.6 + i * 0.08, 0.8)
                const col = k === 'risk' ? C.danger : k === 'held' ? C.ink3 : C.ink
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 0', borderTop: `1px solid ${C.line}`, opacity: p * (id === 'A1' ? 0.45 : 1), transform: `translateY(${(1 - p) * 12}px)` }}>
                    <span style={{ fontFamily: F.mono, fontSize: 19, color: C.ink3, width: 66 }}>{time}</span>
                    <span style={{ width: 6, height: 30, borderRadius: 3, background: k === 'risk' ? C.danger : k === 'held' ? 'transparent' : C.line2, border: k === 'held' ? `1.5px dashed ${C.ink3}` : 'none' }} />
                    <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 22, color: col }}>{k === 'held' ? 'Held' : who}</span>
                    <span style={{ fontFamily: F.sans, fontSize: 19, color: C.ink2, marginLeft: 'auto' }}>{k === 'risk' ? 'To move' : svc}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 0', borderRadius: 18, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 23, background: outP > 0.5 ? `${C.danger}22` : C.surface3, border: `1.5px solid ${outP > 0.5 ? C.danger + '88' : 'transparent'}`, color: outP > 0.5 ? C.danger : C.ink }}>
              {outP > 0.5 ? "You're marked out today" : "I can't come in today"}
            </div>
          </div>
        </Phone>
      </div>
      <Tap at={tCant} x={PX + PW / 2} y={PY + PW * 2.06 - 60} color={C.danger} />

      {/* the desk's dial, reacting */}
      <div style={{ position: 'absolute', left: 860, top: 150, opacity: tw(t, tOwn, 1.2), transform: `scale(${0.94 + tw(t, tOwn, 1.6) * 0.06})` }}>
        <Dial size={640} build={tw(t, tOwn - 0.4, 2.2, inOut)} now={675} big="11:15" small="Front desk" out={outP > 0.3 ? ['ST2'] : []} kinds={kinds} />
      </div>
      <div style={{ position: 'absolute', left: 1500, top: 300, width: 340, opacity: needs }}>
        <div style={{ fontFamily: F.mono, fontSize: 20, letterSpacing: '0.12em', color: C.danger }}>NEEDS YOU NOW · 4</div>
        {['Lakshmi', 'Tara', 'Manav', 'Neha'].map((n, i) => (
          <div key={n} style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 28, color: C.ink, padding: '12px 0', borderBottom: `1px solid ${C.line}`, opacity: tw(t, tFlag + 0.2 + i * 0.1, 0.6), display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: C.danger }} />{n}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 880, top: 880, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 18, opacity: wait, transform: `translateY(${(1 - wait) * 20}px)` }}>
        <Icon name="user" size={34} color={C.ink} />
        <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 34, color: C.ink }}>Nothing moves until a person decides.</span>
        <Tag color={C.ink2}>DESK OR CLIENT CHOOSES</Tag>
      </div>

      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={0.2} vol={0.35} />
      {ROWS.map((_, i) => <Sfx key={i} name="count" at={tOwn - 0.6 + i * 0.08} vol={0.25} />)}
      <Sfx name="tap" at={tCant} vol={0.7} />
      <Sfx name="toggle" at={tCant + 0.06} vol={0.5} />
      <Sfx name="drone-beat" at={tCant + 0.1} vol={0.3} />
      <Sfx name="lock" at={tHeld - 0.05} vol={0.35} />
      {[0, 1, 2, 3].map((i) => <Sfx key={i} name="deny" at={tFlag - 0.15 + i * 0.1} vol={0.2} rate={1 + i * 0.05} />)}
      <Sfx name="thud" at={tNothing} vol={0.25} />
    </SceneFrame>
  )
}
