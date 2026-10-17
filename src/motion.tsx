// The motion layer: numbers that count to their value, a soft light that takes the day's
// mood, and a pointer spotlight on cards. All of it stops under reduced motion, and none of
// it runs on its own clock except the light's slow drift.
import { useEffect, useRef, useState } from 'react'
import type { State } from './api'
import { figures } from './desk/common'

export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts from the last shown value to the new one with a long ease-out. */
export function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(() => (reduced() ? target : 0))
  const shown = useRef(v)
  useEffect(() => {
    const a = shown.current
    if (reduced() || a === target) { shown.current = target; setV(target); return }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const now = Math.round(a + (target - a) * (1 - Math.pow(1 - p, 4)))
      shown.current = now
      setV(now)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Background tabs pause animation frames: make sure the true value always lands.
    const done = setTimeout(() => { cancelAnimationFrame(raf); shown.current = target; setV(target) }, ms + 80)
    return () => { cancelAnimationFrame(raf); clearTimeout(done) }
  }, [target, ms])
  return v
}

export function Num({ value, format = String }: { value: number; format?: (n: number) => string }) {
  return <>{format(useCountUp(value))}</>
}

/** Ambient light behind the page: green when the day is clear, amber with open gaps, red when someone needs moving. */
export function Glow({ st }: { st: State | null }) {
  const f = st ? figures(st) : null
  const tone = !f ? 'calm' : f.risk.length ? 'risk' : f.open.length ? 'gap' : 'clear'
  return (
    <div className={`glow is-${tone}`} aria-hidden="true">
      <span className="g1" /><span className="g2" /><span className="g3" />
    </div>
  )
}

// What the pointer lights up: anything marked .spot, and every row a person can act on.
const GLOW = '.spot, .q-item, .agenda-row, .choice, .person, .link-row, .wl-row, .hist-row, .row-btn'

/** One listener for the whole app: rows and .spot elements get a light that follows the pointer. Fine pointers only. */
export function useSpotlight() {
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || reduced()) return
    let last: HTMLElement | null = null
    let pull: HTMLElement | null = null
    const on = (e: PointerEvent) => {
      const m = (e.target as HTMLElement).closest?.('.btn.is-primary, .role-pill') as HTMLElement | null
      if (pull && pull !== m) pull.style.translate = ''
      pull = m
      if (m) {
        const b = m.getBoundingClientRect()
        const lean = (d: number, size: number) => Math.max(-3, Math.min(3, (d / size) * 6))
        m.style.translate = `${lean(e.clientX - b.left - b.width / 2, b.width)}px ${lean(e.clientY - b.top - b.height / 2, b.height)}px`
      }
      const el = (e.target as HTMLElement).closest?.(GLOW) as HTMLElement | null
      if (last && last !== el) last.style.removeProperty('--spot')
      last = el
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
      el.style.setProperty('--spot', '1')
    }
    addEventListener('pointermove', on, { passive: true })
    return () => removeEventListener('pointermove', on)
  }, [])
}
