import { Card, Glow, SceneFrame, Sfx, Tag, Voice, inOut, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { arc } from '../Dial'
import { Icon } from '../ui'

const sc = sceneOf('features')

function Tile({ s, x, y, w, h, children, t }: { s: number; x: number; y: number; w: number; h: number; children: React.ReactNode; t: number }) {
  const p = tw(t, s, 1.1)
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.97 + p * 0.03})`, filter: `blur(${(1 - p) * 10}px)` }}>
      <Card style={{ width: '100%', height: '100%', padding: '34px 40px', position: 'relative', overflow: 'hidden' }}>{children}</Card>
    </div>
  )
}

const LOG: [string, string, string, string][] = [
  ['11:15:02', 'CANCELLED', 'Harsh · 12:00 · late', C.beat],
  ['11:15:09', 'OFFERS_SENT', 'Meera, Sameer, Omar', C.ink2],
  ['11:16:40', 'BOOKED', 'Meera · 12:00 · Kabir', C.act],
  ['11:16:40', 'WAITLIST_KEPT', 'Sameer', C.ink2],
  ['11:31:09', 'OFFER_EXPIRED', 'Omar', C.ink3],
  ['11:32:15', 'UNDO', 'Kunal · 14:00 restored', C.ink2],
]

export function Features() {
  const t = useSec()
  const t15 = at(sc, '19', 'fifteen')
  const tNext = at(sc, '19', 'next')
  const t3 = at(sc, '19', 'three')
  const tLate = at(sc, '19', 'late')
  const tMis = at(sc, '19', 'mistakes')
  const tEv = at(sc, '19', 'evidence')
  const tEx = at(sc, '19', 'export')
  // the hold: 15 minutes run down in a few seconds, then the offer moves on
  const run = tw(t, t15 + 0.3, Math.max(1.2, tNext - t15 - 0.2), inOut)
  const left = 15 * 60 * (1 - run)
  const moved = tw(t, tNext - 0.1, 0.9, inOut)

  return (
    <SceneFrame sc={sc} drift={0.02}>
      <Glow color={C.ink} x={960} y={540} size={1600} opacity={0.05} />
      <div style={{ position: 'absolute', left: 120, top: 92, fontFamily: F.mono, fontSize: 22, letterSpacing: '0.18em', color: C.ink2, opacity: tw(t, 0.2, 1) }}>BUILT IN · EVERY EDGE CASE ON THE CARD</div>

      <Tile t={t} s={t15 - 0.5} x={120} y={170} w={680} h={780}>
        <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.beat }}>OFFER HOLD</div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <svg viewBox="0 0 200 200" width={460} height={460}>
            <path d={arc(84, -150, 150, 100)} fill="none" stroke={C.surface3} strokeWidth={10} strokeLinecap="round" />
            {run < 1 && <path d={arc(84, -150, -150 + 300 * (1 - run) + 0.01, 100)} fill="none" stroke={C.beat} strokeWidth={10} strokeLinecap="round" />}
            <text x={100} y={108} textAnchor="middle" fill={C.ink} style={{ font: `500 44px ${F.display}`, fontVariantNumeric: 'tabular-nums' }}>{`${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`}</text>
            <text x={100} y={130} textAnchor="middle" fill={C.ink2} style={{ font: `500 8px ${F.mono}`, letterSpacing: '0.1em' }}>{run >= 1 ? 'LAPSED · OFFER_EXPIRED' : 'HELD FOR OMAR'}</text>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
          {['Omar', 'Tanvi', 'Vikram', 'Ira'].map((n, i) => {
            const active = i === Math.round(moved)
            return (
              <div key={n} style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 26, padding: '12px 20px', borderRadius: 14, color: active ? '#0e1204' : i < moved ? C.ink3 : C.ink2, background: active ? C.act : C.surface2, transform: `translateX(${-moved * 40}px)`, opacity: i < moved - 0.5 ? 0.4 : 1, textDecoration: i < moved - 0.5 ? 'line-through' : 'none' }}>{n}</div>
            )
          })}
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 28, color: C.ink2, marginTop: 26 }}>15 minutes, then the next in line.</div>
      </Tile>

      <Tile t={t} s={t3 - 0.3} x={850} y={170} w={950} h={220}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.ink3 }}>FREQUENCY_CAP</div>
            <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 56, color: C.ink, marginTop: 10 }}>3 offers a day, max</div>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            {[0, 1, 2, 3].map((i) => {
              const p = tw(t, t3 + i * 0.22, 0.5)
              const blocked = i === 3
              return (
                <div key={i} style={{ width: 64, height: 64, borderRadius: 32, border: `2px solid ${blocked ? C.danger : C.act}`, background: blocked ? 'transparent' : `rgba(198,242,78,${p})`, opacity: 0.25 + 0.75 * p, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {blocked && p > 0.5 && <Icon name="x" size={30} color={C.danger} sw={2.6} />}
                </div>
              )
            })}
          </div>
        </div>
      </Tile>

      <Tile t={t} s={tLate - 0.3} x={850} y={420} w={460} h={220}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Icon name="flag" size={40} color={C.danger} />
          <Tag color={C.danger}>LATE · UNDER 2 H</Tag>
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 46, color: C.ink, marginTop: 24 }}>Late cancels, flagged</div>
      </Tile>
      <Tile t={t} s={tMis - 0.3} x={1340} y={420} w={460} h={220}>
        <div style={{ transform: `rotate(${-tw(t, tMis, 1.2, inOut) * 360}deg)`, width: 44 }}><Icon name="undo" size={44} color={C.ink} /></div>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 46, color: C.ink, marginTop: 24 }}>Mistakes, undone</div>
      </Tile>

      <Tile t={t} s={tEv - 0.4} x={850} y={670} w={950} h={280}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.ink3 }}>EVIDENCE LOG</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {['JSON', 'CSV'].map((k, i) => {
              const press = Math.max(0, 1 - Math.abs(t - (tEx + i * 0.25)) / 0.18)
              const lit = t > tEx + i * 0.25
              return <span key={k} style={{ fontFamily: F.mono, fontSize: 20, padding: '8px 18px', borderRadius: 10, border: `1.5px solid ${lit ? C.act : C.line2}`, color: lit ? C.act : C.ink2, transform: `scale(${1 - press * 0.08})` }}>↓ {k}</span>
            })}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          {LOG.map(([time, code, what, col], i) => {
            const p = tw(t, tEv + i * 0.16, 0.5)
            return (
              <div key={i} style={{ display: 'flex', gap: 22, fontFamily: F.mono, fontSize: 19, padding: '4px 0', opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
                <span style={{ color: C.ink3 }}>{time}</span>
                <span style={{ color: col, width: 200 }}>{code}</span>
                <span style={{ color: C.ink2, fontFamily: F.sans, fontSize: 21 }}>{what}</span>
              </div>
            )
          })}
        </div>
      </Tile>

      <Voice sc={sc} />
      <Sfx name="pop" at={t15 - 0.4} vol={0.35} />
      <Sfx name="riser-short" at={tNext - 0.8} vol={0.25} />
      <Sfx name="whoosh-soft" at={tNext - 0.1} vol={0.3} />
      {[0, 1, 2].map((i) => <Sfx key={i} name="tick" at={t3 + i * 0.22} vol={0.4} rate={1 + i * 0.1} />)}
      <Sfx name="deny" at={t3 + 0.66} vol={0.35} />
      <Sfx name="stamp" at={tLate - 0.2} vol={0.4} />
      <Sfx name="whoosh-down" at={tMis} vol={0.3} />
      {LOG.map((_, i) => <Sfx key={i} name="count" at={tEv + i * 0.16} vol={0.3} />)}
      <Sfx name="tap" at={tEx} vol={0.5} />
      <Sfx name="tap" at={tEx + 0.25} vol={0.5} />
    </SceneFrame>
  )
}
