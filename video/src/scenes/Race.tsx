import { Glow, SceneFrame, Sfx, Voice, Words, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, end, sceneOf } from '../timeline'
import { Btn, Icon, Persona, Phone, Tap } from '../ui'
import { SlotDial } from './Client'

const sc = sceneOf('race')
const PW = 380

function Screen({ t, tTap, win, name }: { t: number; tTap: number; win: boolean; name: string }) {
  const res = tw(t, tTap + 0.35, 0.9, inOut)
  return (
    <div style={{ position: 'absolute', inset: '70px 26px 26px' }}>
      <div style={{ fontFamily: F.mono, fontSize: 14, letterSpacing: '0.16em', color: C.ink3 }}>KESAR SALON · {name.toUpperCase()}</div>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 36, color: C.ink, marginTop: 8 }}>{res > 0.5 ? (win ? "It's yours." : 'Just missed it.') : 'A slot opened up'}</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <SlotDial size={250} lime={win ? res : 0} open={win ? 1 : 1 - res * 0.8} big={res > 0.5 ? (win ? 'Booked' : 'Waitlist') : '12:00'} small={res > 0.5 && !win ? 'You keep your place' : 'Kabir · 60 min'} />
      </div>
      {res > 0.5 && !win && <div style={{ fontFamily: F.sans, fontSize: 19, color: C.ink2, lineHeight: 1.35, marginTop: 6, opacity: res }}>Someone booked first. You keep your place on the waitlist.</div>}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <Btn at={tTap} quiet={res > 0.5 && !win} style={{ fontSize: 24, padding: '18px 0' }}>{res > 0.5 ? (win ? 'Booked ✓' : 'On the waitlist') : 'Book'}</Btn>
      </div>
    </div>
  )
}

export function Race() {
  const t = useSec()
  const t14 = sc.cue['14']
  const e14 = end(sc, '14')
  const tTap = e14 + 1.55
  const tOne = at(sc, '15', 'one')
  const tNever = at(sc, '15', 'never')
  const inP = tw(t, t14 - 0.4, 1.5, inOut)
  const lock = tw(t, tTap - 0.02, 0.5)
  const beam = tw(t, tTap - 0.05, 0.35)
  const settle = tw(t, tTap + 0.35, 0.9, inOut)
  const count = [3, 2, 1].map((n, i) => ({ n, s: e14 + 0.15 + i * 0.45 }))
  const L = [300, 1240]
  const TOP = 170

  return (
    <SceneFrame sc={sc} drift={0.02}>
      <Glow color={C.act} x={L[0] + PW / 2} y={560} size={900} opacity={0.18 * settle} />
      <Glow color={C.ink} x={960} y={560} size={600} opacity={0.12 * beam * (1 - settle)} />
      <Persona at={0.1} until={tOne - 0.6} n="STRESS TEST" label="Two phones, one slot" sub="Meera and Sameer tap Book together" />

      {[0, 1].map((i) => (
        <div key={i} style={{ position: 'absolute', left: L[i], top: TOP + (1 - inP) * 120, opacity: inP, transform: `perspective(1600px) rotateY(${(i ? -1 : 1) * (14 - inP * 4)}deg)`, filter: i === 1 && settle > 0 ? `saturate(${1 - settle * 0.6})` : undefined }}>
          <Phone w={PW} glow={i === 0 && settle > 0.5 ? C.act + '66' : undefined}>
            <Screen t={t} tTap={tTap} win={i === 0} name={i === 0 ? 'Meera' : 'Sameer'} />
          </Phone>
        </div>
      ))}
      <Tap at={tTap} x={L[0] + PW / 2} y={TOP + PW * 2.06 - 56} />
      <Tap at={tTap} x={L[1] + PW / 2} y={TOP + PW * 2.06 - 56} />

      {/* centre: countdown, then the lock that decides */}
      <div style={{ position: 'absolute', left: 760, width: 400, top: 380, textAlign: 'center' }}>
        {count.map(({ n, s }) => {
          const p = tw(t, s, 0.4)
          const o = 1 - tw(t, s + 0.35, 0.25)
          return t >= s && t < s + 0.6 ? <div key={n} style={{ position: 'absolute', width: '100%', fontFamily: F.display, fontSize: 180, fontWeight: 600, color: C.ink, opacity: p * o, transform: `scale(${1.3 - p * 0.3})` }}>{n}</div> : null
        })}
        <div style={{ opacity: lock, transform: `scale(${0.8 + lock * 0.2})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 120, height: 120, borderRadius: 34, background: C.surface2, border: `1.5px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${60 * beam}px -10px ${C.ink}` }}>
            <Icon name="lock" size={58} color={settle > 0.5 ? C.act : C.ink} sw={2} />
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 20, color: C.ink2, lineHeight: 1.5 }}>accept_offer()<br />locks the slot row</div>
          <div style={{ fontFamily: F.mono, fontSize: 18, color: C.ink3 }}>12:00:07.412 · 12:00:07.412</div>
        </div>
      </div>
      {/* beams from both phones into the lock */}
      {[0, 1].map((i) => (
        <div key={i} style={{ position: 'absolute', top: 440, height: 2, left: i ? 1160 : L[0] + PW, width: 1240 - (L[0] + PW) - 400 + 80, background: `linear-gradient(${i ? 270 : 90}deg, transparent, ${C.ink})`, opacity: beam * (1 - settle), transformOrigin: i ? '100% 50%' : '0 50%', transform: `scaleX(${beam})` }} />
      ))}

      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center' }}>
        <Words text="One slot. One booking." at={tOne - 0.1} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 76, color: C.ink }} wordStyle={(i) => ({ color: i >= 2 ? C.act : C.ink })} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center' }}>
        <Words text="Never two people in one chair." at={tNever - 0.05} stagger={0.06} style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 44, color: C.ink2 }} />
      </div>

      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={t14 - 0.4} vol={0.35} />
      <Sfx name="heartbeat" at={e14 + 0.05} vol={0.55} />
      {count.map(({ n, s }) => <Sfx key={n} name="count" at={s} vol={0.6} rate={0.8} />)}
      <Sfx name="tap" at={tTap} vol={0.8} />
      <Sfx name="lock" at={tTap + 0.03} vol={0.8} />
      <Sfx name="ding" at={tTap + 0.38} vol={0.45} />
      <Sfx name="muted" at={tTap + 0.5} vol={0.35} />
      <Sfx name="thud" at={tOne - 0.05} vol={0.3} />
    </SceneFrame>
  )
}
