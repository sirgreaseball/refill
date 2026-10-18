import { AbsoluteFill } from 'remotion'
import { Glow, SceneFrame, Sfx, Voice, inOut, out, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { Icon, Mark } from '../ui'

const sc = sceneOf('solution')

export function Solution() {
  const t = useSec()
  const t6 = sc.cue['06']
  const tR = at(sc, '06', 'refill')
  const bars = tw(t, t6 - 0.6, 1.1)
  const gap = tw(t, t6 - 0.2, 0.9, inOut)
  const fill = tw(t, tR - 0.05, 1.2, inOut)
  const word = tw(t, tR - 0.1, 1.2)
  const up = tw(t, sc.cue['07'] - 0.4, 1.5, inOut)

  const steps = [
    { w: 'cancels', k: '01', title: 'A client cancels', body: 'The slot opens and starts to glow.', color: C.beat, icon: 'x' },
    { w: 'offers', k: '02', title: 'Offered to those who fit', body: '', color: C.ink, icon: 'user', chips: [['fit', 'Fits the slot'], ['said', 'Said yes to messages']] },
    { w: 'first', k: '03', title: 'First to accept gets it', body: '', color: C.act, icon: 'check' },
  ]
  const tOne = at(sc, '07', 'exactly')
  const one = tw(t, tOne - 0.1, 1.0)

  return (
    <SceneFrame sc={sc}>
      <Glow color={C.act} x={960} y={500 - up * 240} size={1100} opacity={0.16 * fill * (1 - up * 0.5)} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `translateY(${-up * 330}px) scale(${1 - up * 0.45})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
          <div style={{ transform: `scale(${0.9 + bars * 0.1})`, opacity: bars }}>
            <Mark w={380} bars={bars} gap={gap} fill={fill} />
          </div>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 210, letterSpacing: '-0.03em', color: C.ink, opacity: word, transform: `translateX(${(1 - word) * -40}px)`, filter: `blur(${(1 - word) * 16}px)`, clipPath: `inset(0 ${(1 - word) * 100}% 0 0)` }}>
            Refill
          </div>
        </div>
      </AbsoluteFill>

      {/* the loop in three steps */}
      <div style={{ position: 'absolute', left: 150, right: 150, top: 430, display: 'flex', gap: 40 }}>
        {steps.map((s, i) => {
          const st = at(sc, '07', s.w) - 0.25
          const p = tw(t, st, 1.1)
          const lit = s.w === 'first' ? one : p
          return (
            <div key={s.k} style={{ flex: 1, position: 'relative', opacity: p, transform: `translateY(${(1 - p) * 50}px)`, filter: `blur(${(1 - p) * 10}px)` }}>
              <div style={{ background: C.surface, borderRadius: 28, border: `1.5px solid ${i === 2 ? `rgba(198,242,78,${0.1 + lit * 0.35})` : C.line}`, padding: '40px 44px', minHeight: 380, boxShadow: i === 2 ? `0 0 ${lit * 90}px -30px ${C.act}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: F.mono, fontSize: 24, color: C.ink3, letterSpacing: '0.14em' }}>{s.k}</span>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: `${s.color}1c`, border: `1.5px solid ${s.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={30} color={s.color} sw={2.4} />
                  </div>
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 54, color: C.ink, marginTop: 40, lineHeight: 1.08 }}>{s.title}</div>
                {s.body && <div style={{ fontFamily: F.sans, fontSize: 30, color: C.ink2, marginTop: 18 }}>{s.body}</div>}
                {s.chips && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                    {s.chips.map(([w, label]) => {
                      const q = tw(t, at(sc, '07', w) - 0.15, 0.7)
                      return (
                        <span key={w} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F.sans, fontWeight: 500, fontSize: 26, padding: '10px 18px', borderRadius: 12, background: `rgba(198,242,78,${q * 0.1})`, border: `1.5px solid rgba(198,242,78,${q * 0.4})`, color: q > 0.5 ? C.act : C.ink3, opacity: 0.3 + q * 0.7 }}>
                          <Icon name="check" size={22} color={C.act} sw={2.6} />{label}
                        </span>
                      )
                    })}
                  </div>
                )}
                {i === 2 && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 22, opacity: one, transform: `translateY(${(1 - one) * 20}px)` }}>
                    <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 96, color: C.act, lineHeight: 0.9 }}>1</span>
                    <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: C.ink }}>Exactly one booking.</span>
                  </div>
                )}
              </div>
              {i < 2 && (
                <div style={{ position: 'absolute', right: -40, top: 165, width: 40, height: 2, background: C.line2, transform: `scaleX(${tw(t, at(sc, '07', steps[i + 1].w) - 0.5, 0.6, out)})`, transformOrigin: '0 50%' }} />
              )}
            </div>
          )
        })}
      </div>
      <Voice sc={sc} />
      <Sfx name="riser" at={t6 - 1.4} vol={0.35} />
      <Sfx name="bloom" at={tR - 0.05} vol={0.7} />
      <Sfx name="whoosh-soft" at={sc.cue['07'] - 0.4} vol={0.35} />
      {steps.map((s) => <Sfx key={s.w} name="pop" at={at(sc, '07', s.w) - 0.2} vol={0.35} />)}
      <Sfx name="tick" at={at(sc, '07', 'fit') - 0.1} vol={0.3} />
      <Sfx name="tick" at={at(sc, '07', 'said') - 0.1} vol={0.3} />
      <Sfx name="ding" at={tOne - 0.05} vol={0.4} />
    </SceneFrame>
  )
}
