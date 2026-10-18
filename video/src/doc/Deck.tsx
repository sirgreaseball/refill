// Art for the presentation deck: the canvas, the Day Dial and the mark, as images PowerPoint can hold.
// Every still takes `light` for the daylight deck (the app's light tokens, src/styles.css).
import { AbsoluteFill } from 'remotion'
import { Dial, Palette } from '../Dial'
import { C } from '../theme'

const L: Palette = {
  canvas: '#f4f2ed', surface: '#ffffff', surface2: '#faf8f4', surface3: '#ece9e2',
  ink: '#121214', ink2: '#5a5852', ink3: '#8c8981', line: 'rgba(18,18,20,0.08)', line2: 'rgba(18,18,20,0.14)',
  act: '#3f6b00', beat: '#d4820a', danger: '#d13a2b', inkRgb: '18,18,20', outTrack: '#e8cdc5',
}
const pal = (light?: boolean): Palette => (light ? L : C)

function Grain({ light }: { light?: boolean }) {
  return (
    <AbsoluteFill style={{ opacity: light ? 0.035 : 0.06, mixBlendMode: light ? 'multiply' : 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  )
}
const glow = (color: string, x: string, y: string, size: number, o: number) => (
  <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 62%)`, opacity: o, filter: 'blur(30px)' }} />
)

/** The page every slide sits on: the night canvas (or the daylight one), a breath of amber and lime, film grain. */
export function DeckBg({ tone = 'quiet', light = false }: { tone?: 'quiet' | 'cover'; light?: boolean }) {
  const [b, a] = light ? [1.6, 2.4] : [1, 1] // amber, lime: the same breath reads fainter on a light page
  return (
    <AbsoluteFill style={{ background: pal(light).canvas, overflow: 'hidden' }}>
      {tone === 'cover' ? <>
        {glow(C.beat, '72%', '42%', 1300, 0.16 * b)}
        {glow(C.act, '20%', '95%', 1100, 0.08 * a)}
      </> : <>
        {glow(C.act, '88%', '-8%', 1100, 0.07 * a)}
        {glow(C.beat, '5%', '110%', 1000, 0.05 * b)}
      </>}
      <AbsoluteFill style={{ background: light ? 'radial-gradient(ellipse 80% 75% at 50% 45%, transparent 60%, rgba(18,18,20,0.05) 100%)' : 'radial-gradient(ellipse 80% 75% at 50% 45%, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />
      <Grain light={light} />
    </AbsoluteFill>
  )
}

/** The splash hero's dial: Harsh's 12:00 open and glowing, the hand at 11:15. */
export function DeckDial({ refilled = false, light = false }: { refilled?: boolean; light?: boolean }) {
  return (
    <AbsoluteFill style={{ background: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Dial size={1250} now={675} big="11:15" small="Demo clock" kinds={refilled ? { K2: 'booked' } : { K2: 'open' }} refill={refilled ? { K2: 1 } : {}} boost={0.1} palette={pal(light)} />
    </AbsoluteFill>
  )
}

/** The mark: two booked bars and the gap between them, refilled. */
export function DeckMark({ light = false }: { light?: boolean }) {
  const P = pal(light)
  return (
    <AbsoluteFill style={{ background: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={600} height={180} viewBox="0 0 60 18">
        <rect x="1" y="7" width="17" height="4" rx="2" fill={P.ink} />
        <rect x="21.5" y="4.5" width="17" height="9" rx="4.5" fill="none" stroke={P.beat} strokeWidth="1.5" />
        <rect x="21.5" y="4.5" width="11" height="9" rx="4.5" fill={P.act} />
        <rect x="42" y="7" width="17" height="4" rx="2" fill={P.ink} />
      </svg>
    </AbsoluteFill>
  )
}

/** Persona badges. Business: the provider in a suit and tie. Client: a person with the tick of an opted-in yes. */
export function DeckIcon({ kind = 'business', color = C.act }: { kind?: 'business' | 'client'; color?: string }) {
  const st = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <AbsoluteFill style={{ background: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={256} height={256} viewBox="0 0 24 24">
        {kind === 'business' ? <>
          <circle cx="12" cy="7" r="3.6" {...st} />
          <path d="M4.2 21v-1.4c0-3.4 2.7-6.1 6.1-6.1h3.4c3.4 0 6.1 2.7 6.1 6.1V21" {...st} />
          <path d="M10.2 13.6 12 16l1.8-2.4" {...st} />
          <path d="M12 16.1l-1 2.7 1 1.5 1-1.5z" fill={color} stroke={color} strokeWidth={0.9} strokeLinejoin="round" />
        </> : <>
          <circle cx="10" cy="7" r="3.6" {...st} />
          <path d="M3.4 21v-1.4c0-3.4 2.7-6.1 6.1-6.1h1.6" {...st} />
          <path d="M14.6 18.4l2.2 2.2 4.4-4.8" {...st} strokeWidth={1.9} />
        </>}
      </svg>
    </AbsoluteFill>
  )
}
