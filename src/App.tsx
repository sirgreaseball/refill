import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ownerLink, readDesk, useBook } from './api'
import Offer from './Offer'
import Home from './Home'
import { Glow, reduced, useSpotlight } from './motion'
import { Icon, Mark, Modal, Qr, ToastHost, clock, useToast } from './ui'
import { useNoticeAlerts } from './Notices'
import { readSession, signOut } from './auth.ts'
import { figures, type Book } from './desk/common'

// After a deploy, the previous build's route files are gone. Reload once to pick up the new build
// instead of failing; if that also fails, the Boundary below shows a way out.
const fresh = <T,>(f: () => Promise<T>) => () => f().then((m) => { sessionStorage.removeItem('refill.reload'); return m }, (e) => {
  if (!sessionStorage.getItem('refill.reload')) { sessionStorage.setItem('refill.reload', '1'); location.reload() }
  throw e
})
const Today = lazy(fresh(() => import('./desk/Today')))
const Waitlist = lazy(fresh(() => import('./desk/Waitlist')))
const Activity = lazy(fresh(() => import('./desk/Activity')))
const Overview = lazy(fresh(() => import('./Owner').then((m) => ({ default: m.Overview }))))
const OwnerTeam = lazy(fresh(() => import('./Owner').then((m) => ({ default: m.Team }))))
const Rules = lazy(fresh(() => import('./Owner').then((m) => ({ default: m.Rules }))))
const Lab = lazy(fresh(() => import('./Lab')))
const StaffView = lazy(fresh(() => import('./StaffView')))
const Join = lazy(fresh(() => import('./Join')))
const Directory = lazy(fresh(() => import('./Directory')))
const Me = lazy(fresh(() => import('./Me')))
const Places = lazy(fresh(() => import('./Me').then((m) => ({ default: m.Places }))))
const Move = lazy(fresh(() => import('./Move')))
const Setup = lazy(fresh(() => import('./Setup')))
const Auth = lazy(fresh(() => import('./SignIn')))
const Welcome = lazy(fresh(() => import('./SignIn').then((m) => ({ default: m.Welcome }))))
const ClientHome = lazy(fresh(() => import('./ClientHome')))
const History = lazy(fresh(() => import('./Manage').then((m) => ({ default: m.History }))))
const Settings = lazy(fresh(() => import('./Settings')))
const Story = lazy(fresh(() => import('./story/Story')))

/** Catches a page that fails to load or render, so the rest of the app and a way out stay on screen. */
class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    const update = /dynamically imported module|loading chunk|module script failed/i.test(this.state.err.message)
    return (
      <div className="loading" role="alert">
        <Mark size={30} fill={0.3} />
        <p className="quiet">{update ? 'A newer version of Refill is out. Reload to open it.' : 'This page hit a problem. Nothing was lost: every change is saved in the database.'}</p>
        <div className="card-acts">
          <button className="btn is-primary" onClick={() => location.reload()}>Reload</button>
          <a className="btn is-quiet" href="#/" onClick={() => this.setState({ err: null })}>Home</a>
        </div>
      </div>
    )
  }
}
const phoneWait = <main className="phone"><p className="quiet">Opening…</p></main>

