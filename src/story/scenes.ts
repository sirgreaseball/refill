// The dial's scenes. Each chapter is one still state of the dial: the reduced-motion page shows
// the stills, and the scroll timeline holds each one while its copy is read, moving only between.
import gsap from 'gsap'
import { eligible, harsh, inr, keeper, manav, moveTo, offered, stake, toMove, waitlist, winner } from './facts'
import { ringOf, segD } from './geo'

export type Scene = 'hero' | 'gap' | 'fits' | 'race' | 'out'

const K = `[data-arc="${harsh.id}"]`
const KR = `[data-ring="${harsh.staffId}"]`
const OUT = `[data-ring="${manav.staffId}"]`
const M = `[data-arc="${manav.id}"]`
const lone = offered.filter((e) => e.id !== winner.id && e.id !== keeper.id)
/** Everyone who fits but is not one of the two who tap. */
const rivals = eligible.filter((e) => e.id !== winner.id && e.id !== keeper.id)
const dim = 0.28

const all = (root: Element, s: string) => Array.from(root.querySelectorAll<SVGElement | HTMLElement>(s))
const mover = (root: Element) => all(root, '[data-mover]')
const drop = (el: Element) => ({ x: Number((el as HTMLElement).dataset.ox), y: Number((el as HTMLElement).dataset.oy) })

/** Puts one dial into a chapter's still state, for the reduced-motion page. */
export function still(root: Element, scene: Scene) {
  const n = ['hero', 'gap', 'fits', 'race', 'out'].indexOf(scene)
  const set = (s: string, v: gsap.TweenVars) => { const els = all(root, s); if (els.length) gsap.set(els, v) }
  set('[data-ring]', { opacity: n >= 1 && n <= 3 ? dim : 1 })
  set(KR, { opacity: 1 })
  set(`${K} .sd-seg`, { opacity: n >= 1 ? 0 : 1 })
  set(`${K} [data-ov="beat"]`, { opacity: n === 1 || n === 2 ? 1 : 0 })
  set(`${K} [data-ov="act"]`, { strokeDashoffset: n >= 3 ? 0 : 100 })
  set('.sd-mark', { opacity: n === 2 || n === 3 ? 1 : 0 })
  if (n === 2) all(root, '.sd-mark.is-no').forEach((el) => gsap.set(el, { ...drop(el), opacity: 0.55 }))
  if (n === 3) {
    set('.sd-mark.is-no', { opacity: 0 })
    set('.sd-mark.is-fit', { opacity: 0.3 })
    set(`[data-mark="${winner.id}"], [data-mark="${keeper.id}"]`, { opacity: 1 })
  }
  set('[data-why]', { opacity: n === 2 ? 1 : 0 })
  set('.sd-mark.is-fit [data-lit]', { opacity: n === 2 || n === 3 ? 1 : 0 })
  set(`[data-mark="${keeper.id}"] [data-lit]`, { opacity: n === 3 ? 0 : n === 2 ? 1 : 0 })
  set('[data-offer]', { strokeDashoffset: n === 2 ? 0 : 100 })
  set('[data-result]', { opacity: n === 3 ? 1 : 0 })
  set('[data-out], [data-ov="danger"]', { opacity: n === 4 ? 1 : 0 })
  set(`${OUT} .sd-name:not(.is-out)`, { opacity: n === 4 ? 0 : 1 })
  if (n === 4) set(`${M} .sd-seg, ${M} [data-ov="danger"]`, { opacity: 0 })
  set('[data-mover]:not(.is-danger)', { opacity: n === 4 ? 1 : 0 })
  set('.sd-c', { opacity: 0 })
  set(`.sd-c[data-c="${['time', 'stake', 'fits', 'won', 'move'][n]}"]`, { opacity: 1 })
}

/** Chapter starts on the story timeline, in viewport heights of scroll. */
export const CHAPTERS: { scene: Scene; at: number }[] = [
  { scene: 'hero', at: 0 }, { scene: 'gap', at: 0.35 }, { scene: 'fits', at: 1.85 }, { scene: 'race', at: 4.3 }, { scene: 'out', at: 6.25 },
]
export const LENGTH = 8.6

/**
 * The whole story as one timeline: 1 unit is one viewport of scroll. Every beat is a ramp then a
 * plateau, so the dial holds still while its copy is read. Scroll back and it all rewinds.
 */
