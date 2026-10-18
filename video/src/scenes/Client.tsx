import { Glow, SceneFrame, Sfx, Tag, Voice, Words, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { arc, pt } from '../Dial'
import { Btn, Icon, Persona, Phone, Tap } from '../ui'

const sc = sceneOf('client')

// The client's own little dial: one ring, today's 10:00–20:00, their slot on it.
export function SlotDial({ size = 300, open = 1, lime = 0, big, small, start = 720, min = 60 }: { size?: number; open?: number; lime?: number; big: string; small: string; start?: number; min?: number }) {
  const t = useSec()
  const a = (m: number) => -150 + ((m - 600) / 600) * 300
  const d = arc(76, a(start) + 0.8, a(start + min) - 0.8, 100)
  const pulse = 0.6 + 0.4 * Math.sin(t * 2.6)
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: 'visible' }}>
      <defs><filter id="sg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      {Array.from({ length: 11 }, (_, i) => {
        const [x1, y1] = pt(85, a(600 + i * 60), 100)
        const [x2, y2] = pt(i % 2 ? 88 : 90, a(600 + i * 60), 100)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink3} strokeWidth={1} />
      })}
      <path d={arc(76, -150, 150, 100)} fill="none" stroke={C.surface3} strokeWidth={9} strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.beat} strokeWidth={9} strokeLinecap="round" opacity={open * pulse * (1 - lime)} filter="url(#sg)" />
      <path d={d} fill="none" stroke={C.act} strokeWidth={9} strokeLinecap="round" pathLength={100} strokeDasharray={`${lime * 100} 100`} filter="url(#sg)" />
      <text x={100} y={106} textAnchor="middle" fill={C.ink} style={{ font: `500 34px ${F.display}` }}>{big}</text>
      <text x={100} y={124} textAnchor="middle" fill={C.ink2} style={{ font: `500 7.5px ${F.mono}`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{small}</text>
    </svg>
  )
}

