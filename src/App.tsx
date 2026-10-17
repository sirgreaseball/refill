import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ownerLink, readDesk, useBook } from './api'
import Offer from './Offer'
import Home from './Home'
import { Glow, reduced, useSpotlight } from './motion'
import { Icon, Mark, Modal, Qr, ToastHost, clock } from './ui'
import { figures, type Book } from './desk/common'

const Today = lazy(() => import('./desk/Today'))
const Waitlist = lazy(() => import('./desk/Waitlist'))
const Activity = lazy(() => import('./desk/Activity'))
const Overview = lazy(() => import('./Owner').then((m) => ({ default: m.Overview })))
const OwnerTeam = lazy(() => import('./Owner').then((m) => ({ default: m.Team })))
const Rules = lazy(() => import('./Owner').then((m) => ({ default: m.Rules })))
const Lab = lazy(() => import('./Lab'))
const StaffView = lazy(() => import('./StaffView'))
const Join = lazy(() => import('./Join'))
const Me = lazy(() => import('./Me'))
const Move = lazy(() => import('./Move'))
const phoneWait = <main className="phone"><p className="quiet">Opening…</p></main>

function useRoute() {
  const get = () => location.hash.replace(/^#/, '') || '/'
  const [route, setRoute] = useState(get)
  useEffect(() => {
    // Pages cross-fade with a hint of blur where the browser supports view transitions; elsewhere they swap at once.
    const on = () => {
      const next = get()
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
      if (doc.startViewTransition && !reduced()) doc.startViewTransition(() => { flushSync(() => setRoute(next)); scrollTo({ top: 0 }) })
      else { setRoute(next); scrollTo({ top: 0 }) }
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
 */
export default function App() {
  const route = useRoute()
  const offer = /^\/o\/([0-9a-f-]{36})$/i.exec(route)
  if (offer) return <Offer id={offer[1]} />
  const move = /^\/m\/([0-9a-f-]{36})$/i.exec(route)
  if (move) return <Suspense fallback={phoneWait}><Move id={move[1]} /></Suspense>
  const staff = /^\/s\/([0-9a-f-]{36})\/([A-Za-z0-9_-]+)\/([0-9a-f]{32})$/i.exec(route)
  if (staff) return <Suspense fallback={phoneWait}><StaffView ws={staff[1]} staff={staff[2]} keyStr={staff[3]} /></Suspense>
  const preview = /^\/staff\/([A-Za-z0-9_-]+)$/.exec(route)
  const desk = readDesk()
  if (preview && desk) return <Suspense fallback={phoneWait}><StaffView ws={desk.id} staff={preview[1]} keyStr={desk.key} preview /></Suspense>
  const join = /^\/join\/([0-9a-f]{8})$/i.exec(route)
  if (join) return <Suspense fallback={phoneWait}><Join code={join[1]} /></Suspense>
  const me = /^\/me\/([0-9a-f]{32})$/i.exec(route)
  if (me) return <Suspense fallback={phoneWait}><Me token={me[1]} /></Suspense>
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
  else if (area === 'home') page = <Home book={book} />
  else if (!st) page = <Loading phase={book.phase} />
  else if (route === '/desk/waitlist') page = <Waitlist book={book} />
  else if (route === '/desk/activity') page = <Activity book={book} />
  else if (route.startsWith('/desk')) page = <Today key={slot ?? 'today'} book={book} initial={slot} />
  else if (route === '/owner/team') page = <OwnerTeam book={book} />
  else if (route === '/owner/rules') page = <Rules book={book} />
  else page = <Overview book={book} />

  return (
    <div className="app">
      <Glow st={st} />
      <Bar route={route} area={area} book={book} />
      {book.offline && <p className="banner" role="status">Offline. Showing the last saved state; changes resume when the connection is back.</p>}
      {area === 'home' ? page : <main className="page"><Suspense fallback={<Loading phase="page" />}>{page}</Suspense></main>}
      {st && (area === 'desk' || (area === 'owner' && st.role === 'owner')) && <Dock route={route} area={area} book={book} />}
    </div>
  )
}

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
  const canOwn = role === 'owner' || !!book.desk?.deskKey
  const [menu, setMenu] = useState<'roles' | 'more' | null>(null)
  const [qr, setQr] = useState(false)
  const [armed, setArmed] = useState(false)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('refill.theme') ?? 'auto' } catch { return 'auto' } })
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
  const label = area === 'desk' ? 'Front desk' : area === 'owner' ? 'Owner' : area === 'lab' ? 'Proof' : 'Choose a view'

  return (
    <header className="bar">
      <div className="bar-in" ref={ref}>
        <a className="brand" href="#/" aria-label="Refill home"><Mark size={14} /><span>Refill</span></a>
        {st && <span className="biz"><strong>{st.workspace.salon}</strong><small>demo day</small></span>}

        <div className="bar-end">
          {st && (area === 'desk' || area === 'owner') && <Clock now={st.workspace.now_min} onCommit={(v) => book.act('set_clock', { p_now: v })} />}
          <div className="menu-wrap">
            <button className={`role-pill ${area === 'desk' ? 'is-desk' : ''}`} onClick={() => setMenu(menu === 'roles' ? null : 'roles')} aria-expanded={menu === 'roles'} aria-haspopup="menu">
              <span className="dot" /><span className="label">{label}</span><Icon name="chevron" size={16} />
            </button>
            {menu === 'roles' && (
              <div className="menu" role="menu">
                <button role="menuitem" className={area === 'desk' ? 'is-on' : ''} onClick={() => go('desk')}><Icon name="desk" /> Front desk</button>
                <button role="menuitem" className={area === 'owner' ? 'is-on' : ''} onClick={() => go('owner')} disabled={!canOwn}><Icon name="chart" /> Owner{!canOwn && <small>owner key needed</small>}</button>
                {st?.staff.map((p) => <a key={p.id} role="menuitem" href={`#/staff/${p.id}`}><Icon name="user" /> {p.name}<small>staff view</small></a>)}
                {st?.workspace.join_code && <a role="menuitem" href={`#/join/${st.workspace.join_code}`}><Icon name="phone" /> Client sign-up</a>}
                <hr />
                <a role="menuitem" href="#/lab"><Icon name="lab" /> Proof for judges</a>
                <a role="menuitem" href="#/"><Icon name="users" /> All views</a>
              </div>
            )}
          </div>
          <div className="menu-wrap">
            <button className="icon-btn" onClick={() => setMenu(menu === 'more' ? null : 'more')} aria-expanded={menu === 'more'} aria-label="More"><Icon name="more" /></button>
            {menu === 'more' && (
              <div className="menu" role="menu">
                {role === 'owner' && <button role="menuitem" onClick={() => { setQr(true); setMenu(null) }}><Icon name="phone" /> Open on my phone</button>}
                {install && <button role="menuitem" onClick={async () => { await install.prompt(); setInstall(null); setMenu(null) }}><Icon name="install" /> Install Refill</button>}
                {ios && <p className="menu-note">On iPhone: Share, then Add to Home Screen.</p>}
                <button role="menuitem" onClick={() => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')}>
                  <Icon name={theme === 'dark' ? 'moon' : 'sun'} /> Theme<small>{theme}</small>
                </button>
                {role === 'owner' && <button role="menuitem" className={armed ? 'is-armed' : ''} onClick={async () => {
                  if (!armed) return setArmed(true)
                  await book.reset(); setMenu(null)
                }}><Icon name="reset" /> {armed ? 'Tap again to reset the day' : 'Reset demo day'}</button>}
              </div>
            )}
          </div>
        </div>
      </div>
      {qr && book.desk && <Modal title="Open on your phone" onClose={() => setQr(false)}><div className="qr-one"><Qr text={ownerLink(book.desk)} size={208} /><p className="quiet">Same day, same data. This code carries your owner key, so keep it to yourself.</p></div></Modal>}
    </header>
  )
}

function Clock({ now, onCommit }: { now: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(now)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editing = useRef(false)
  useEffect(() => { if (!editing.current) setV(now) }, [now])
  const change = (n: number) => {
    const next = Math.min(1200, Math.max(600, n))
    editing.current = true
    setV(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { onCommit(next); editing.current = false }, 350)
  }
  return (
    <div className="clock" title="Demo clock: move time forward to see offers expire and gaps pass">
      <button className="icon-btn" onClick={() => change(v - 15)} aria-label="15 minutes earlier"><Icon name="minus" size={16} /></button>
      <output aria-live="off">{clock(v)}</output>
      <button className="icon-btn" onClick={() => change(v + 15)} aria-label="15 minutes later"><Icon name="plus" size={16} /></button>
    </div>
  )
}

// ---------------------------------------------------------------- dock

const DOCKS = {
  desk: [['#/desk', 'Today', 'calendar'], ['#/desk/waitlist', 'Waitlist', 'list'], ['#/desk/activity', 'Activity', 'pulse']],
  owner: [['#/owner', 'Overview', 'chart'], ['#/owner/team', 'Team', 'users'], ['#/owner/rules', 'Rules', 'sliders']],
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