function useRoute() {
  const get = () => location.hash.replace(/^#/, '') || '/'
  const [route, setRoute] = useState(get)
  useEffect(() => {
    // Pages cross-fade with a hint of blur where the browser supports view transitions; elsewhere they swap at once.
    const on = () => {
      const next = get()
      const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> } }
      let done = false
      const apply = (sync: boolean) => {
        if (done) return
        done = true
        if (sync) flushSync(() => setRoute(next))
        else setRoute(next)
        scrollTo({ top: 0 })
      }
      if (doc.startViewTransition && !reduced()) {
        // A newer route skips the old transition; that rejection is expected, not an error.
        const vt = doc.startViewTransition(() => apply(true))
        vt.ready.catch(() => {}); vt.finished.catch(() => {}); vt.updateCallbackDone.catch(() => {})
        // A window that cannot paint (hidden, minimised, captured off-screen) never runs the
        // transition's callback; the page must change anyway.
        setTimeout(() => apply(false), 350)
      } else apply(false)
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return route
}

/**
 * Routes, by role:
 *   #/                                 who is using Refill: pick a role
 *   #/desk, #/desk/waitlist, #/desk/activity    the front desk
 *   #/owner, #/owner/team, #/owner/rules        the owner
 *   #/lab                              proof for judges: the case checks, live
 *   #/staff/<id>                       owner or desk previewing a staff member's view
 *   #/s/<ws>/<staff>/<key>             a staff member's own link
 *   #/join/<code>, #/me/<token>        a client signing up, then their own page
 *   #/o/<offer>, #/m/<move>            a client's offer, a client's link to move or cancel
 *   #/settings                         the signed-in person's account, and the owner's business
 */
export default function App() {
  if (location.pathname.replace(/\/+$/, '') === '/splash') return <Boundary><Suspense fallback={phoneWait}><Story /></Suspense></Boundary>
  return <HashApp />
}

function HashApp() {
  const route = useRoute()
  return <Boundary><Routes route={route} /></Boundary>
}

function Routes({ route }: { route: string }) {
  const offer = /^\/o\/([0-9a-f-]{36})$/i.exec(route)
  if (offer) return <Offer id={offer[1]} />
  const move = /^\/m\/([0-9a-f-]{36})$/i.exec(route)
  if (move) return <Suspense fallback={phoneWait}><Move id={move[1]} /></Suspense>
  const staff = /^\/s\/([0-9a-f-]{36})\/([A-Za-z0-9_-]+)\/([0-9a-f]{32})$/i.exec(route)
  if (staff) return <Suspense fallback={phoneWait}><StaffView ws={staff[1]} staff={staff[2]} keyStr={staff[3]} /></Suspense>
  const preview = /^\/staff\/([A-Za-z0-9_-]+)$/.exec(route)
  const desk = readDesk()
  if (preview && desk) return <Suspense fallback={phoneWait}><StaffView ws={desk.id} staff={preview[1]} keyStr={desk.key} preview /></Suspense>
  const join = /^\/join\/([0-9a-f]{8})(\/wait)?$/i.exec(route)
  if (join) return <Suspense fallback={phoneWait}><Join code={join[1]} start={join[2] ? 'wait' : 'book'} /></Suspense>
  if (route === '/places') return <Suspense fallback={phoneWait}><Directory /></Suspense>
  const me = /^\/me\/([0-9a-f]{32})$/i.exec(route)
  if (me) return <Suspense fallback={phoneWait}><Me token={me[1]} /></Suspense>
  if (route === '/me') return <Suspense fallback={phoneWait}><Places /></Suspense>
  return <ToastHost><Shell route={route === '/team' ? '/owner/team' : route} /></ToastHost>
}

type Area = 'home' | 'desk' | 'owner' | 'lab'
const areaOf = (r: string): Area => (r.startsWith('/desk') ? 'desk' : r.startsWith('/owner') ? 'owner' : r === '/lab' ? 'lab' : 'home')

function Shell({ route }: { route: string }) {
  const book = useBook()
  const area = areaOf(route)
  const st = book.state
  useSpotlight()
  const slot = /^\/desk\/slot\/([A-Za-z0-9_-]+)$/.exec(route)?.[1]

  let page: ReactNode
  if (area === 'lab') page = <Lab />
  else if (route === '/settings' && (book.phase === 'client' || book.phase === 'ready')) page = <Suspense fallback={<Loading phase="page" />}><Settings book={book} /></Suspense>
  else if (book.phase === 'auth') page = <Auth book={book} />
  else if (book.phase === 'welcome') page = <Welcome book={book} />
  else if (book.phase === 'client') page = <ClientHome book={book} />
  else if (book.phase === 'setup') page = <Setup book={book} />
  else if (area === 'home') page = <Home book={book} />
  else if (!st) page = <Loading phase={book.phase} />
  else if (route === '/desk/waitlist') page = <Waitlist book={book} />
  else if (route === '/desk/activity') page = <Activity book={book} />
  else if (route.startsWith('/desk')) page = <Today key={slot ?? 'today'} book={book} initial={slot} />
  else if (route === '/owner/team') page = <OwnerTeam book={book} />
  else if (route === '/owner/rules') page = <Rules book={book} />
  else if (route === '/owner/history') page = <History book={book} />
  else page = <Overview book={book} />

  return (
    <div className="app">
      <Glow st={st} />
      <Bar route={route} area={area} book={book} />
      {book.offline && <p className="banner" role="status">Offline. Showing the last saved state; changes resume when the connection is back.</p>}
      {ENTRY.has(book.phase) && area !== 'lab' ? <Boundary key={route}><Suspense fallback={<Loading phase="page" />}>{page}</Suspense></Boundary>
        : area === 'home' ? <Boundary key={route}>{page}</Boundary>
        : <main className="page"><Boundary key={route}><Suspense fallback={<Loading phase="page" />}>{page}</Suspense></Boundary></main>}
      {st && (area === 'desk' || (area === 'owner' && st.role === 'owner')) && <Dock route={route} area={area} book={book} />}
    </div>
  )
}

// Account steps and the client's home render their own page, without the business shell.
const ENTRY = new Set(['auth', 'welcome', 'client', 'setup'])

function Loading({ phase }: { phase: string }) {
  return (
    <div className="loading">
      <Mark size={30} fill={0.3} />
      <p className="quiet">{phase === 'error' ? 'Could not reach the database. Check the connection and reload.' : phase === 'creating' ? 'Setting up a fresh demo day…' : 'Opening today…'}</p>
    </div>
  )
}

// ---------------------------------------------------------------- top bar

type InstallEvent = Event & { prompt: () => Promise<void> }

function Bar({ route, area, book }: { route: string; area: Area; book: Book }) {
  const st = book.state
  const role = st?.role
  const live = st?.workspace.kind === 'live'
  const canOwn = role === 'owner' || !!book.desk?.deskKey
  const [menu, setMenu] = useState<'roles' | 'more' | null>(null)
  const [qr, setQr] = useState(false)
  const toast = useToast()
  const [armed, setArmed] = useState(false)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('refill.theme') ?? 'auto' } catch { return 'auto' } })
  // Refill is dark unless light is chosen, whatever the phone's own setting.
  const dark = theme !== 'light'
  const ref = useRef<HTMLDivElement>(null)

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
  }, [theme])
  useEffect(() => {
    if (!menu) { setArmed(false); return }
    const off = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
    addEventListener('pointerdown', off)
    addEventListener('keydown', esc)
    return () => { removeEventListener('pointerdown', off); removeEventListener('keydown', esc) }
  }, [menu])
  useEffect(() => setMenu(null), [route])

  const go = async (r: 'desk' | 'owner') => {
    setMenu(null)
    if (r === 'owner') await book.viewAs('owner')
    else if (role !== 'desk' || book.desk?.deskKey) await book.viewAs('desk')
    location.hash = r === 'desk' ? '#/desk' : '#/owner'
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches
  const session = readSession()
  const who = book.profile?.name ?? session?.user.email.split('@')[0] ?? (role === 'owner' ? 'Owner' : role === 'desk' ? 'Front desk' : 'Guest')
  const initial = who.slice(0, 1).toUpperCase()
  const unread = useNoticeAlerts(st, toast)
  const label = area === 'desk' ? 'Front desk' : area === 'owner' ? 'Owner' : area === 'lab' ? 'Proof' : 'Choose a view'

  return (
    <header className="bar">
      <div className="bar-in" ref={ref}>
        <a className="brand" href="/splash" aria-label="Refill: the story page"><Mark size={14} /><span>Refill</span></a>
        {st && <span className="biz"><strong>{st.workspace.salon}</strong><small>{live ? st.workspace.business_type ?? 'today' : 'demo day'}</small></span>}

        <div className="bar-end">
          {book.mode === 'live'
            ? <button className="demo-pill" onClick={() => book.setMode('demo')}>Try the demo</button>
            : <span className="demo-pill is-on"><span>Demo</span><button onClick={() => book.setMode('live')} aria-label="Leave the demo">Exit</button></span>}
          {st && (area === 'desk' || area === 'owner') && (live
            ? <LiveClock />
            : <Clock now={st.workspace.now_min} onCommit={(v) => book.act('set_clock', { p_now: v })} />)}
          {role === 'owner' && <a className={`icon-btn bell ${unread ? 'has-new' : ''}`} href="#/owner" aria-label={unread ? `${unread} new notices` : 'Notices'} title="Notices"
            onClick={() => { try { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission() } catch { /* not supported */ } }}>
            <Icon name="bell" />{unread > 0 && <span className="badge">{unread}</span>}</a>}
          {!ENTRY.has(book.phase) && <div className="menu-wrap">
            <button className={`role-pill ${area === 'desk' ? 'is-desk' : ''}`} onClick={() => setMenu(menu === 'roles' ? null : 'roles')} aria-expanded={menu === 'roles'} aria-haspopup="menu">
              <span className="dot" /><span className="label">{label}</span><Icon name="chevron" size={16} />
            </button>
            {menu === 'roles' && (
              <div className="menu" role="menu">
                <button role="menuitem" className={area === 'desk' ? 'is-on' : ''} onClick={() => go('desk')}><Icon name="desk" /> Front desk</button>
                <button role="menuitem" className={area === 'owner' ? 'is-on' : ''} onClick={() => go('owner')} disabled={!canOwn}><Icon name="chart" /> Owner{!canOwn && <small>owner key needed</small>}</button>
                {st?.staff.map((p) => <a key={p.id} role="menuitem" href={`#/staff/${p.id}`}><Icon name="user" /> {p.name}<small>staff view</small></a>)}
                {st?.workspace.join_code && <a role="menuitem" href={`#/join/${st.workspace.join_code}`}><Icon name="phone" /> Client booking page</a>}
                <hr />
                <a role="menuitem" href="#/lab"><Icon name="lab" /> Proof for judges</a>
                <a role="menuitem" href="#/"><Icon name="users" /> All views</a>
              </div>
            )}
          </div>}
          <button className="icon-btn theme-btn" onClick={(e) => flood(e.currentTarget, () => setTheme(dark ? 'light' : 'dark'))}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}><Icon name={dark ? 'sun' : 'moon'} /></button>
          {(session || st) && <div className="menu-wrap">
            <button className="me-btn" onClick={() => setMenu(menu === 'more' ? null : 'more')} aria-expanded={menu === 'more'} aria-haspopup="menu" aria-label="Profile and settings">{initial}</button>
            {menu === 'more' && (
              <div className="menu" role="menu">
                <div className="menu-head">
                  <span className="avatar-sm" aria-hidden="true">{initial}</span>
                  <span><strong>{who}</strong><small>{session?.user.email ?? (role === 'owner' ? 'owner key on this device' : role === 'desk' ? 'front-desk link' : 'not signed in')}</small></span>
                </div>
                <hr />
                {(session || role === 'owner') && <a role="menuitem" href="#/settings"><Icon name="sliders" /> Settings</a>}
                <button role="menuitem" className="menu-theme" onClick={() => { setMenu(null); setTheme(dark ? 'light' : 'dark') }}><Icon name={dark ? 'sun' : 'moon'} /> {dark ? 'Light theme' : 'Dark theme'}</button>
                {role === 'owner' && <button role="menuitem" onClick={() => { setQr(true); setMenu(null) }}><Icon name="phone" /> Open on my phone</button>}
                {install && <button role="menuitem" onClick={async () => { await install.prompt(); setInstall(null); setMenu(null) }}><Icon name="install" /> Install Refill</button>}
                {ios && <p className="menu-note">On iPhone: Share, then Add to Home Screen.</p>}
                {role === 'owner' && !live && <button role="menuitem" className={armed ? 'is-armed' : ''} onClick={async () => {
                  if (!armed) return setArmed(true)
                  await book.reset(); setMenu(null)
                }}><Icon name="reset" /> {armed ? 'Tap again to reset the day' : 'Reset demo day'}</button>}
                {session && <>
                  <hr />
                  <button role="menuitem" onClick={() => { setMenu(null); signOut() }}><Icon name="arrow" /> Sign out</button>
                </>}
              </div>
            )}
          </div>}
        </div>
      </div>
      {qr && book.desk && <Modal title="Open on your phone" onClose={() => setQr(false)}><div className="qr-one"><Qr text={ownerLink(book.desk)} size={208} /><p className="quiet">Same day, same data. This code carries your owner key, so keep it to yourself.</p></div></Modal>}
    </header>
  )
}

