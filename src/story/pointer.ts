// The cursor drives the scene, on fine pointers only: the dial tilts toward the pointer (its
// layers sit at different depths, so the rings shift against each other), the arc under it
// swells and names itself, a drag turns the face with momentum and springs it home, a click
// sends a ripple, and primary buttons lean in. Touch gets none of it, so nothing can stick.
import gsap from 'gsap'
import { eligible, hhmm, open, reasonOf, shortWhy, slots, staff, waitlist } from './facts'
import { ORBIT, markAngle, minuteAt, ringR } from './geo'

export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches

const fits = new Set(eligible.map((e) => e.id))

/** What the pointer is over on the face, in plain words, or null. */
function under(x: number, y: number, marksOn: boolean): { text: string; arc?: string } | null {
  const r = Math.hypot(x, y)
  const a = (Math.atan2(x, -y) * 180) / Math.PI
  if (marksOn && Math.abs(r - ORBIT) < 18) {
    let best = -1
    let gap = 99
    waitlist.forEach((_, i) => { const d = Math.abs(markAngle(i) - a); if (d < gap) { gap = d; best = i } })
    if (best >= 0 && gap < 7) {
      const e = waitlist[best]
      const why = reasonOf(e.id)
      return { text: `${e.name} · ${e.service} · ${e.minutes} min · ${why ? shortWhy(e, why) : fits.has(e.id) ? 'fits' : ''}` }
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

export function attachPointer(stage: HTMLElement, read: (text: string | null) => void): () => void {
  if (!finePointer()) return () => {}
  const dial = stage.querySelector<HTMLElement>('.sd')!
  const tilt = stage.querySelector<HTMLElement>('.sd-tilt')!
  const face = stage.querySelector<HTMLElement>('.sd-face')!
  const ripples = stage.querySelector<SVGGElement>('[data-ripples]')!
  const firstMark = stage.querySelector('.sd-mark')!
  const spot = stage.querySelector<HTMLElement>('.st-spot')
  const tiltX = gsap.quickTo(tilt, 'rotationX', { duration: 1, ease: 'power3' })
  const tiltY = gsap.quickTo(tilt, 'rotationY', { duration: 1, ease: 'power3' })
  const spotX = spot ? gsap.quickTo(spot, 'x', { duration: 0.7, ease: 'power3' }) : null
  const spotY = spot ? gsap.quickTo(spot, 'y', { duration: 0.7, ease: 'power3' }) : null

  let rot = 0
  let vel = 0
  let drag: { a: number; t: number; x: number; y: number; moved: number } | null = null
  let hot: Element | null = null

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

  const move = (e: PointerEvent) => {
    const sb = stage.getBoundingClientRect()
    spotX?.(e.clientX - sb.left)
    spotY?.(e.clientY - sb.top)
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
    // Over the headline's wired words, their own readout stands.
    if ((e.target as Element).closest?.('[data-hover]')) return
    const [ux, uy] = unrotate(x, y)
    const u = under(ux, uy, Number(gsap.getProperty(firstMark, 'opacity')) > 0.5)
    const el = u?.arc ? stage.querySelector(`.sd-ring [data-arc="${u.arc}"]`) : null
    if (hot !== el) { hot?.classList.remove('is-hot'); el?.classList.add('is-hot'); hot = el }
    read(u?.text ?? null)
  }
  const leave = () => {
    tiltX(0); tiltY(0)
    hot?.classList.remove('is-hot'); hot = null
    read(null)
  }
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return
    const [x, y] = local(e)
    if (Math.hypot(x, y) > 270) return
    drag = { a: angleOf(x, y), t: performance.now(), x: e.clientX, y: e.clientY, moved: 0 }
    dial.setPointerCapture(e.pointerId)
    dial.classList.add('is-grabbing')
    vel = 0
  }
  const up = (e: PointerEvent) => {
    if (!drag) return
    const click = drag.moved < 2 && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4
    drag = null
    dial.classList.remove('is-grabbing')
    if (dial.hasPointerCapture(e.pointerId)) dial.releasePointerCapture(e.pointerId)
    if (click) ripple(...unrotate(...local(e)))
  }
  const ripple = (x: number, y: number) => {
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
  const words = Array.from(stage.querySelectorAll<HTMLElement>('[data-hover]'))
  const wordOn = (e: PointerEvent) => {
    const g = gapSlot && stage.querySelector(`.sd-ring [data-arc="${gapSlot.id}"]`)
    if (!g) return
    const who = staff.find((p) => p.id === gapSlot.staffId)?.name
    g.classList.add('is-hot')
    if ((e.currentTarget as HTMLElement).dataset.hover === 'fill') {
      gsap.to(g.querySelector('[data-ov="act"]'), { strokeDashoffset: 0, duration: 1, ease: 'expo.out', overwrite: true })
      read(`${who} · ${hhmm(gapSlot.startMin)} · ${gapSlot.service} · filled from the waitlist`)
    } else read(`${who} · ${hhmm(gapSlot.startMin)} · ${gapSlot.service} · cancelled, open`)
  }
  const wordOff = () => {
    const g = gapSlot && stage.querySelector(`.sd-ring [data-arc="${gapSlot.id}"]`)
    if (!g) return
    g.classList.remove('is-hot')
    gsap.to(g.querySelector('[data-ov="act"]'), { strokeDashoffset: 100, duration: 0.6, ease: 'power2.out', overwrite: true })
    read(null)
  }

  stage.addEventListener('pointermove', move, { passive: true })
  stage.addEventListener('pointerleave', leave)
  dial.addEventListener('pointerdown', down)
  dial.addEventListener('pointerup', up)
  dial.addEventListener('pointercancel', up)
  gsap.ticker.add(spin)
  magnets.forEach((m) => { m.addEventListener('pointermove', lean); m.addEventListener('pointerleave', rest) })
  words.forEach((w) => { w.addEventListener('pointerenter', wordOn); w.addEventListener('pointerleave', wordOff) })
  return () => {
    stage.removeEventListener('pointermove', move)
    stage.removeEventListener('pointerleave', leave)
    dial.removeEventListener('pointerdown', down)
    dial.removeEventListener('pointerup', up)
    dial.removeEventListener('pointercancel', up)
    gsap.ticker.remove(spin)
    magnets.forEach((m) => { m.removeEventListener('pointermove', lean); m.removeEventListener('pointerleave', rest); m.style.translate = '' })
    words.forEach((w) => { w.removeEventListener('pointerenter', wordOn); w.removeEventListener('pointerleave', wordOff) })
  }
}
