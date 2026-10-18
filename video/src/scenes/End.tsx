import { AbsoluteFill } from 'remotion'
import { Glow, SceneFrame, Sfx, Voice, Words, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, end, sceneOf } from '../timeline'
import { Dial } from '../Dial'
import { Mark } from '../ui'

const sc = sceneOf('end')

export function End() {
  const t = useSec()
  const tR = at(sc, '25', 'refill')
  const tEvery = at(sc, '25', 'every')
  const tFilled = at(sc, '25', 'filled')
  const e = end(sc, '25')
  const build = tw(t, 0, 1.4, inOut)
  const lime = tw(t, 0.4, 1.3, inOut)
  const collapse = tw(t, tR - 0.5, 1.4, inOut)
  const mark = tw(t, tR - 0.2, 1.0)
  const fill = tw(t, tFilled - 0.1, 1.1, inOut)
  const meta = tw(t, e + 0.3, 1.2)
  const black = tw(t, sc.dur - 1.3, 1.2, inOut)

  return (
    <SceneFrame sc={sc} drift={0.015}>
      <Glow color={C.act} x={960} y={500} size={1300} opacity={(0.1 + 0.1 * fill) * (1 - black)} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - collapse, transform: `scale(${1 - collapse * 0.6}) rotate(${collapse * -30}deg)`, filter: `blur(${collapse * 12}px)` }}>
        <Dial size={860} build={build} now={1200} refill={{ K2: lime }} kinds={{ K2: 'booked' }} boost={0.25} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - black }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 48, opacity: mark, transform: `translateY(${-70 + (1 - mark) * 20}px) scale(${0.94 + mark * 0.06})`, filter: `blur(${(1 - mark) * 12}px)` }}>
          <Mark w={300} fill={0.25 + fill * 0.75} />
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 180, letterSpacing: '-0.03em', color: C.ink }}>Refill</div>
        </div>
        <div style={{ position: 'absolute', top: 640, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Words text="Every cancelled appointment, filled again." at={tEvery - 0.1} stagger={0.08} style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 52, color: C.ink2, justifyContent: 'center' }} wordStyle={(i) => ({ color: i >= 3 ? C.act : C.ink2 })} />
        </div>
        <div style={{ position: 'absolute', top: 790, left: 0, right: 0, textAlign: 'center', opacity: meta }}>
          <div style={{ fontFamily: F.mono, fontSize: 32, letterSpacing: '0.08em', color: C.ink }}>fillthechair.vercel.app</div>
          <div style={{ fontFamily: F.mono, fontSize: 19, letterSpacing: '0.14em', color: C.ink3, marginTop: 22 }}>FYND × NMIMS HYDERABAD · CASE C29 · VOICE: ELEVENLABS</div>
        </div>
      </AbsoluteFill>
      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={0} vol={0.3} />
      <Sfx name="shimmer" at={0.4} vol={0.3} />
      <Sfx name="riser" at={tR - 2.2} vol={0.3} />
      <Sfx name="bloom" at={tR - 0.1} vol={0.75} />
      <Sfx name="ding" at={tFilled} vol={0.25} />
    </SceneFrame>
  )
}