// The theme floods out from the toggle as a wobbling drop, as in Threshold: the old page is a still
// snapshot, the new one is live underneath, and a clip-path reveals it.
function blob(cx: number, cy: number, r: number, wobble: number, t: number) {
  const out: string[] = []
  for (let j = 0; j < 72; j++) {
    const a = (j / 72) * Math.PI * 2
    const k = 1 + wobble * (0.55 * Math.sin(3 * a + 5.1 * t + 0.6) + 0.3 * Math.sin(5 * a - 7.3 * t + 2.1) + 0.15 * Math.sin(9 * a + 11.7 * t + 4.2))
    out.push(`${(cx + Math.cos(a) * r * k).toFixed(1)}px ${(cy + Math.sin(a) * r * k).toFixed(1)}px`)
  }
  return `polygon(${out.join(',')})`
}
function flood(btn: HTMLElement, change: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }
  if (!doc.startViewTransition || reduced()) return change()
  if (document.documentElement.classList.contains('theme-flooding')) return
  const b = btn.getBoundingClientRect()
  const cx = b.left + b.width / 2
  const cy = b.top + b.height / 2
  const far = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) * 1.18
  const root = document.documentElement
  root.classList.add('theme-flooding')
  let done = false
  const once = () => { if (!done) { done = true; flushSync(change) } }
  const vt = doc.startViewTransition(once)
  // If the window cannot paint, the callback never runs: switch the theme anyway.
  setTimeout(() => { if (!done) { once(); root.classList.remove('theme-flooding') } }, 400)
  vt.ready.then(() => root.animate(Array.from({ length: 37 }, (_, i) => {
    const t = i / 36
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    return { clipPath: blob(cx, cy, 2 + far * e, 0.14 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t), t) }
  }), { duration: 1150, easing: 'linear', pseudoElement: '::view-transition-new(root)' })).catch(() => {})
  vt.finished.finally(() => root.classList.remove('theme-flooding'))
}

