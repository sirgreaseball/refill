// The Refill story at /splash: one salon day told on the Day Dial, scrubbed by the scroll.
// Lenis smooths the wheel and ScrollTrigger maps the scroll onto one timeline (scenes.ts): scroll
// back and it rewinds, stop and it stops. Only the gap's pulse and the seconds sweep keep their own
// time. Under reduced motion the story is a column of still frames with every word kept.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { reduced } from '../motion'
import { Icon, Mark } from '../ui'
import * as F from './facts'
import { ang } from './geo'
import { attachPointer } from './pointer'
import { CHAPTERS, LENGTH, still, storyTimeline, type Scene } from './scenes'
import StoryDial from './StoryDial'
import './story.css'

gsap.registerPlugin(ScrollTrigger)

const SEEN = 'refill.splash'
const seen = () => { try { return sessionStorage.getItem(SEEN) === '1' } catch { return true } }
const ln = (...lines: ReactNode[]) => lines.map((l, i) => <span key={i} className="ln"><span>{l}</span></span>)
const k = F.kabir.name
const clock = (s: { startMin: number; minutes: number }) => `${F.hhmm(s.startMin)}–${F.hhmm(s.startMin + s.minutes)}`

const NAMES: Record<Scene, string> = { hero: 'Refill', gap: 'The gap', fits: 'Who fits', race: 'The race', out: 'Staff out' }
const EVIDENCE: Record<Scene, string> = {
  hero: `${F.SALON} · sample day · ${F.booked} booked · ${F.open.length} open`,
  gap: `${k} · ${clock(F.harsh)} · ${F.harsh.service} · ${F.leadMin} min notice${F.late ? ' · late' : ''}`,
  fits: `${F.waitlist.length} waiting · ${F.eligible.length} fit · ${F.excluded.length} not offered · ${F.offered.length} offers`,
  race: `2 taps · 1 booking · ${F.winner.name} booked · ${F.keeper.name} keeps their place`,
  out: `${F.arjun.name} out · ${F.toMove.length} to move · ${F.manav.customer} to ${F.hhmm(F.manav.startMin)} with ${F.moveTo.name}`,
}
const reasons = [
  [F.reasonCount('NO_CONSENT'), 'never said yes to messages'],
  [F.reasonCount('SKILL_MISMATCH'), `want a service ${k} doesn't do`],
  [F.reasonCount('DURATION_TOO_LONG'), `need more than ${F.harsh.minutes} minutes`],
  [F.reasonCount('NOT_AVAILABLE'), `aren't free at ${F.hhmm(F.harsh.startMin)}`],
] as const
const list = (names: string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

function Copy({ scene }: { scene: Scene }) {
  switch (scene) {
    case 'hero': return <>
      <p className="st-over">Refill · appointment recovery desk</p>
      <h1 className="st-h is-hero">{ln(<>Every <em data-hover="open">cancelled</em></>, <em data-hover="open">appointment,</em>, <em data-hover="fill">filled again.</em>)}</h1>
      <p className="st-p">When a client cancels, Refill offers the time to the next person on the waitlist who fits it and said yes to messages. The first to accept gets it.</p>
    </>
    case 'gap': return <>
      <p className="st-over">01 · {F.hhmm(F.NOW)} · the gap</p>
      <h2 className="st-h">{ln(`${F.harsh.customer} cancels the`, `${F.hhmm(F.harsh.startMin)} ${F.harsh.service?.toLowerCase()}.`)}</h2>
      <p className="st-p">{F.leadMin} minutes’ notice{F.late ? ', so Refill flags it late' : ''}. {k}’s chair goes amber: an open gap, and {F.inr(F.stake)} about to walk out of the door.</p>
    </>
    case 'fits': return <>
      <p className="st-over">02 · who fits</p>
      <h2 className="st-h">{ln(`${F.waitlist.length} people are waiting.`, `${F.eligible.length} of them fit.`)}</h2>
      <p className="st-p">Refill checks everyone against the gap and writes down why. No yes to messages, no message: {F.noConsent.name} is never contacted.</p>
      <ul className="st-tally">{reasons.map(([n, t]) => <li key={t}><b>{n}</b><span>{t}</span></li>)}</ul>
      <p className="st-note">{F.offered.length} offers go out, in queue order: {list(F.offered.map((e) => e.name ?? e.id))}.</p>
    </>
    case 'race': return <>
      <p className="st-over">03 · the race</p>
      <h2 className="st-h">{ln('Two phones tap at once.', 'One booking lands.')}</h2>
      <p className="st-p">{F.winner.name} and {F.keeper.name} both tap Book in the same instant. {F.winner.name} gets the chair. {F.keeper.name} keeps their place in line.</p>
      <p className="st-note">Never double-booked: the database decides, once.</p>
    </>
    case 'out': return <>
      <p className="st-over">04 · staff out</p>
      <h2 className="st-h">{ln(`${F.arjun.name} can’t come in.`, 'Nobody is dropped.')}</h2>
      <p className="st-p">{F.arjun.name}’s {F.toMove.length} clients still to come turn coral: they need moving, and nothing moves on its own. The desk moves {F.manav.customer} to {F.hhmm(F.manav.startMin)} with {F.moveTo.name}. {F.kunal.customer} gets a link and picks a new time.</p>
    </>
  }
}

function useTheme() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('refill.theme') ?? 'auto' } catch { return 'auto' } })
  useLayoutEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    try { localStorage.setItem('refill.theme', theme) } catch { /* private mode */ }
  }, [theme])
  const dark = theme !== 'light'
  // The new theme floods out from the button, as in the app.
  const toggle = (btn: HTMLElement) => {
    const change = () => setTheme(dark ? 'light' : 'dark')
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }
    if (!doc.startViewTransition || reduced()) return change()
    const b = btn.getBoundingClientRect()
    const cx = b.left + b.width / 2
    const cy = b.top + b.height / 2
    const r = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy))
    const root = document.documentElement
    root.classList.add('theme-flooding')
    const vt = doc.startViewTransition(() => flushSync(change))
    vt.ready.then(() => root.animate({ clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${r}px at ${cx}px ${cy}px)`] },
      { duration: 1000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {})
    vt.finished.finally(() => root.classList.remove('theme-flooding'))
  }
  return { dark, toggle }
}

const openApp = () => location.assign('/#/')
const tryDemo = () => {
  try { localStorage.setItem('refill.mode', 'demo') } catch { /* private mode: the app still opens */ }
  location.assign('/#/')
}

function Hud({ dark, toggle }: { dark: boolean; toggle: (b: HTMLElement) => void }) {
  return (
    <header className="st-hud">
      <a className="st-brand" href="/#/" aria-label="Open Refill"><Mark size={13} /><span>Refill</span></a>
      <div className="st-hud-end">
        <p className="st-chap"><span data-chap-n /><span data-chap /></p>
        <button className="st-theme" onClick={(e) => toggle(e.currentTarget)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}><Icon name={dark ? 'sun' : 'moon'} size={18} /></button>
      </div>
    </header>
  )
}

function Proof() {
  return (
    <section className="st-proof" aria-labelledby="st-proof-h">
      <div className="st-proof-head">
        <p className="st-over">05 · proof</p>
        <h2 className="st-h" id="st-proof-h">{ln('Don’t take our word for it.')}</h2>
        <p className="st-p">The rules, the database and the race are tests anyone can run from a clean copy of the code.</p>
      </div>
      <ol className="st-figs">
        {F.PROOF.map((p) => (
          <li key={p.cmd}>
            <b>{'of' in p ? <><span data-count={p.n}>{p.n}</span><i>→</i><span>{p.of}</span></> : <span data-count={p.n}>{p.n}</span>}</b>
            <span>{p.label}</span>
            <code>{p.cmd}</code>
          </li>
        ))}
      </ol>
      <a className="st-more" href="/#/lab">Watch the case checks run live <Icon name="arrow" size={16} /></a>
    </section>
  )
}

function End() {
  return (
    <section className="st-end" aria-labelledby="st-end-h">
      <p className="st-over">Fynd × NMIMS Hyderabad · case C29 · appointment recovery desk</p>
      <h2 className="st-word" id="st-end-h"><Mark size={40} fill={1} /><span>Refill</span></h2>
      <p className="st-p is-end">Every cancelled appointment, filled again.</p>
      <div className="st-cta">
        <button className="btn is-primary is-big" data-magnet onClick={tryDemo}>Try the demo</button>
        <button className="btn is-big st-quiet" data-magnet onClick={openApp}>Open Refill</button>
      </div>
      <p className="st-small">The demo is a sample salon day. No account needed.</p>
      <footer className="st-foot">
        <span>Kesar Salon is invented; every name and booking is synthetic.</span>
        <a href="https://github.com/sirgreaseball/refill" target="_blank" rel="noreferrer">Source on GitHub</a>
      </footer>
    </section>
  )
}

/** The loader assembles the mark while the type and the first frames really load, then wipes away. */
function Loader({ ready, onReveal, onDone }: { ready: Promise<unknown>; onReveal: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    const fill = el.querySelector('.ld-fill')!
    const dots = Array.from(el.querySelectorAll('.ld-dot'))
    const wait = <T,>(p: Promise<T>) => Promise.race([p, new Promise((r) => setTimeout(r, 4000))])
    const jobs = [
      wait(document.fonts.load('500 1em "Clash Display"')),
      wait(document.fonts.load('400 1em Satoshi')),
      wait(document.fonts.load('500 1em "JetBrains Mono"')),
      wait(ready),
    ]
    let done = 0
    let alive = true
    const step = () => {
      if (!alive) return
      dots[done]?.classList.add('is-on')
      done += 1
      gsap.to(fill, { attr: { width: (17 * done) / jobs.length }, duration: 0.6, ease: 'expo.out' })
    }
    const enter = gsap.timeline({ defaults: { ease: 'expo.out' } })
      .fromTo(el.querySelector('.ld-l'), { x: -8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7 }, 0)
      .fromTo(el.querySelector('.ld-r'), { x: 8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7 }, 0)
      .fromTo(el.querySelector('.ld-o'), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.75 }, 0.05)
    Promise.all([...jobs.map((j) => j.then(step, step)), new Promise((r) => enter.eventCallback('onComplete', r))]).then(() => {
      if (!alive) return
      gsap.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut', delay: 0.1, onStart: onReveal, onComplete: onDone })
    })
    return () => { alive = false; enter.kill() }
  }, [ready, onReveal, onDone])
  return (
    <div className="st-loader" ref={ref} role="status" aria-label="Loading the story">
      <svg className="ld-mark" viewBox="0 0 60 18" aria-hidden="true">
        <rect className="ld-l" x="1" y="7" width="17" height="4" rx="2" />
        <rect className="ld-o" x="21.5" y="4.5" width="17" height="9" rx="4.5" pathLength={100} />
        <rect className="ld-fill" x="21.5" y="4.5" width="0" height="9" rx="4.5" />
        <rect className="ld-r" x="42" y="7" width="17" height="4" rx="2" />
      </svg>
      <div className="ld-dots" aria-hidden="true"><i className="ld-dot" /><i className="ld-dot" /><i className="ld-dot" /><i className="ld-dot" /></div>
    </div>
  )
}

/** The first look at the dial: the rings draw, the day's arcs arrive in time order, the hand runs to the demo clock. */
function intro(root: HTMLElement) {
  const q = (s: string) => Array.from(root.querySelectorAll(s))
  const arcs = [...F.slots].sort((a, b) => a.startMin - b.startMin).map((s) => root.querySelector(`.sd-ring [data-arc="${s.id}"]`))
  return gsap.timeline({ defaults: { ease: 'expo.out' } })
    .fromTo(q('.sd-track:not(.is-out), .sd-shift'), { strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.3, stagger: 0.06 }, 0)
    .fromTo(q('.sd-bezel, .sd-sweep'), { opacity: 0 }, { opacity: 1, duration: 1 }, 0.05)
    .fromTo(arcs, { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.015 }, 0.25)
    .fromTo(q('[data-hand]'), { rotation: ang(F.LO) - ang(F.NOW), svgOrigin: '0 0' }, { rotation: 0, svgOrigin: '0 0', duration: 1.5, ease: 'expo.inOut' }, 0.1)
    .fromTo(q('[data-beat="hero"] .ln > span'), { yPercent: 112 }, { yPercent: 0, duration: 1, stagger: 0.07 }, 0.2)
    .fromTo(q('[data-beat="hero"] .st-over, [data-beat="hero"] .st-p, .st-cue > *, .st-hud > *'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.06 }, 0.4)
    .fromTo(q('.sd-c[data-c="time"] > *'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.5)
}

function Scrolled() {
  const root = useRef<HTMLDivElement>(null)
  const { dark, toggle } = useTheme()
  const [loading, setLoading] = useState(() => !seen())
  const lenis = useRef<Lenis | null>(null)
  const [ready] = useState(() => { let r = () => {}; const p = new Promise<void>((res) => { r = res }); return { p, r } })

  useLayoutEffect(() => {
    const el = root.current!
    const stage = el.querySelector<HTMLElement>('.st-stage')!
    const track = el.querySelector<HTMLElement>('.st-track')!
    const bar = el.querySelector<HTMLElement>('.st-progress')!
    const chapN = el.querySelector<HTMLElement>('[data-chap-n]')!
    const chapName = el.querySelector<HTMLElement>('[data-chap]')!
    const readScene = el.querySelector<HTMLElement>('[data-read]')!
    const readHover = el.querySelector<HTMLElement>('[data-read-hover]')!

    history.scrollRestoration = 'manual'
    scrollTo(0, 0)
    el.style.setProperty('--sweep-at', `${-((Date.now() / 1000) % 60).toFixed(2)}s`)
    const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
    lenis.current = l
    l.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => l.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    if (!seen()) l.stop()

    // The HUD names the chapter on screen; the corner readout shows the facts driving the scene.
    let current = ''
    const label = (n: string, name: string) => {
      if (n + name === current) return
      current = n + name
      chapN.textContent = n
      chapName.textContent = name
    }
    const show = (s: Scene) => {
      const i = CHAPTERS.findIndex((c) => c.scene === s)
      label(i ? String(i).padStart(2, '0') : '', i ? NAMES[s] : '')
      readScene.textContent = EVIDENCE[s]
    }
    // The CSS draws the hero's first frame, so the timeline is built in the next task, after the
    // first paint, and the page never blocks on it. The loader waits for it as its last share.
    const ctx = gsap.context(() => {}, el)
    const build = setTimeout(() => ctx.add(() => {
      const tl = storyTimeline(stage)
      const story = ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl, invalidateOnRefresh: true })
      const proof = ScrollTrigger.create({ trigger: el.querySelector('.st-proof'), start: 'top 55%' })
      const end = ScrollTrigger.create({ trigger: el.querySelector('.st-end'), start: 'top 55%' })
      // One reading of the scroll names the chapter, so a jump anywhere always lands on the right label.
      ScrollTrigger.create({
        start: 0, end: 'max', onUpdate: (self) => {
          bar.style.transform = `scaleX(${self.progress.toFixed(4)})`
          const y = self.scroll()
          if (y >= end.start) { label('', ''); return }
          if (y >= proof.start) { label('05', 'Proof'); return }
          const t = Math.min(1, Math.max(0, (y - story.start) / Math.max(1, story.end - story.start))) * LENGTH
          show([...CHAPTERS].reverse().find((c) => t >= c.at - 0.1)?.scene ?? 'hero')
        },
      })
      // The bar gains its surface once the story's stage has gone and the page scrolls under it.
      ScrollTrigger.create({ trigger: el.querySelector('.st-proof'), start: 'top 64px', end: 'max', toggleClass: { targets: el.querySelector('.st-hud')!, className: 'is-raised' } })
      // The proof row counts up as it comes into view, scrubbed.
      el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
        const to = Number(n.dataset.count)
        const v = { v: 0 }
        gsap.to(v, {
          v: to, ease: 'power2.out', onUpdate: () => { n.textContent = String(Math.round(v.v)) },
          // Done before the row is high enough to read, so the figure you stop on is always the true one.
          scrollTrigger: { trigger: el.querySelector('.st-figs'), start: 'top bottom', end: 'top 72%', scrub: 0.4 },
        })
      })
      el.querySelectorAll('.st-proof .ln > span, .st-end .st-word > *').forEach((n) => {
        gsap.fromTo(n, { yPercent: 105 }, { yPercent: 0, ease: 'power3.out', scrollTrigger: { trigger: n.parentElement, start: 'top 95%', end: 'top 55%', scrub: 0.6 } })
      })
      // Two frames after the story is built, it is really on screen.
      requestAnimationFrame(() => requestAnimationFrame(() => ready.r()))
    }), 0)
    const off = attachPointer(stage, (text) => {
      readHover.textContent = text ?? ''
      readHover.parentElement!.classList.toggle('is-hover', !!text)
    })
    readScene.textContent = EVIDENCE.hero
    if (seen()) ctx.add(() => intro(el))
    return () => {
      clearTimeout(build)
      off()
      ctx.revert()
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      l.destroy()
      lenis.current = null
      history.scrollRestoration = 'auto'
    }
  }, [ready])

  // The wipe uncovers the dial as it assembles; scrolling opens once the loader has gone.
  const [reveal] = useState(() => () => { if (root.current) intro(root.current) })
  const [done] = useState(() => () => {
    try { sessionStorage.setItem(SEEN, '1') } catch { /* shows again next time */ }
    setLoading(false)
    lenis.current?.start()
  })

  return (
    <div className="story" ref={root}>
      <div className="st-progress" aria-hidden="true" />
      <Hud dark={dark} toggle={toggle} />
      <main>
        <section className="st-track" style={{ '--len': LENGTH } as CSSProperties} aria-label="How Refill recovers a cancelled appointment">
          <div className="st-stage">
            <div className="st-plate" aria-hidden="true" />
            <div className="st-spot" aria-hidden="true" />
            <div className="st-dial"><StoryDial label={`${F.SALON}'s sample day as a watch face: one ring per staff member, one arc per appointment.`} /></div>
            <div className="st-copy">
              {CHAPTERS.map((c) => <div key={c.scene} className="st-beat" data-beat={c.scene}><Copy scene={c.scene} /></div>)}
            </div>
            <p className="st-cue" aria-hidden="true"><span>Scroll</span><i /></p>
            <p className="st-read" aria-hidden="true"><span data-read /><span data-read-hover /></p>
          </div>
        </section>
        <Proof />
        <End />
      </main>
      {loading && <Loader ready={ready.p} onReveal={reveal} onDone={done} />}
    </div>
  )
}

/** Reduced motion: no smooth scroll, no timeline. Each chapter is a still frame of the same scene. */
function Stills() {
  const root = useRef<HTMLDivElement>(null)
  const { dark, toggle } = useTheme()
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      root.current!.querySelectorAll<HTMLElement>('[data-still]').forEach((el) => still(el, el.dataset.still as Scene))
    }, root)
    return () => ctx.revert()
  }, [])
  return (
    <div className="story is-still" ref={root}>
      <Hud dark={dark} toggle={toggle} />
      <main>
        {CHAPTERS.map((c) => (
          <section key={c.scene} className="st-frame" data-still={c.scene}>
            <div className="st-dial"><StoryDial label={`${NAMES[c.scene]}: ${EVIDENCE[c.scene]}`} /></div>
            <div className="st-copy"><div className="st-beat" data-beat={c.scene}><Copy scene={c.scene} /></div></div>
          </section>
        ))}
        <Proof />
        <End />
      </main>
    </div>
  )
}

export default function Story() {
  const [calm] = useState(reduced)
  useLayoutEffect(() => {
    const title = document.title
    document.title = 'Refill · every cancelled appointment, filled again'
    return () => { document.title = title }
  }, [])
  return calm ? <Stills /> : <Scrolled />
}
