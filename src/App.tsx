import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { ownerLink, readDesk, useBook } from './api'
import Desk from './Desk'
import Offer from './Offer'
import { Icon, Mark, Modal, Qr, clock, copy } from './ui'

const Lab = lazy(() => import('./Lab'))
const Team = lazy(() => import('./Team'))
const StaffView = lazy(() => import('./StaffView'))
const Join = lazy(() => import('./Join'))
const Me = lazy(() => import('./Me'))
const phoneWait = <main className="phone"><p className="quiet">Opening…</p></main>

function useRoute() {
  const get = () => location.hash.replace(/^#/, '') || '/'
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => { setRoute(get()); scrollTo({ top: 0 }) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return route
}

/**
 * Routes, by role:
 *   #/ desk, #/team, #/lab           the owner (key in this browser)
 *   #/staff/<id>                     owner previewing a stylist's view
 *   #/s/<ws>/<staff>/<key>           a stylist's own link
 *   #/join/<code>, #/me/<token>      a customer signing up, then their own page
 *   #/o/<offer>                      a customer's offer
 */
export default function App() {
  const route = useRoute()
  const offer = /^\/o\/([0-9a-f-]{36})$/i.exec(route)
  if (offer) return <Offer id={offer[1]} />
  const stylist = /^\/s\/([0-9a-f-]{36})\/([A-Za-z0-9_-]+)\/([0-9a-f]{32})$/i.exec(route)
  if (stylist) return <Suspense fallback={phoneWait}><StaffView ws={stylist[1]} staff={stylist[2]} keyStr={stylist[3]} /></Suspense>
  const preview = /^\/staff\/([A-Za-z0-9_-]+)$/.exec(route)
  const desk = readDesk()
  if (preview && desk) return <Suspense fallback={phoneWait}><StaffView ws={desk.id} staff={preview[1]} keyStr={desk.key} preview /></Suspense>
  const join = /^\/join\/([0-9a-f]{8})$/i.exec(route)
  if (join) return <Suspense fallback={phoneWait}><Join code={join[1]} /></Suspense>
  const me = /^\/me\/([0-9a-f]{32})$/i.exec(route)
  if (me) return <Suspense fallback={phoneWait}><Me token={me[1]} /></Suspense>
  return <Shell route={route} />
}

const ENTERED = 'refill.entered'
const seen = () => { try { return sessionStorage.getItem(ENTERED) === '1' } catch { return false } }

function Shell({ route }: { route: string }) {
  const book = useBook()
  const [entered, setEntered] = useState(() => seen() || route === '/lab')
  const [fonts, setFonts] = useState(false)
  useEffect(() => { document.fonts?.ready.then(() => setFonts(true)) ?? setFonts(true) }, [])

  const enter = () => {
    try { sessionStorage.setItem(ENTERED, '1') } catch { /* ignore */ }
    const go = () => setEntered(true)
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(go)
    else go()
  }

  if (!entered) return <Entry fonts={fonts} phase={book.phase} onEnter={enter} />

  return (
    <div className="app">
      <Header route={route} book={book} />
      {book.offline && <p className="banner" role="status">Offline. Showing the last saved state; changes resume when the connection is back.</p>}
      <main className="page">
        {route === '/lab' ? <Suspense fallback={<Loading phase="lab" />}><Lab /></Suspense>
          : !book.state ? <Loading phase={book.phase} />
            : route === '/team' ? <Suspense fallback={<Loading phase="team" />}><Team book={book} /></Suspense>
              : <Desk book={book} />}
      </main>
    </div>
  )
}

function Loading({ phase }: { phase: string }) {
  return (
    <div className="loading">
      <Mark size={36} fill={0.3} />
      <p className="quiet">{phase === 'error' ? 'Could not reach the database. Check the connection and reload.' : phase === 'creating' ? 'Setting up a fresh demo day…' : 'Opening today’s book…'}</p>
    </div>
  )
}

/** First screen of a session. The gap in the line fills as real work finishes: fonts, database, today's book. */
function Entry({ fonts, phase, onEnter }: { fonts: boolean; phase: string; onEnter: () => void }) {
  const steps: [string, boolean][] = [['Type', fonts], ['Database', phase !== 'connecting'], ['Today’s book', phase === 'ready']]
  const done = steps.filter(([, ok]) => ok).length
  const ready = phase === 'ready'
  return (
    <main className="entry">
      <div className="entry-top">
        <Mark size={22} fill={done / steps.length} />
        <span className="overline">Fynd × NMIMS Hyderabad · case C29 · synthetic demo</span>
      </div>
      <div className="entry-stage">
        <h1 className="entry-word">Refill</h1>
        <div className="entry-line" aria-hidden="true">
          <span className="seg" />
          <span className="gap"><span className="gap-fill" style={{ transform: `scaleX(${done / steps.length})` }} /></span>
          <span className="seg" />
        </div>
        <p className="entry-lede">An empty chair is money walking out of the salon.</p>
        <p className="entry-copy">Refill offers a cancelled slot to the next waiting customer who fits it, checks consent before every message, and never books two people into one chair.</p>
        <div className="entry-go">
          <button className="btn is-primary is-big" onClick={onEnter} disabled={!ready}>Open today’s book <Icon name="arrow" /></button>
          <p className="mono entry-load" aria-live="polite">
            {phase === 'error' ? 'Database unreachable. Reload to retry.' : steps.map(([label, ok]) => `${ok ? '●' : '○'} ${label}`).join('   ')}
          </p>
        </div>
      </div>
    </main>
  )
}

type InstallEvent = Event & { prompt: () => Promise<void> }
const PAGES = [['#/', 'Desk'], ['#/team', 'Team'], ['#/lab', 'Lab']] as const

function Header({ route, book }: { route: string; book: ReturnType<typeof useBook> }) {
  const [menu, setMenu] = useState(false)
  const [qr, setQr] = useState(false)
  const [armed, setArmed] = useState(false)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('refill.theme') ?? 'auto' } catch { return 'auto' } })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent) }
    addEventListener('beforeinstallprompt', on)
    return () => removeEventListener('beforeinstallprompt', on)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    try { localStorage.setItem('refill.theme', theme) } catch { /* ignore */ }
    const paper = getComputedStyle(root).getPropertyValue('--paper').trim()
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', paper))
  }, [theme])

  useEffect(() => {
    if (!menu) { setArmed(false); return }
    const off = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    addEventListener('mousedown', off)
    addEventListener('keydown', esc)
    return () => { removeEventListener('mousedown', off); removeEventListener('keydown', esc) }
  }, [menu])

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches
  const ws = book.state?.workspace

  return (
    <header className="top">
      <a className="brand" href="#/" aria-label="Refill desk"><Mark size={18} /><span>Refill</span></a>
      {ws && <span className="salon">{ws.salon}<small>synthetic demo day</small></span>}
      {route !== '/lab' && ws && <ClockControl now={ws.now_min} onCommit={(v) => book.act('set_clock', { p_now: v })} />}
      <nav className="top-nav" aria-label="Pages">
        {PAGES.map(([href, label]) => {
          const on = href === '#/' ? !['/lab', '/team'].includes(route) : route === href.slice(1)
          return <a key={href} href={href} className={on ? 'is-on' : ''} aria-current={on ? 'page' : undefined}>{label}</a>
        })}
      </nav>
      <div className="menu-wrap" ref={menuRef}>
        <button className="icon-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="More"><Icon name="more" /></button>
        {menu && (
          <div className="menu" role="menu">
            <button role="menuitem" onClick={async () => { await copy(location.href); setMenu(false) }}><Icon name="share" /> Copy link to this day</button>
            <button role="menuitem" onClick={() => { setQr(true); setMenu(false) }}><Icon name="phone" /> Open this desk on a phone</button>
            {install && <button role="menuitem" onClick={async () => { await install.prompt(); setInstall(null); setMenu(false) }}><Icon name="install" /> Install Refill</button>}
            {ios && <p className="menu-note">On iPhone: Share, then Add to Home Screen.</p>}
            <button role="menuitem" onClick={() => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')}>
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} /> Theme: {theme}
            </button>
            <button role="menuitem" className={armed ? 'is-armed' : ''} onClick={async () => {
              if (!armed) return setArmed(true)
              await book.reset(); setMenu(false)
            }}><Icon name="reset" /> {armed ? 'Tap again: reset today to its start' : 'Reset demo day'}</button>
          </div>
        )}
      </div>
      {qr && <Modal title="This desk on a phone" onClose={() => setQr(false)}><div className="qr-one"><Qr text={book.desk ? ownerLink(book.desk) : location.href} size={208} /><p className="quiet">Same day, same data. This code carries your owner key, so keep it to yourself.</p></div></Modal>}
    </header>
  )
}

function ClockControl({ now, onCommit }: { now: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(now)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editing = useRef(false)
  useEffect(() => { if (!editing.current) setV(now) }, [now])
  const change = (n: number) => {
    const next = Math.min(1200, Math.max(600, n))
    editing.current = true
    setV(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { onCommit(next); editing.current = false }, 300)
  }
  return (
    <div className="clockctl">
      <span className="overline">Demo clock</span>
      <button className="icon-btn" onClick={() => change(v - 15)} aria-label="15 minutes earlier"><Icon name="minus" size={16} /></button>
      <output className="clock-out" aria-live="off">{clock(v)}</output>
      <button className="icon-btn" onClick={() => change(v + 15)} aria-label="15 minutes later"><Icon name="plus" size={16} /></button>
      <input type="range" min={600} max={1200} step={5} value={v} onChange={(e) => change(Number(e.target.value))} aria-label="Demo clock" aria-valuetext={clock(v)} />
    </div>
  )
}