/** India time now, in minutes since midnight. India has no daylight saving. */
const istMinute = () => { const d = new Date(Date.now() + 330 * 60_000); return d.getUTCHours() * 60 + d.getUTCMinutes() }
/** Calls back at the start of every minute, so a clock never lags the real one. */
function onEveryMinute(f: () => void) {
  let t: ReturnType<typeof setTimeout>
  const next = () => { t = setTimeout(() => { f(); next() }, 60_000 - (Date.now() % 60_000) + 30) }
  next()
  return () => clearTimeout(t)
}

/** A live business runs on the real clock: India time, ticking on the minute. */
function LiveClock() {
  const [m, setM] = useState(istMinute)
  useEffect(() => onEveryMinute(() => setM(istMinute())), [])
  return <span className="clock is-live" title="Real time, India"><output>{clock(m)}</output></span>
}

/** The demo clock: type any time, step it by 15 minutes, or tap Now to follow the real time. */
function Clock({ now, onCommit }: { now: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(now)
  const [real, setReal] = useState(() => { try { return localStorage.getItem('refill.realTime') === '1' } catch { return false } })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editing = useRef(false)
  const commit = useRef(onCommit)
  const picker = useRef<HTMLInputElement>(null)
  useEffect(() => { commit.current = onCommit })
  useEffect(() => { if (!editing.current) setV(now) }, [now])
  useEffect(() => {
    try { localStorage.setItem('refill.realTime', real ? '1' : '0') } catch { /* private mode */ }
    if (!real) return
    const follow = () => { const m = istMinute(); setV(m); commit.current(m) }
    follow()
    return onEveryMinute(follow)
  }, [real])
  const change = (n: number) => {
    const next = Math.min(1439, Math.max(0, n))
    editing.current = true
    setV(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { commit.current(next); editing.current = false }, 350)
  }
  return (
    <div className={`clock is-demo ${real ? 'is-real' : ''}`} title={real ? 'Following the real time. Tap Now to set your own.' : 'Demo clock: type a time or step it to see offers expire and gaps pass'}>
      <button className="icon-btn" onClick={() => change(v - 15)} disabled={real} aria-label="15 minutes earlier"><Icon name="minus" size={16} /></button>
      {/* The time reads as 24-hour on every phone; tapping it opens the phone's own time picker. */}
      <button className="clock-time" disabled={real} aria-label={`Demo time ${clock(v)}. Tap to set your own`}
        onClick={() => { const el = picker.current; if (!el) return; try { el.showPicker() } catch { el.focus() } }}><output>{clock(v)}</output></button>
      <input ref={picker} className="clock-pick" type="time" tabIndex={-1} aria-hidden="true" value={clock(v)} required
        onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); if (Number.isFinite(h) && Number.isFinite(m)) change(h * 60 + m) }} />
      <button className="icon-btn" onClick={() => change(v + 15)} disabled={real} aria-label="15 minutes later"><Icon name="plus" size={16} /></button>
      <button className="clock-real" aria-pressed={real} onClick={() => setReal(!real)}>Now</button>
    </div>
  )
}

