// The cursor drives the scene, on fine pointers only. Over the stage it becomes the instrument's
// own cursor: a ring that reads the time on the face under it and takes the colour of what it is
// over (amber an open gap, lime refilled, coral needs moving). A reading hand follows it round
// the dial, the arcs and hours nearest to it swell, the face tilts toward it with real parallax
// between its layers, a drag spins the face with momentum and springs it home, a click sends a
// ripple, and primary buttons lean in. Touch gets none of it, so nothing can stick.
import gsap from 'gsap'
import { eligible, hhmm, open, reasonOf, shortWhy, slots, staff, waitlist } from './facts'
import { ORBIT, ang, markAngle, midOf, minuteAt, ringOf, ringR } from './geo'

export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches

const fits = new Set(eligible.map((e) => e.id))
const FACE = 206
/** Each appointment's middle on the face, for the lens. */
const mids = slots.map((s) => ({ id: s.id, at: midOf(ringOf(s.staffId), s.startMin, s.minutes) }))

/** What the pointer is over on the face, in plain words, or null. */
function under(x: number, y: number, marksOn: boolean): { text: string; arc?: string; mark?: string } | null {
  const r = Math.hypot(x, y)
  const a = (Math.atan2(x, -y) * 180) / Math.PI
  if (marksOn && Math.abs(r - ORBIT) < 18) {
    let best = -1
    let gap = 99
    waitlist.forEach((_, i) => { const d = Math.abs(markAngle(i) - a); if (d < gap) { gap = d; best = i } })
    if (best >= 0 && gap < 7) {
      const e = waitlist[best]
      const why = reasonOf(e.id)
      return { text: `${e.name} · ${e.service} · ${e.minutes} min · ${why ? shortWhy(e, why) : fits.has(e.id) ? 'fits' : ''}`, mark: e.id }
    }
  }
  const i = staff.findIndex((_, k) => Math.abs(r - ringR(k)) < 11)
  const m = minuteAt(a)
  if (i < 0 || m == null) return null
  const p = staff[i]
  const s = slots.find((x) => x.staffId === p.id && m >= x.startMin && m < x.startMin + x.minutes)
  if (!s) return { text: `${p.name} · ${hhmm(Math.floor(m / 15) * 15)} · free` }
  const what = s.status === 'free' ? (open.some((o) => o.id === s.id) ? 'cancelled, open' : 'free') : s.customer
  return { text: `${p.name} · ${hhmm(s.startMin)} · ${s.service} · ${what}`, arc: s.id }
}

/** Where the pointer is on the face and where the last click landed, for the particle field. */
export interface Touch { x: number; y: number; on: number; rx: number; ry: number; rt: number }

