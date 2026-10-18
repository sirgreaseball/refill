import { Glow, SceneFrame, Sfx, Tag, Voice, inOut, money, tw, useSec } from '../kit'
import { C, F } from '../theme'
import { at, sceneOf } from '../timeline'
import { arc, pt } from '../Dial'
import { Persona } from '../ui'

const sc = sceneOf('owner')

function SubDial({ pct, p, label, out }: { pct: number; p: number; label: string; out?: boolean }) {
  const v = pct * p
  const a0 = -150
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 120 120" width={210} height={210}>
        {[0, 25, 50, 75, 100].map((k) => {
          const [x1, y1] = pt(56, a0 + k * 3, 60)
          const [x2, y2] = pt(52, a0 + k * 3, 60)
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink3} strokeWidth={1} />
        })}
        <path d={arc(44, -150, 150, 60)} fill="none" stroke={out ? '#3a2422' : C.surface3} strokeWidth={8} strokeLinecap="round" />
        {v > 0.5 && <path d={arc(44, -150, -150 + v * 3, 60)} fill="none" stroke={out ? C.danger : C.ink} strokeWidth={8} strokeLinecap="round" />}
        <text x={60} y={66} textAnchor="middle" fill={out ? C.danger : C.ink} style={{ font: `500 22px ${F.display}` }}>{out ? 'Out' : `${Math.round(v)}%`}</text>
      </svg>
      <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 26, color: out ? C.danger : C.ink, marginTop: -6 }}>{label}</div>
    </div>
  )
}

const RULES: [string, string, number, string, string][] = [
  ['Offer holds for', 'long', 15, 'min', 'then the next in line'],
  ['Offers per client', 'often', 3, 'a day', 'nobody is nagged'],
  ['Late cancellation', 'rules', 2, 'hours', 'flagged under this'],
  ['No offers inside', 'rules', 10, 'min', "nobody can get there"],
]

export function Owner() {
  const t = useSec()
  const t17 = sc.cue['17']
  const t18 = sc.cue['18']
  const tC = at(sc, '17', 'cancelled')
  const tR = at(sc, '17', 'recovered')
  const tO = at(sc, '17', 'still')
  const away = tw(t, t18 - 0.4, 1.4, inOut)
  const figs = [
    { k: 'Cancelled today', v: 2250, col: C.ink2, s: tC },
    { k: 'Recovered', v: 1600, col: C.act, s: tR },
    { k: 'Still open', v: 650, col: C.beat, s: tO },
  ]
  return (
    <SceneFrame sc={sc} drift={0.025}>
      <Glow color={C.act} x={760} y={420} size={1000} opacity={0.12 * tw(t, tR, 1) * (1 - away)} />
      <Persona at={0.2} n="POV 04" label="Owner" sub="Overview and rules" />
      <div style={{ position: 'absolute', right: 120, top: 104, opacity: tw(t, t17, 1) }}><Tag color={C.ink3}>DEMO DAY · SYNTHETIC DATA</Tag></div>

      <div style={{ position: 'absolute', left: 120, right: 120, top: 250, opacity: 1 - away, transform: `translateY(${-away * 120}px) scale(${1 - away * 0.08})`, filter: `blur(${away * 10}px)` }}>
        <div style={{ display: 'flex', gap: 80 }}>
          {figs.map((f) => {
            const p = tw(t, f.s - 0.2, 1.0)
            const n = tw(t, f.s - 0.1, 1.3, inOut)
            return (
              <div key={f.k} style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
                <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.ink3, textTransform: 'uppercase' }}>{f.k}</div>
                <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 132, color: f.col, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{money(f.v * n)}</div>
              </div>
            )
          })}
        </div>
        {/* the ledger strip */}
        <div style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden', background: C.surface3, marginTop: 40 }}>
          <div style={{ width: `${(1600 / 2250) * 100 * tw(t, tR, 1.4, inOut)}%`, background: C.act, boxShadow: `0 0 20px ${C.act}` }} />
          <div style={{ width: `${(650 / 2250) * 100 * tw(t, tO, 1.2, inOut)}%`, background: C.beat }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 70 }}>
          {[['Riya', 82], ['Arjun', 0], ['Meher', 64], ['Kabir', 78]].map(([n, v], i) => (
            <div key={n as string} style={{ opacity: tw(t, t17 + 0.4 + i * 0.12, 0.8) }}>
              <SubDial label={n as string} pct={v as number} p={tw(t, t17 + 0.5 + i * 0.12, 1.6, inOut)} out={n === 'Arjun'} />
            </div>
          ))}
        </div>
      </div>

      {/* the rules: instruments with units */}
      <div style={{ position: 'absolute', left: 330, right: 330, top: 240, opacity: tw(t, t18 - 0.1, 1.0) }}>
        <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.14em', color: C.ink3 }}>RULES · OWNER ONLY</div>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 72, color: C.ink, marginTop: 8, marginBottom: 30 }}>The owner sets the rules.</div>
        {RULES.map(([k, w, v, unit, note], i) => {
          // rows arrive in order with the line; the one being spoken about lights up
          const s = at(sc, '18', 'rules') - 0.1 + i * 0.14
          const p = tw(t, s, 0.9)
          const h = w !== 'rules' ? at(sc, '18', w) - 0.15 : 0
          const hi = w !== 'rules' ? tw(t, h, 0.5) * (1 - tw(t, h + 1.8, 0.8)) : 0
          const n = Math.round(v * tw(t, s, 1.0, inOut))
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'baseline', padding: '24px 30px', borderRadius: 20, marginBottom: 10, background: hi > 0 ? `rgba(198,242,78,${hi * 0.06})` : 'transparent', border: `1.5px solid ${hi > 0 ? `rgba(198,242,78,${hi * 0.4})` : C.line}`, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
              <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 36, color: C.ink, width: 440 }}>{k}</span>
              <span style={{ fontFamily: F.display, fontWeight: 500, fontSize: 60, color: hi > 0.3 ? C.act : C.ink, fontVariantNumeric: 'tabular-nums', width: 100, textAlign: 'right' }}>{n}</span>
              <span style={{ fontFamily: F.mono, fontSize: 24, color: C.ink2, marginLeft: 16, width: 150 }}>{unit}</span>
              <span style={{ fontFamily: F.sans, fontSize: 26, color: C.ink3, marginLeft: 'auto' }}>{note}</span>
            </div>
          )
        })}
      </div>

      <Voice sc={sc} />
      <Sfx name="whoosh-soft" at={0.1} vol={0.3} />
      {figs.map((f) => <Sfx key={f.k} name="count" at={f.s - 0.1} vol={0.45} />)}
      <Sfx name="shimmer" at={tR - 0.2} vol={0.3} />
      <Sfx name="whoosh-down" at={t18 - 0.4} vol={0.3} />
      {RULES.map((_, i) => <Sfx key={i} name="count" at={at(sc, '18', 'rules') - 0.1 + i * 0.14} vol={0.3} />)}
      <Sfx name="tick" at={at(sc, '18', 'long') - 0.15} vol={0.4} />
      <Sfx name="tick" at={at(sc, '18', 'often') - 0.15} vol={0.4} />
    </SceneFrame>
  )
}