const PW = 440
export function Client() {
  const t = useSec()
  const t13 = sc.cue['13']
  const tIn = at(sc, '12', 'phone') - 0.5
  const tArr = at(sc, '12', 'arrives') - 0.2
  const tTap = at(sc, '12', 'tap') + 0.1
  const tStop = at(sc, '13', 'stop') + 0.05
  const tPull = at(sc, '13', 'pulls')
  const rise = tw(t, tIn, 1.6, inOut)
  const banner = tw(t, tArr, 0.8) * (1 - tw(t, tArr + 2.2, 0.6))
  const booked = tw(t, tTap + 0.1, 1.2, inOut)
  const flip = tw(t, t13 - 0.5, 1.0, inOut)
  const hold = Math.max(0, 15 * 60 - 8 - Math.floor((t - tArr) * 1)) // mm:ss counting down

  const PX = 400
  const PY = 160
  return (
    <SceneFrame sc={sc} drift={0.025}>
      <Glow color={booked > 0 && flip < 0.5 ? C.act : C.beat} x={PX + PW / 2} y={560} size={1000} opacity={0.13 + booked * 0.06 * (1 - flip)} />
      <Persona at={0.2} n="POV 02" label="Client" sub="Meera's phone" />

      <div style={{ position: 'absolute', left: PX, top: PY + (1 - rise) * 700, transform: `rotateY(${(1 - rise) * 18}deg) rotateZ(${(1 - rise) * -4}deg)`, opacity: rise }}>
        <Phone w={PW} glow={booked > 0.5 && flip < 0.5 ? C.act + '55' : undefined}>
          {/* screen A: the offer */}
          <div style={{ position: 'absolute', inset: '78px 30px 30px', opacity: 1 - flip }}>
            <div style={{ fontFamily: F.mono, fontSize: 15, letterSpacing: '0.16em', color: C.ink3 }}>KESAR SALON · OFFER</div>
            <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 40, color: C.ink, marginTop: 8, lineHeight: 1.05 }}>{booked > 0.5 ? "It's yours." : 'A slot opened up'}</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <SlotDial size={300} lime={booked} big={booked > 0.5 ? 'Booked' : '12:00'} small={booked > 0.5 ? 'Today · with Kabir' : 'Hair spa · 60 min'} />
            </div>
            {[['Today, 12:00 – 13:00', 'with Kabir'], ['Hair spa', '₹1,600']].map(([a, b]) => (
              <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: `1px solid ${C.line}`, fontFamily: F.sans, fontSize: 21, color: C.ink }}>
                <span>{a}</span><span style={{ color: C.ink2 }}>{b}</span>
              </div>
            ))}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
              <div style={{ fontFamily: F.mono, fontSize: 15, color: booked > 0.5 ? C.act : C.beat, textAlign: 'center', marginBottom: 12 }}>
                {booked > 0.5 ? 'CONFIRMED · ONE BOOKING' : `HELD FOR YOU · ${Math.floor(hold / 60)}:${String(hold % 60).padStart(2, '0')}`}
              </div>
              <Btn at={tTap} style={{ fontSize: 26, padding: '20px 0', opacity: 1 - booked * 0.6 }}>{booked > 0.5 ? 'Booked ✓' : 'Book'}</Btn>
            </div>
          </div>
          {/* screen B: messages and STOP */}
          <div style={{ position: 'absolute', inset: '78px 30px 30px', opacity: flip }}>
            <div style={{ fontFamily: F.mono, fontSize: 15, letterSpacing: '0.16em', color: C.ink3 }}>KESAR SALON · YOU</div>
            <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 40, color: C.ink, marginTop: 8, lineHeight: 1.05 }}>Messages</div>
            <div style={{ fontFamily: F.sans, fontSize: 20, color: C.ink2, marginTop: 14, lineHeight: 1.35 }}>You said yes to offers when a slot opens. You can take it back at any time.</div>
            {(() => {
              const off = tw(t, tStop + 0.05, 0.5, inOut)
              return (
                <div style={{ marginTop: 28, padding: '20px 22px', borderRadius: 18, background: C.surface, border: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 22, color: C.ink }}>Offers by message</span>
                  <div style={{ width: 66, height: 38, borderRadius: 19, background: off > 0.5 ? C.surface3 : C.act, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 4, left: 4 + (1 - off) * 28, width: 30, height: 30, borderRadius: 15, background: off > 0.5 ? C.ink2 : '#0e1204' }} />
                  </div>
                </div>
              )
            })()}
            <div style={{ marginTop: 22, padding: '18px 0', textAlign: 'center', borderRadius: 16, border: `1.5px solid ${C.danger}66`, fontFamily: F.mono, fontSize: 22, letterSpacing: '0.2em', color: C.danger }}>STOP</div>
            <div style={{ marginTop: 18, fontFamily: F.mono, fontSize: 14, color: C.ink3, textAlign: 'center', opacity: tw(t, tPull, 0.6) }}>CONSENT: NO · OPEN OFFERS REVOKED</div>
          </div>
        </Phone>
      </div>
      <Tap at={tTap} x={PX + PW / 2} y={PY + PW * 2.06 - 66} />
      <Tap at={tStop} x={PX + PW / 2} y={PY + 389} color={C.danger} />

      {/* the notification landing */}
      <div style={{ position: 'absolute', left: PX + 20, top: PY + 40 + (1 - banner) * -60, width: PW - 40, opacity: banner, padding: '16px 18px', borderRadius: 22, background: 'rgba(40,40,46,0.92)', border: `1px solid ${C.line2}`, display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bolt" size={24} color={C.canvas} /></div>
        <div style={{ fontFamily: F.sans, fontSize: 17, color: C.ink, lineHeight: 1.3 }}><b>Kesar Salon</b><br /><span style={{ color: C.ink2 }}>A 12:00 slot opened up. Tap to book.</span></div>
      </div>

      {/* right side: the line, set large */}
      <div style={{ position: 'absolute', left: 1020, top: 330, width: 780, opacity: 1 - flip }}>
        <Words text="The offer arrives." at={tArr} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 92, color: C.ink, lineHeight: 1.05 }} />
        <Words text="One tap." at={tTap - 0.3} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 92, color: C.ink2, lineHeight: 1.05, marginTop: 10 }} />
        <Words text="Booked." at={tTap + 0.5} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 92, color: C.act, lineHeight: 1.05, marginTop: 10 }} />
      </div>
      <div style={{ position: 'absolute', left: 1020, top: 250, width: 800, opacity: flip }}>
        <Words text="Changed your mind?" at={t13 - 0.2} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 80, color: C.ink, lineHeight: 1.05 }} />
        <div style={{ position: 'relative', height: 420, marginTop: 40 }}>
          {[['12:00 · Kabir', 'Hair spa'], ['16:30 · Riya', 'Hair spa'], ['18:00 · Arjun', 'Hair spa']].map(([a, b], i) => {
            const p = tw(t, t13 + 0.6 + i * 0.12, 0.8)
            const k = tw(t, tPull + i * 0.14, 0.9, inOut)
            return (
              <div key={a} style={{ position: 'absolute', left: i * 40, top: i * 120, width: 600, padding: '24px 30px', borderRadius: 22, background: C.surface, border: `1.5px solid ${k > 0.3 ? C.danger + '55' : C.line2}`, opacity: p * (1 - k * 0.7), transform: `translate(${k * 80}px, ${k * 40}px) rotate(${k * (3 + i * 2)}deg)`, filter: `blur(${k * 3}px)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: F.mono, fontSize: 18, color: C.ink3, letterSpacing: '0.12em' }}>OPEN OFFER</div>
                  <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: C.ink, marginTop: 4, position: 'relative' }}>
                    {a}
                    <div style={{ position: 'absolute', left: 0, top: '55%', height: 3, width: `${tw(t, tPull - 0.1 + i * 0.14, 0.5) * 100}%`, background: C.danger }} />
                  </div>
                </div>
                {k > 0.3 ? <Tag color={C.danger}>REVOKED</Tag> : <span style={{ fontFamily: F.sans, fontSize: 24, color: C.ink2 }}>{b}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={tIn} vol={0.4} />
      <Sfx name="chime" at={tArr} vol={0.45} />
      <Sfx name="tap" at={tTap} vol={0.7} />
      <Sfx name="ding" at={tTap + 0.15} vol={0.5} />
      <Sfx name="whoosh-down" at={t13 - 0.5} vol={0.3} />
      <Sfx name="tap" at={tStop} vol={0.6} />
      <Sfx name="toggle" at={tStop + 0.08} vol={0.5} />
      {[0, 1, 2].map((i) => <Sfx key={i} name="deny" at={tPull + i * 0.14} vol={0.25} rate={1 + i * 0.06} />)}
    </SceneFrame>
  )
}