// ---------------------------------------------------------------- dock

const DOCKS = {
  desk: [['#/desk', 'Today', 'calendar'], ['#/desk/waitlist', 'Waitlist', 'list'], ['#/desk/activity', 'Activity', 'pulse']],
  owner: [['#/owner', 'Overview', 'chart'], ['#/owner/team', 'Team', 'users'], ['#/owner/history', 'History', 'book'], ['#/owner/rules', 'Rules', 'sliders']],
} as const

const isDockOn = (href: string, route: string) => (href === '#/desk' ? route === '/desk' || route.startsWith('/desk/slot') : route === href.slice(1))

function Dock({ route, area, book }: { route: string; area: 'desk' | 'owner'; book: Book }) {
  const f = book.state ? figures(book.state) : null
  const badge = f ? f.risk.length + f.held.length + f.open.length : 0
  return (
    <nav className="dock" aria-label={area === 'desk' ? 'Front desk' : 'Owner'}>
      <span className="dock-ind" style={{ transform: `translateX(${Math.max(0, DOCKS[area].findIndex(([h]) => isDockOn(h, route))) * 100}%)`, width: `calc((100% - 10px) / ${DOCKS[area].length})` }} aria-hidden="true" />
      {DOCKS[area].map(([href, label, icon]) => {
        const on = isDockOn(href, route)
        return (
          <a key={href} href={href} className={on ? 'is-on' : ''} aria-current={on ? 'page' : undefined}>
            <Icon name={icon} size={20} />{label}
            {href === '#/desk' && badge > 0 && <span className="badge" aria-label={`${badge} need you`}>{badge}</span>}
          </a>
        )
      })}
    </nav>
  )
}
