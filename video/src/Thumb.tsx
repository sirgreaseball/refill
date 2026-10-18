// The YouTube thumbnail: the Day Dial with Harsh's gap refilled, and the promise set large.
import { AbsoluteFill } from 'remotion'
import { Dial } from './Dial'
import { Glow, Grain, Vignette } from './kit'
import { C, F } from './theme'
import { Mark } from './ui'

export function Thumb() {
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <Glow color={C.act} x={930} y={360} size={760} opacity={0.2} />
      <div style={{ position: 'absolute', left: 650, top: 60 }}>
        <Dial size={600} now={600} refill={{ K2: 1 }} kinds={{ K2: 'booked' }} big="12:00" small="Refilled" />
      </div>
      <div style={{ position: 'absolute', left: 64, top: 64, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Mark w={110} fill={1} />
        <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 54, color: C.ink, letterSpacing: '-0.02em' }}>Refill</span>
      </div>
      <div style={{ position: 'absolute', left: 64, top: 200, width: 640, fontFamily: F.display, fontWeight: 500, fontSize: 92, lineHeight: 1.02, letterSpacing: '-0.02em', color: C.ink }}>
        Every cancelled appointment, <span style={{ color: C.act }}>filled again.</span>
      </div>
      <div style={{ position: 'absolute', left: 64, bottom: 56, fontFamily: F.mono, fontSize: 24, letterSpacing: '0.16em', color: C.ink2 }}>FYND × NMIMS · CASE C29</div>
      <Vignette />
      <Grain />
    </AbsoluteFill>
  )
}
