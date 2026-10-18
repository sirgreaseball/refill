import React from 'react'
import { C, F } from './theme'
import { tw, useSec } from './kit'

// Refill's mark: two booked bars and the gap between them, refilled in lime.
export function Mark({ w = 240, fill = 0.62, gap = 1, bars = 1 }: { w?: number; fill?: number; gap?: number; bars?: number }) {
  return (
    <svg width={w} height={w * 0.3} viewBox="0 0 60 18" style={{ overflow: 'visible' }}>
      <rect x={1 + 17 * (1 - bars)} y="7" width={17 * bars} height="4" rx="2" fill={C.ink} />
      <rect x="21.5" y="4.5" width="17" height="9" rx="4.5" fill="none" stroke={C.beat} strokeWidth="1.5" pathLength={100} strokeDasharray={`${gap * 100} 100`} />
      {fill > 0 && <rect x="21.5" y="4.5" width={Math.max(9, 17 * fill)} height="9" rx="4.5" fill={C.act} opacity={Math.min(1, fill * 6)} />}
      <rect x="42" y="7" width={17 * bars} height="4" rx="2" fill={C.ink} />
    </svg>
  )
}

const paths: Record<string, React.ReactNode> = {
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  phone: <path d="M6.6 3.5h2.6l1.5 4-2 1.3a10.5 10.5 0 0 0 6.5 6.5l1.3-2 4 1.5v2.6A2.1 2.1 0 0 1 18.3 20 15.3 15.3 0 0 1 4 5.7a2.1 2.1 0 0 1 2.6-2.2z" />,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  bolt: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  db: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>,
}
export function Icon({ name, size = 28, color = C.ink, sw = 2 }: { name: keyof typeof paths | string; size?: number; color?: string; sw?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

// Which view we are looking through: a persona label that slides in with an index.
export function Persona({ at, n, label, sub, color = C.ink, until }: { at: number; n: string; label: string; sub: string; color?: string; until?: number }) {
  const t = useSec()
  const p = tw(t, at, 1.2) * (until == null ? 1 : 1 - tw(t, until, 0.6))
  const line = tw(t, at + 0.15, 1.1)
  return (
    <div style={{ position: 'absolute', left: 120, top: 92, display: 'flex', alignItems: 'center', gap: 22, opacity: p, transform: `translateX(${(1 - p) * -30}px)` }}>
      <div style={{ fontFamily: F.mono, fontSize: 22, color: C.ink3, letterSpacing: '0.1em' }}>{n}</div>
      <div style={{ width: 70 * line, height: 1.5, background: C.line2 }} />
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: '0.2em', color, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: F.sans, fontSize: 24, color: C.ink2, marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  )
}

// A phone in glass: rounded titanium edge, island, screen content inside.
export function Phone({ children, w = 420, style, glow }: { children: React.ReactNode; w?: number; style?: React.CSSProperties; glow?: string }) {
  const h = w * 2.06
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.15, padding: w * 0.028, background: 'linear-gradient(145deg, #3a3a40, #16161a 40%, #2a2a30)', boxShadow: `0 60px 120px -40px rgba(0,0,0,0.9), 0 0 0 1.5px rgba(255,255,255,0.08)${glow ? `, 0 0 140px -20px ${glow}` : ''}`, ...style }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: w * 0.125, overflow: 'hidden', background: C.canvas }}>
        <div style={{ position: 'absolute', top: w * 0.03, left: '50%', width: w * 0.28, height: w * 0.075, marginLeft: -w * 0.14, borderRadius: 99, background: '#000', zIndex: 5 }} />
        <div style={{ position: 'absolute', inset: 0, padding: `${w * 0.17}px ${w * 0.07}px ${w * 0.07}px`, display: 'flex', flexDirection: 'column' }}>{children}</div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.07) 0%, transparent 28%)', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

// A finger tap: a soft ring that expands and fades where the tap lands.
export function Tap({ at, x, y, color = C.ink }: { at: number; x: number; y: number; color?: string }) {
  const t = useSec()
  const pre = tw(t, at - 0.45, 0.45)
  const p = tw(t, at, 0.8)
  if (t < at - 0.5 || t > at + 0.9) return null
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: 64, height: 64, left: -32, top: -32, borderRadius: 99, background: 'rgba(244,241,234,0.35)', opacity: t < at ? pre * 0.9 : (1 - p) * 0.9, transform: `scale(${t < at ? 1.3 - pre * 0.3 : 1 - p * 0.2})` }} />
      <div style={{ position: 'absolute', width: 64, height: 64, left: -32, top: -32, borderRadius: 99, border: `2px solid ${color}`, opacity: t < at ? 0 : 1 - p, transform: `scale(${1 + p * 1.6})` }} />
    </div>
  )
}

// The app's primary button: lime, presses in when tapped.
export function Btn({ children, at, w, style, quiet }: { children: React.ReactNode; at?: number; w?: number | string; style?: React.CSSProperties; quiet?: boolean }) {
  const t = useSec()
  const press = at == null ? 0 : Math.max(0, 1 - Math.abs(t - at) / 0.18)
  return (
    <div style={{ width: w, padding: '22px 30px', borderRadius: 18, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 30, background: quiet ? C.surface3 : C.act, color: quiet ? C.ink : '#0e1204', transform: `scale(${1 - press * 0.05})`, boxShadow: quiet ? 'none' : `0 0 ${40 + press * 50}px -10px ${C.act}88`, ...style }}>
      {children}
    </div>
  )
}