export function storyTimeline(stage: HTMLElement): gsap.core.Timeline {
  const $ = (s: string) => all(stage, s)
  const tl = gsap.timeline({ defaults: { ease: 'power1.inOut', duration: 0.4 } })
  const beat = (id: string) => stage.querySelector<HTMLElement>(`[data-beat="${id}"]`)!
  const lines = (id: string) => all(beat(id), '.ln > span')
  const rest = (id: string) => all(beat(id), '.st-over, .st-p, .st-tally, .st-note')
  const center = (id: string) => $(`.sd-c[data-c="${id}"]`)
  const beatIn = (id: string, at: number) => {
    tl.fromTo(beat(id), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, at)
      .fromTo(lines(id), { yPercent: 112 }, { yPercent: 0, stagger: 0.06, duration: 0.42, ease: 'power3.out' }, at)
      .fromTo(rest(id), { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: 'power2.out' }, at + 0.08)
  }
  const beatOut = (id: string, at: number) => tl.to(beat(id), { autoAlpha: 0, y: -28, duration: 0.32, ease: 'power2.in' }, at)
  // The centre hands over cleanly: the old figure is gone before the new one arrives.
  const swap = (from: string, to: string, at: number) => {
    tl.to(center(from), { autoAlpha: 0, y: -10, duration: 0.18 }, at)
      .fromTo(center(to), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3 }, at + 0.2)
  }

  // Before the story starts: every scene's extras are hidden, the counters at their first value.
  gsap.set($('.sd-c'), { autoAlpha: 0 })
  gsap.set(center('time'), { autoAlpha: 1 })
  gsap.set($('.sd-mark'), { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%' })
  const fromR = ringOf(manav.staffId)
  const toR = ringOf(moveTo.id)
  const path = (r: number) => segD(r, manav.startMin, manav.minutes)
  mover(stage).forEach((m) => m.setAttribute('d', path(fromR)))

  // Hero out: the inset stage opens to full bleed as the story begins, and the dial steps in beside the copy.
  const wide = () => !matchMedia('(max-width: 899px), (max-aspect-ratio: 1/1)').matches
  tl.fromTo($('.st-dial'), { x: () => (wide() ? innerWidth * 0.085 : 0) }, { x: 0, duration: 0.5, ease: 'power2.inOut' }, 0)
  tl.fromTo($('.st-plate'), { clipPath: () => getComputedStyle(stage).getPropertyValue('--plate-from') || 'inset(0px round 0px)' },
    { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.55, ease: 'power2.inOut' }, 0)
    .to(beat('hero'), { autoAlpha: 0, y: -40, duration: 0.4, ease: 'power2.in' }, 0.04)
    .to($('.st-cue'), { autoAlpha: 0, duration: 0.2 }, 0)

  // 1. The gap: Kabir's ring comes forward, Harsh's arc goes amber, the money at stake counts up.
  tl.to($('[data-ring]'), { opacity: dim, duration: 0.45 }, 0.35)
    .to($(KR), { opacity: 1, duration: 0.45 }, 0.35)
    .to($(`${K} .sd-seg`), { opacity: 0, duration: 0.3 }, 0.5)
    .fromTo($(`${K} [data-ov="beat"]`), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5)
  swap('time', 'stake', 0.45)
  const money = { v: 0 }
  const moneyEl = $(`.sd-c[data-c="stake"] b`)[0]
  tl.fromTo(money, { v: 0 }, { v: stake, duration: 0.8, ease: 'power2.out', onUpdate: () => { moneyEl.textContent = inr(Math.round(money.v / 10) * 10) } }, 0.55)
  beatIn('gap', 0.45)
  beatOut('gap', 1.85)

  // 2. Who fits: the waitlist arrives round the face; who can't be offered drops away with the reason.
  const marks = $('.sd-mark')
  // The face steps back a little to make room for the waitlist round it.
  tl.to($('.st-dial'), { scale: 0.9, duration: 0.45 }, 1.9)
    .to(marks, { autoAlpha: 1, scale: 1, stagger: 0.02, duration: 0.3, ease: 'power3.out' }, 1.95)
  swap('stake', 'fits', 2.0)
  beatIn('fits', 2.05)
  const order = waitlist.map((e) => stage.querySelector<SVGGElement>(`[data-mark="${e.id}"]`)!)
  order.forEach((el, i) => {
    const at = 2.6 + i * 0.045
    if (el.classList.contains('is-no')) {
      tl.to(el, { ...drop(el), opacity: 0.55, duration: 0.3, ease: 'power2.in' }, at)
        .fromTo(el.querySelector('[data-why]'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, at + 0.08)
    } else tl.fromTo(el.querySelector('[data-lit]'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, at)
  })
  tl.fromTo($('[data-offer]'), { strokeDashoffset: 100 }, { strokeDashoffset: 0, stagger: 0.08, duration: 0.35, ease: 'power2.out' }, 3.45)
  beatOut('fits', 4.3)

  // 3. The race: two taps leave two phones at the same instant; one booking lands, once.
  tl.to($('.sd-mark.is-no'), { autoAlpha: 0, duration: 0.3 }, 4.35)
    .to(rivals.map((e) => stage.querySelector(`[data-mark="${e.id}"]`)!), { opacity: 0.3, duration: 0.3 }, 4.35)
    .to(lone.map((e) => stage.querySelector(`[data-offer="${e.id}"]`)!), { opacity: 0, duration: 0.3 }, 4.35)
  beatIn('race', 4.45)
  const taps = $('[data-tap]')
  const travel = (el: Element) => ({ x: Number((el as HTMLElement).dataset.dx), y: Number((el as HTMLElement).dataset.dy) })
  taps.forEach((el) => {
    tl.fromTo(el, { opacity: 0, x: 0, y: 0 }, { opacity: 1, duration: 0.08 }, 4.75)
      .to(el, { ...travel(el), duration: 0.45, ease: 'power2.in' }, 4.78)
  })
  const [won, kept] = [winner, keeper].map((e) => stage.querySelector(`[data-tap="${e.id}"]`)!)
  tl.to(won, { opacity: 0, duration: 0.15 }, 5.23)
    .to(kept, { x: 0, y: 0, duration: 0.45, ease: 'power3.out' }, 5.23)
    .to(kept, { opacity: 0, duration: 0.15 }, 5.6)
    .fromTo($(`${K} [data-ov="act"]`), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.45, ease: 'power3.out' }, 5.23)
    .fromTo($('[data-wave]'), { attr: { r: 8 }, opacity: 0.85 }, { attr: { r: 330 }, opacity: 0, duration: 0.75, ease: 'power2.out' }, 5.25)
    .to($(`${K} [data-ov="beat"]`), { opacity: 0, duration: 0.3 }, 5.3)
    .to($(`[data-offer="${winner.id}"], [data-offer="${keeper.id}"]`), { opacity: 0, duration: 0.3 }, 5.35)
    .to($(`[data-mark="${keeper.id}"] [data-lit]`), { opacity: 0, duration: 0.25 }, 5.4)
    .fromTo($('[data-result]'), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 5.45)
  swap('fits', 'won', 5.25)
  beatOut('race', 6.25)

  // 4. Staff out: Arjun's ring turns coral; Manav slides to the same time on Riya's ring.
  tl.to($('.sd-mark'), { autoAlpha: 0, duration: 0.3 }, 6.25)
    .to($('[data-result]'), { opacity: 0, duration: 0.2 }, 6.25)
    .to($('[data-ring]'), { opacity: 1, duration: 0.4 }, 6.3)
    .to($('.st-dial'), { scale: 1, duration: 0.45 }, 6.25)
    .fromTo($('[data-out]'), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 6.45)
    .to($(`${OUT} .sd-name:not(.is-out)`), { opacity: 0, duration: 0.25 }, 6.45)
    .fromTo($('[data-ov="danger"]'), { opacity: 0 }, { opacity: 1, stagger: 0.05, duration: 0.3 }, 6.5)
  swap('won', 'move', 6.4)
  const left = $(`.sd-c[data-c="move"] b`)[0]
  const count = { v: toMove.length }
  left.textContent = String(toMove.length)
  beatIn('out', 6.5)
  const movers = mover(stage)
  const [coral, ink] = [movers.find((m) => m.classList.contains('is-danger'))!, movers.find((m) => !m.classList.contains('is-danger'))!]
  const r = { v: fromR }
  tl.fromTo(coral, { opacity: 0 }, { opacity: 1, duration: 0.01 }, 7.0)
    .to($(`${M} .sd-seg, ${M} [data-ov="danger"]`), { opacity: 0, duration: 0.01 }, 7.0)
    .to(r, { v: toR, duration: 0.55, ease: 'power2.inOut', onUpdate: () => movers.forEach((m) => m.setAttribute('d', path(r.v))) }, 7.02)
    .fromTo(ink, { opacity: 0 }, { opacity: 1, duration: 0.45 }, 7.1)
    .to(coral, { opacity: 0, duration: 0.45 }, 7.12)
    .fromTo(count, { v: toMove.length }, { v: toMove.length - 1, duration: 0.3, onUpdate: () => { left.textContent = String(Math.round(count.v)) } }, 7.3)
  beatOut('out', 8.25)
  tl.set({}, {}, LENGTH)
  return tl
}
