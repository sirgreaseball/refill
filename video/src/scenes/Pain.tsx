import { AbsoluteFill, random } from 'remotion'
import { Glow, SceneFrame, Sfx, Voice, inOut, money, soft, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, end, sceneOf } from '../timeline'
import { Icon } from '../ui'
import day from '../data/day.json'

const sc = sceneOf('pain')

// The slot at the centre of the story: Harsh, hair spa with Kabir at 12:00.
function Slot({ t }: { t: number }) {
  const tc = at(sc, '03', 'cancels')
  const crack = tw(t, tc, 0.5)
  const empty = tw(t, tc + 0.4, 1.0)
  const tMoney = at(sc, '03', 'money')
  const pulse = 0.6 + 0.4 * Math.sin(t * 3)
  const shake = t > tc && t < tc + 0.35 ? Math.sin(t * 90) * 10 * (1 - (t - tc) / 0.35) : 0
  return (
    <div style={{ position: 'relative', width: 760, height: 220, transform: `translateX(${shake}px)` }}>
      {/* the booked card */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: C.surface, border: `1.5px solid ${C.line}`, padding: '34px 44px', opacity: 1 - empty, filter: `blur(${empty * 12}px)`, transform: `scale(${1 - empty * 0.05})` }}>
        <div style={{ fontFamily: F.mono, fontSize: 24, color: C.ink3, letterSpacing: '0.12em' }}>12:00 – 13:00 · WITH KABIR</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 18 }}>
          <div style={{ fontFamily: F.display, fontSize: 76, fontWeight: 500, color: C.ink, position: 'relative' }}>
            Harsh · Hair spa
            <div style={{ position: 'absolute', left: 0, top: '54%', height: 5, borderRadius: 3, width: `${crack * 100}%`, background: C.danger, boxShadow: `0 0 20px ${C.danger}` }} />
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 30, color: C.ink2 }}>₹1,600</div>
        </div>
      </div>
      {/* the gap it leaves */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 28, border: `3px dashed ${C.beat}`, opacity: empty * pulse, boxShadow: `0 0 ${60 * empty}px -10px ${C.beat}, inset 0 0 ${60 * empty}px -20px ${C.beat}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <span style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: '0.3em', color: C.beat, opacity: tw(t, at(sc, '03', 'empty'), 0.8) }}>EMPTY · 12:00</span>
      </div>
      {/* the money leaving */}
      {[0, 1, 2, 3, 4].map((i) => {
        const s = tMoney - 0.2 + i * 0.12
        const p = tw(t, s, 2.6, soft)
        if (t < s) return null
        return (
          <div key={i} style={{ position: 'absolute', left: 560 + i * 18, top: 60, fontFamily: F.display, fontSize: i === 0 ? 70 : 40, color: C.beat, opacity: (1 - p) * (i === 0 ? 1 : 0.35), transform: `translate(${p * (380 + i * 40)}px, ${-p * (220 + i * 30)}px)`, filter: `blur(${i === 0 ? p * 6 : 2 + p * 6}px)` }}>
            {money(1600)}
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: 0, top: -64, fontFamily: F.mono, fontSize: 24, letterSpacing: '0.14em', color: C.danger, opacity: tw(t, at(sc, '03', 'hour') - 0.1, 0.8) * (1 - tw(t, end(sc, '03'), 0.6)) }}>
          CANCELLED · 1 HOUR'S NOTICE
      </div>
    </div>
  )
}

const QUESTIONS = [
  { q: 'Who fits the slot?', w: 'fits' },
  { q: 'Who agreed to be messaged?', w: 'agreed' },
  { q: 'Who gets there first?', w: 'gets' },
]

export function Pain() {
  const t = useSec()
  const t4 = sc.cue['04']
  const t5 = sc.cue['05']
  const toLeft = tw(t, t4 - 0.3, 1.6, inOut) * (1 - tw(t, t5 - 0.4, 1.2, inOut))
  const listIn = tw(t, at(sc, '04', 'waitlist') - 0.3, 1.4)
  const qAway = tw(t, t5 - 0.6, 0.9, inOut)
  const tCall = at(sc, '05', 'calling')
  const tYes = at(sc, '05', 'yes') - 0.35
  const tOne = at(sc, '05', 'one')
  const tOver = at(sc, '05', 'overbooked')
  const clash = tw(t, tOne - 0.2, 0.7, inOut)
  const boom = tw(t, tOver - 0.1, 0.5)
  const shake = t > tOver - 0.1 && t < tOver + 0.5 ? Math.sin(t * 70) * 14 * (1 - (t - tOver + 0.1) / 0.6) : 0

  return (
    <SceneFrame sc={sc}>
      <Glow color={C.beat} x={700} y={520} size={1200} opacity={0.1 * tw(t, at(sc, '03', 'empty'), 1.5)} />
      <Glow color={C.danger} x={960} y={540} size={1500} opacity={0.22 * boom * (1 - tw(t, tOver + 0.6, 1.8))} />
      <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
        {/* the slot, centre then left */}
        <div style={{ position: 'absolute', left: 580 - toLeft * 420, top: 430 - toLeft * 40, transform: `scale(${1 - toLeft * 0.18})`, transformOrigin: '0 50%', opacity: 1 - tw(t, t5 - 0.5, 0.9) }}>
          <Slot t={t} />
        </div>
        {/* the waitlist: names with unanswered questions */}
        <div style={{ position: 'absolute', right: 150, top: 150, width: 560, display: 'flex', flexWrap: 'wrap', gap: 14, opacity: listIn * (1 - qAway) }}>
          {day.wait.map((w, i) => {
            const p = tw(t, at(sc, '04', 'waitlist') - 0.2 + i * 0.04, 0.9)
            const q = QUESTIONS.findIndex((x) => t > at(sc, '04', x.w))
            const flick = q >= 0 && random(`${w.id}-${q}`) > 0.55
            return (
              <div key={w.id} style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 28, color: flick ? C.ink : C.ink2, padding: '12px 22px', borderRadius: 14, border: `1.5px solid ${flick ? C.line2 : C.line}`, background: flick ? C.surface2 : 'transparent', opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
                {w.name}<span style={{ fontFamily: F.mono, color: C.beat, marginLeft: 10, opacity: flick ? 1 : 0 }}>?</span>
              </div>
            )
          })}
        </div>
        <div style={{ position: 'absolute', left: 130, bottom: 140, opacity: 1 - qAway }}>
          {QUESTIONS.map((x, i) => {
            const s = at(sc, '04', x.w) - 0.35
            const p = tw(t, s, 1.0)
            const next = i < 2 ? tw(t, at(sc, '04', QUESTIONS[i + 1].w) - 0.35, 0.8) : 0
            return (
              <div key={x.q} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 70, lineHeight: 1.12, color: C.ink, opacity: p * (1 - next * 0.65), transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 10}px)` }}>
                {x.q}
              </div>
            )
          })}
        </div>

        {/* the scramble: calls going out, two yeses, one slot */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: tw(t, t5 - 0.3, 0.8) }}>
          {['Meera', 'Sameer', 'Omar', 'Tanvi'].map((n, i) => {
            const s = tCall - 0.2 + i * 0.32
            const p = tw(t, s, 0.8)
            const ring = 0.5 + 0.5 * Math.sin((t - s) * 18)
            const gone = tw(t, tYes - 0.2, 0.6)
            return (
              <div key={n} style={{ position: 'absolute', left: 160 + i * 410, top: 200, opacity: p * (1 - gone * (i === 0 || i === 1 ? 0 : 0.85)), transform: `translateY(${(1 - p) * 30}px)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: F.sans, fontSize: 30, color: C.ink2 }}>
                  <div style={{ transform: `rotate(${ring * 14 - 7}deg)` }}><Icon name="phone" size={34} color={C.ink2} /></div>
                  Calling {n}…
                </div>
              </div>
            )
          })}
          {/* two yes bubbles converge on one slot */}
          {[0, 1].map((i) => {
            const p = tw(t, tYes + i * 0.2, 0.7)
            const x0 = i === 0 ? 220 : 1460
            const x = x0 + (i === 0 ? 1 : -1) * clash * 470
            return (
              <div key={i} style={{ position: 'absolute', left: x, top: 470, width: 240, padding: '22px 0', textAlign: 'center', borderRadius: 22, background: boom > 0 ? C.danger : C.act, color: '#0e1204', fontFamily: F.display, fontSize: 52, fontWeight: 600, opacity: p * (1 - tw(t, tOver + 0.8, 0.8)), transform: `scale(${0.6 + p * 0.4}) rotate(${(i ? 1 : -1) * (1 - clash) * 4 + (boom ? (i ? 6 : -6) * boom : 0)}deg)`, boxShadow: `0 0 70px -10px ${boom > 0 ? C.danger : C.act}` }}>
                Yes!
              </div>
            )
          })}
          <div style={{ position: 'absolute', left: 810, top: 450, width: 300, height: 130, borderRadius: 24, border: `3px dashed ${boom > 0 ? C.danger : C.beat}`, opacity: tw(t, tOne - 0.3, 0.6) * (1 - tw(t, tOver + 0.8, 0.8)) }}>
            <div style={{ position: 'absolute', top: -50, width: '100%', textAlign: 'center', fontFamily: F.mono, fontSize: 24, letterSpacing: '0.2em', color: C.beat }}>1 SLOT</div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: F.display, fontWeight: 600, fontSize: 170, letterSpacing: '-0.02em', color: C.danger, opacity: boom, transform: `scale(${1.25 - boom * 0.25})`, filter: `blur(${(1 - boom) * 14}px)`, textShadow: `0 0 60px ${C.danger}88` }}>
            Overbooked.
          </div>
        </div>
      </AbsoluteFill>
      <Voice sc={sc} />
      <Sfx name="crack" at={at(sc, '03', 'cancels') - 0.02} vol={0.7} />
      <Sfx name="drone-beat" at={at(sc, '03', 'empty') - 0.2} vol={0.35} />
      <Sfx name="coins-away" at={at(sc, '03', 'money') - 0.2} vol={0.5} />
      <Sfx name="whoosh-soft" at={t4 - 0.3} vol={0.4} />
      {QUESTIONS.map((x) => <Sfx key={x.w} name="tick" at={at(sc, '04', x.w) - 0.3} vol={0.4} />)}
      <Sfx name="ring" at={tCall - 0.15} vol={0.35} />
      <Sfx name="pop" at={tYes} vol={0.55} />
      <Sfx name="pop" at={tYes + 0.2} vol={0.55} rate={1.12} />
      <Sfx name="riser-short" at={tOne - 0.6} vol={0.45} />
      <Sfx name="clash" at={tOver - 0.12} vol={0.85} />
    </SceneFrame>
  )
}