export function attachPointer(stage: HTMLElement, read: (text: string | null) => void, touch?: Touch): () => void {
  if (!finePointer()) return () => {}
  const dial = stage.querySelector<HTMLElement>('.sd')!
  const tilt = stage.querySelector<HTMLElement>('.sd-tilt')!
  const face = stage.querySelector<HTMLElement>('.sd-face')!
  const ripples = stage.querySelector<SVGGElement>('[data-ripples]')!
  const ghost = stage.querySelector<SVGLineElement>('[data-ghost]')!
  const firstMark = stage.querySelector('.sd-mark')!
  const spot = stage.querySelector<HTMLElement>('.st-spot')
  const cursor = document.querySelector<HTMLElement>('.st-cursor')
  const ring = cursor?.querySelector<HTMLElement>('.st-cursor-ring')
  const dot = cursor?.querySelector<HTMLElement>('.st-cursor-dot')
  const label = cursor?.querySelector<HTMLElement>('[data-cursor-label]')
  const arcs = new Map(mids.map((m) => [m.id, stage.querySelector<SVGGElement>(`.sd-ring [data-arc="${m.id}"]`)]))
  const hours = Array.from(stage.querySelectorAll<SVGGElement>('.sd-hour'))
  const LO = minuteAt(-150)!
  const hourAngles = hours.map((_, i) => ang(LO + i * 60))

  const tiltX = gsap.quickTo(tilt, 'rotationX', { duration: 1, ease: 'power3' })
  const tiltY = gsap.quickTo(tilt, 'rotationY', { duration: 1, ease: 'power3' })
  const spotX = spot ? gsap.quickTo(spot, 'x', { duration: 0.7, ease: 'power3' }) : null
  const spotY = spot ? gsap.quickTo(spot, 'y', { duration: 0.7, ease: 'power3' }) : null
  const ringX = ring ? gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' }) : null
  const ringY = ring ? gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' }) : null
  gsap.set(ghost, { svgOrigin: '0 0', rotation: 0 })
  const ghostTurn = gsap.quickTo(ghost, 'rotation', { duration: 0.5, ease: 'power3' })

  let rot = 0
  let vel = 0
  let ghostA = 0
  let drag: { a: number; t: number; x: number; y: number; moved: number } | null = null
  let hot: Element | null = null
  let lensOn = false

  const local = (e: PointerEvent) => {
    const b = dial.getBoundingClientRect()
    const k = 560 / b.width
    return [(e.clientX - b.left - b.width / 2) * k, (e.clientY - b.top - b.height / 2) * k] as const
  }
  const unrotate = (x: number, y: number) => {
    const t = (-rot * Math.PI) / 180
    return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)] as const
  }
  const angleOf = (x: number, y: number) => (Math.atan2(x, -y) * 180) / Math.PI
  const opacity = (el: Element | null | undefined) => (el ? Number(gsap.getProperty(el, 'opacity')) : 0)

  /** The colour of an arc as the story stands now: amber open, lime refilled, coral needs moving. */
  const tone = (id?: string) => {
    const g = id ? arcs.get(id) : null
    if (!g || !id) return ''
    const act = g.querySelector('[data-ov="act"]')
    if (act && Number(gsap.getProperty(act, 'strokeDashoffset')) < 50) return 'act'
    if (opacity(g.querySelector('[data-ov="danger"]')) > 0.5) return 'danger'
    const beat = stage.querySelector(`.sd-pulse [data-arc="${id}"]`)
    if (beat && opacity(beat.querySelector('[data-ov="beat"]')) > 0.5 && opacity(beat.closest('svg')) > 0.5) return 'beat'
    return ''
  }

  // The lens: everything near the pointer swells a little, falling off with distance.
  const lens = (x: number, y: number, on: boolean) => {
    if (!on && !lensOn) return
    lensOn = on
    for (const m of mids) {
      const g = arcs.get(m.id)
      const v = (on ? Math.max(0, 1 - Math.hypot(x - m.at[0], y - m.at[1]) / 95) : 0).toFixed(2)
      if (g && g.style.getPropertyValue('--near') !== v) g.style.setProperty('--near', v)
    }
    const a = angleOf(x, y)
    hours.forEach((h, i) => {
      const v = (on ? Math.max(0, 1 - Math.abs(a - hourAngles[i]) / 22) : 0).toFixed(2)
      if (h.style.getPropertyValue('--near') !== v) h.style.setProperty('--near', v)
    })
  }

  const setCursor = (mode: string, colour: string, text: string) => {
    if (!cursor || !label) return
    if (cursor.dataset.mode !== mode) cursor.dataset.mode = mode
    cursor.style.setProperty('--cur', colour ? `var(--${colour})` : 'var(--ink)')
    if (label.textContent !== text) label.textContent = text
  }

  const move = (e: PointerEvent) => {
    const sb = stage.getBoundingClientRect()
    spotX?.(e.clientX - sb.left)
    spotY?.(e.clientY - sb.top)
    ringX?.(e.clientX)
    ringY?.(e.clientY)
    if (dot) gsap.set(dot, { x: e.clientX, y: e.clientY })
    cursor?.classList.add('is-on')
    const [x, y] = local(e)
    const nx = Math.max(-1, Math.min(1, x / 300))
    const ny = Math.max(-1, Math.min(1, y / 300))
    tiltY(nx * 7)
    tiltX(-ny * 7)
    if (drag) {
      const a = angleOf(x, y)
      let d = a - drag.a
      if (d > 180) d -= 360
      if (d < -180) d += 360
      const now = performance.now()
      // The face turns freely near home and resists more the further it goes.
      const step = d / (1 + Math.abs(rot) / 45)
      rot += step
      vel = (step / Math.max(8, now - drag.t)) * 16.7
      drag.a = a
      drag.t = now
      drag.moved += Math.abs(d)
      gsap.set(face, { rotation: rot })
    }
    const [ux, uy] = unrotate(x, y)
    const r = Math.hypot(ux, uy)
    const overFace = r < FACE && r > 60
    if (touch) { touch.x = ux; touch.y = uy; touch.on = r < FACE + 160 ? 1 : 0 }
    lens(ux, uy, r < FACE + 40)

    // The reading hand follows the pointer round the face, the short way.
    const a = angleOf(ux, uy)
    let d = a - (((ghostA % 360) + 540) % 360 - 180)
    if (d > 180) d -= 360
    if (d < -180) d += 360
    ghostA += d
    ghostTurn(ghostA)
    ghost.classList.toggle('is-on', overFace && minuteAt(a) != null)

    // Over the headline's wired words, their own readout stands.
    const word = (e.target as Element).closest?.('[data-hover]') as HTMLElement | null
    if (word) { setCursor('word', word.dataset.hover === 'fill' ? 'act' : 'beat', ''); return }

    const u = under(ux, uy, opacity(firstMark) > 0.5)
    const el = u?.arc ? arcs.get(u.arc) ?? null : null
    if (hot !== el) { hot?.classList.remove('is-hot'); el?.classList.add('is-hot'); hot = el }
    read(u?.text ?? null)
    if (u?.mark) setCursor('face', fits.has(u.mark) ? 'act' : '', waitlist.find((w) => w.id === u.mark)?.name ?? '')
    else if (overFace) {
      const m = minuteAt(a)
      setCursor('face', tone(u?.arc), m == null ? '' : hhmm(Math.round(m / 5) * 5))
    } else setCursor('', '', '')
  }
  const leave = () => {
    if (touch) touch.on = 0
    tiltX(0); tiltY(0)
    hot?.classList.remove('is-hot'); hot = null
    lens(0, 0, false)
    ghost.classList.remove('is-on')
    cursor?.classList.remove('is-on')
    read(null)
  }
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return
    cursor?.classList.add('is-down')
    const [x, y] = local(e)
    if (Math.hypot(x, y) > 270 || (e.target as Element).closest?.('a, button')) return
    drag = { a: angleOf(x, y), t: performance.now(), x: e.clientX, y: e.clientY, moved: 0 }
    dial.setPointerCapture(e.pointerId)
    dial.classList.add('is-grabbing')
    vel = 0
  }
  const up = (e: PointerEvent) => {
    cursor?.classList.remove('is-down')
    if (!drag) return
    const click = drag.moved < 2 && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4
    drag = null
    dial.classList.remove('is-grabbing')
    if (dial.hasPointerCapture(e.pointerId)) dial.releasePointerCapture(e.pointerId)
    if (click) ripple(...unrotate(...local(e)))
  }
  const ripple = (x: number, y: number) => {
    if (touch) { touch.rx = x; touch.ry = y; touch.rt = performance.now() }
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    c.setAttribute('class', 'sd-ripple')
    c.setAttribute('cx', x.toFixed(1))
    c.setAttribute('cy', y.toFixed(1))
    ripples.appendChild(c)
    gsap.fromTo(c, { attr: { r: 4 }, opacity: 0.6 }, { attr: { r: 160 }, opacity: 0, duration: 1.4, ease: 'expo.out', onComplete: () => c.remove() })
  }
  // After a throw the face keeps its momentum, then a soft spring brings it home upright.
  const spin = () => {
    if (drag || (Math.abs(rot) < 0.01 && Math.abs(vel) < 0.01)) return
    vel = vel * 0.95 - rot * 0.004
    rot += vel
    if (Math.abs(rot) < 0.01 && Math.abs(vel) < 0.01) rot = vel = 0
    gsap.set(face, { rotation: rot })
  }

  // Primary buttons lean toward the pointer, 3 px at most.
  const magnets = Array.from(document.querySelectorAll<HTMLElement>('[data-magnet]'))
  const lean = (e: PointerEvent) => {
    const m = e.currentTarget as HTMLElement
    const b = m.getBoundingClientRect()
    const f = (d: number, size: number) => Math.max(-3, Math.min(3, (d / size) * 6))
    m.style.translate = `${f(e.clientX - b.left - b.width / 2, b.width).toFixed(2)}px ${f(e.clientY - b.top - b.height / 2, b.height).toFixed(2)}px`
  }
  const rest = (e: PointerEvent) => { (e.currentTarget as HTMLElement).style.translate = '' }

  // The headline is wired to the face: its words light the arc they name.
  const gapSlot = open[0]
  const words = Array.from(stage.querySelectorAll<HTMLElement>('.st-copy [data-hover]'))
  const wordOn = (e: PointerEvent) => {
    const g = gapSlot && arcs.get(gapSlot.id)
    if (!g) return
    const who = staff.find((p) => p.id === gapSlot.staffId)?.name
    g.classList.add('is-hot')
    if ((e.currentTarget as HTMLElement).dataset.hover === 'fill') {
      gsap.to(g.querySelector('[data-ov="act"]'), { strokeDashoffset: 0, duration: 1, ease: 'expo.out', overwrite: true })
      read(`${who} · ${hhmm(gapSlot.startMin)} · ${gapSlot.service} · filled from the waitlist`)
    } else read(`${who} · ${hhmm(gapSlot.startMin)} · ${gapSlot.service} · cancelled, open`)
  }
  const wordOff = () => {
    const g = gapSlot && arcs.get(gapSlot.id)
    if (!g) return
    g.classList.remove('is-hot')
    gsap.to(g.querySelector('[data-ov="act"]'), { strokeDashoffset: 100, duration: 0.6, ease: 'power2.out', overwrite: true })
    read(null)
  }

  stage.addEventListener('pointermove', move, { passive: true })
  stage.addEventListener('pointerleave', leave)
  stage.addEventListener('pointerdown', down)
  addEventListener('pointerup', up)
  dial.addEventListener('pointercancel', up)
  gsap.ticker.add(spin)
  magnets.forEach((m) => { m.addEventListener('pointermove', lean); m.addEventListener('pointerleave', rest) })
  words.forEach((w) => { w.addEventListener('pointerenter', wordOn); w.addEventListener('pointerleave', wordOff) })
  return () => {
    stage.removeEventListener('pointermove', move)
    stage.removeEventListener('pointerleave', leave)
    stage.removeEventListener('pointerdown', down)
    removeEventListener('pointerup', up)
    dial.removeEventListener('pointercancel', up)
    gsap.ticker.remove(spin)
    leave()
    magnets.forEach((m) => { m.removeEventListener('pointermove', lean); m.removeEventListener('pointerleave', rest); m.style.translate = '' })
    words.forEach((w) => { w.removeEventListener('pointerenter', wordOn); w.removeEventListener('pointerleave', wordOff) })
  }
}
