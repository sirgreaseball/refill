// Shared motion vocabulary. Everything is timed in seconds so the film renders the same at any fps.
// Motion is calm and physical: long expo-out entrances, no bounce, slow camera drift.
import { Audio } from '@remotion/media'
import React from 'react'
import { AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, F } from './theme'
import { OVERLAP, Scene, VO } from './timeline'

export const out = Easing.bezier(0.16, 1, 0.3, 1)
export const inOut = Easing.bezier(0.65, 0, 0.35, 1)
export const soft = Easing.bezier(0.33, 0, 0.2, 1)

export function useSec() {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  return f / fps
}

// Progress 0..1 of a tween that starts at `start` and lasts `dur` seconds.
export function tw(t: number, start: number, dur: number, ease = out) {
  return interpolate(t, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
}
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p
export const mix = (p: number, a: number, b: number) => a + (b - a) * p

// Fade + rise + unblur.
export function Reveal({ at, dur = 1.1, y = 28, blur = 10, children, style }: { at: number; dur?: number; y?: number; blur?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const t = useSec()
  const p = tw(t, at, dur)
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * y}px)`, filter: blur ? `blur(${(1 - p) * blur}px)` : undefined, ...style }}>{children}</div>
}

// Headline whose words rise out of a mask one after another.
export function Words({ text, at, stagger = 0.07, dur = 1.0, style, wordStyle }: { text: string; at: number; stagger?: number; dur?: number; style?: React.CSSProperties; wordStyle?: (i: number) => React.CSSProperties }) {
  const t = useSec()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.26em', ...style }}>
      {text.split(' ').map((w, i) => {
        const p = tw(t, at + i * stagger, dur)
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.12em', marginBottom: '-0.12em' }}>
            <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 105}%) rotate(${(1 - p) * 4}deg)`, transformOrigin: '0 100%', ...wordStyle?.(i) }}>{w}</span>
          </span>
        )
      })}
    </div>
  )
}

// Text that follows the narration word by word: spoken words brighten, the rest wait in ink-3.
export function Spoken({ sc, line, style, hi }: { sc: Scene; line: string; style?: React.CSSProperties; hi?: (w: string) => string | undefined }) {
  const t = useSec()
  const base = sc.cue[line]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.27em', ...style }}>
      {VO[line].words.map((w, i) => {
        const p = tw(t, base + w.s - 0.05, 0.35, soft)
        const col = hi?.(w.w) ?? C.ink
        return <span key={i} style={{ color: p > 0 ? col : C.ink3, opacity: 0.28 + 0.72 * p, transform: `translateY(${(1 - p) * 6}px)`, display: 'inline-block' }}>{w.w}</span>
      })}
    </div>
  )
}

export function Overline({ children, color = C.ink2, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase', color, display: 'flex', alignItems: 'center', gap: 16, ...style }}>
      <span style={{ width: 28, height: 2, background: color, opacity: 0.7 }} />
      {children}
    </div>
  )
}

// Raised surface: concentric radius, 8% hairline, faint inset top highlight.
export function Card({ children, style, r = 28 }: { children?: React.ReactNode; style?: React.CSSProperties; r?: number }) {
  return (
    <div style={{ background: C.surface, borderRadius: r, border: `1.5px solid ${C.line}`, boxShadow: `inset 0 1.5px 0 rgba(244,241,234,0.06), 0 40px 80px -30px rgba(0,0,0,0.7)`, ...style }}>
      {children}
    </div>
  )
}

export function Tag({ children, color = C.ink2, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: F.mono, fontSize: 19, letterSpacing: '0.04em', color, border: `1.5px solid ${color}55`, background: `${color}14`, borderRadius: 10, padding: '6px 12px', whiteSpace: 'nowrap', ...style }}>{children}</span>
}

// Ambient light: a soft coloured bloom that breathes.
export function Glow({ color, x, y, size = 900, opacity = 0.22 }: { color: string; x: number; y: number; size?: number; opacity?: number }) {
  const t = useSec()
  const b = 1 + Math.sin(t * 0.9) * 0.04
  return <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 62%)`, opacity, transform: `scale(${b})`, filter: 'blur(40px)', pointerEvents: 'none' }} />
}

// Film grain at about 4%, re-seeded every other frame so it lives without crawling.
export function Grain() {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.07, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={Math.floor(f / 2) % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  )
}

export function Vignette() {
  return <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
}

// A scene's frame: dissolves in and out across the overlap with a slight focus pull, and the
// camera keeps drifting forward so nothing is ever perfectly still.
export function SceneFrame({ sc, children, drift = 0.035 }: { sc: Scene; children: React.ReactNode; drift?: number }) {
  const t = useSec()
  const pin = tw(t, 0, OVERLAP + 0.35, soft)
  const pout = tw(t, sc.dur - OVERLAP - 0.15, OVERLAP + 0.15, inOut)
  const z = 1 + (t / sc.dur) * drift
  return (
    <AbsoluteFill style={{ opacity: pin * (1 - pout), filter: `blur(${(1 - pin) * 8 + pout * 10}px)`, transform: `scale(${z * (1 + pout * 0.04) * (1.02 - pin * 0.02)})` }}>
      {children}
    </AbsoluteFill>
  )
}

export function Sfx({ name, at, vol = 1, rate }: { name: string; at: number; vol?: number; rate?: number }) {
  const { fps } = useVideoConfig()
  return (
    <Sequence from={Math.round(at * fps)} layout="none" name={`sfx ${name}`}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} playbackRate={rate} />
    </Sequence>
  )
}

// Every narration line of a scene, placed at its cue.
export function Voice({ sc }: { sc: Scene }) {
  const { fps } = useVideoConfig()
  return (
    <>
      {Object.entries(sc.cue).map(([id, s]) => (
        <Sequence key={id} from={Math.round(s * fps)} layout="none" name={`vo ${id}`}>
          <Audio src={staticFile(`vo/${id}.wav`)} volume={1} />
        </Sequence>
      ))}
    </>
  )
}

export const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
export const clock = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`
