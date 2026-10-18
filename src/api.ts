// Talks to the database functions in supabase/migrations. Nothing here writes a
// table directly; every write is a function that re-checks the rules, and every
// owner function checks the owner key.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, rpc } from './rpc.ts'
import { AUTH_EVENT, readSession } from './auth.ts'
import { demoDay } from './day'
import { toHHMM, toMin, type Entry, type Slot, type Staff } from './engine'

export interface Workspace {
  id: string; salon: string; now_min: number; late_cutoff_min: number; min_lead_min: number
  hold_min: number; max_offers: number; join_code: string | null
  /** 'demo': the sample day on a demo clock. 'live': a real business on the real clock. Absent before migration 007. */
  kind?: Mode; business_type?: string | null; day?: string | null; listed?: boolean
  /** Move an absent person's appointments to a teammate automatically (migration 012). */
  auto_cover?: boolean
}
export interface DbStaff { id: string; name: string; skills: string[]; present: boolean; shift_start: number; shift_end: number }
export interface DbService { id: string; name: string; minutes: number; skill: string; price_inr: number | null }
export interface DbTask { id: number; staff_id: string; text: string; done: boolean; created_at: string; missed?: boolean }
export interface DbHistory { id: number; day: string; start_min: number; minutes: number; service: string | null; staff_name: string | null; customer: string | null; status: 'booked' | 'unfilled' | 'held'; price_inr: number | null; refilled: boolean }
export interface DbSlot {
  id: string; start_min: number; minutes: number; skill: string; status: 'free' | 'booked' | 'blocked'
  staff_id: string | null; customer: string | null; service: string | null; price_inr: number | null; refilled: boolean
  cancelled_customer: string | null; blocked_reason: 'STAFF_ABSENT' | null
}
export interface DbEntry {
  id: string; pos: number; name: string; minutes: number; skill: string; consent: boolean | null
  consent_at: string | null; consent_source: string | null; service: string | null; price_inr: number | null
  free_from: number | null; free_until: number | null; status: 'waiting' | 'booked' | 'removed'; source: 'front desk' | 'self sign-up'
}
export interface DbOffer { id: string; slot_id: string; entry_id: string; status: 'sent' | 'accepted' | 'waitlisted' | 'declined' | 'revoked' | 'expired'; created_at: string; expires_min: number | null }
export interface DbBooking { id: number; slot_id: string; entry_id: string; offer_id: string | null; status: 'confirmed' | 'cancelled'; created_at: string }
export interface DbEvent { id: number; at: string; kind: string; code: string | null; slot_id: string | null; entry_id: string | null; booking_id: number | null; detail: Record<string, unknown> }
export interface DbMove { id: string; slot_id: string; customer: string; reason: 'STAFF_ABSENT' | 'CUSTOMER_REQUEST' | 'SALON_REQUEST'; status: 'open' | 'moved' | 'cancelled' | 'withdrawn'; to_slot: string | null; created_at: string }
/** One appointment the absence planner moved, or could not move (migration 012). */
export interface CoverItem { slot: string; customer: string | null; service: string | null; start_min: number; minutes: number; to?: string; to_name?: string }
/** Left for the owner when someone is marked out: what was covered, what is left, their tasks, who is in. */
export interface DbNotice {
  id: number; kind: 'STAFF_ABSENT'; staff_id: string | null; created_at: string; read_at: string | null
  detail: { name: string; auto_cover: boolean; covered: CoverItem[]; left: CoverItem[]; held: number; tasks: { id: number; text: string }[]
    available: { id: string; name: string; skills: string[]; shift_start: number; shift_end: number }[] }
}
export type Role = 'owner' | 'desk'
export interface State {
  role: Role; workspace: Workspace; staff: DbStaff[]; slots: DbSlot[]; waitlist: DbEntry[]; offers: DbOffer[]
  bookings: DbBooking[]; moves: DbMove[]; events: DbEvent[]; services?: DbService[]; tasks?: DbTask[]; notices?: DbNotice[]
}

/** The business's own services; a demo day has none, so it uses the sample salon list. */
export const servicesOf = (st: State | null): DbService[] => (st?.services?.length ? st.services : demoDay().services)
/** A service's skill: what a staff member must be able to do. Derived from its name for new businesses. */
export const skillOf = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'general'
/** A time an appointment could move to, as the database lists it (move_options in migration 005). */
export interface MoveOption { staff: string; name: string; start_min: number; gap: string | null; same_time: boolean }

export { ApiError, rpc }

/** Engine-shaped views of database rows, so the page previews with the exact rules the database enforces. */
export const asSlot = (s: DbSlot): Slot => ({
  id: s.id, start: toHHMM(s.start_min), minutes: s.minutes, skill: s.skill, status: s.status,
  staff: s.staff_id, customer: s.customer, service: s.service, price_inr: s.price_inr,
})
export const asEntry = (e: DbEntry): Entry => ({
  id: e.id, name: e.name, minutes: e.minutes, skill: e.skill, consent: e.consent, service: e.service, price_inr: e.price_inr,
  free_from: e.free_from == null ? null : toHHMM(e.free_from), free_until: e.free_until == null ? null : toHHMM(Math.min(e.free_until, 1439)),
})
export const asStaff = (p: DbStaff): Staff => ({ id: p.id, name: p.name, skills: p.skills, present: p.present })

/** The demo day from data/salon/*.csv, in the shape create_workspace expects. */
export function dayPayload() {
  const day = demoDay()
  return {
    salon: day.salon,
    now_min: toMin('11:15'),
    staff: day.staff,
    slots: day.slots.map((s) => ({ ...s, start_min: toMin(s.start) })),
    waitlist: day.waitlist.map((e) => ({
      ...e, free_from: e.free_from ? toMin(e.free_from) : null, free_until: e.free_until ? toMin(e.free_until) : null,
    })),
    tasks: DEMO_TASKS,
  }
}

/** A few jobs on the demo day, so an absence has tasks to hand over. */
const DEMO_TASKS = [
  { staff: 'ST2', text: 'Restock the colour bar before 2 pm' },
  { staff: 'ST2', text: 'Call back Mrs Rao about her bridal trial' },
  { staff: 'ST1', text: 'Sterilise the facial tools' },
  { staff: 'ST3', text: 'Count the nail polish stock' },
  { staff: 'ST4', text: 'Fold and shelve fresh towels' },
]

// ---------------------------------------------------------------- the owner's key

/** This browser's keys for one workspace. `key` is what it was opened with; `deskKey` is the front-desk key, if the owner made one. */
export interface Desk { id: string; key: string; join: string | null; deskKey?: string }
/** Live is the real business; demo is the sample day. Each keeps its own keys, so they never mix. */
export type Mode = 'live' | 'demo'
const STORE: Record<Mode, string> = { live: 'refill.business', demo: 'refill.desk' }
const MODE = 'refill.mode'

export function readMode(): Mode {
  try {
    const m = localStorage.getItem(MODE)
    if (m === 'live' || m === 'demo') return m
    // Browsers that used Refill before live businesses existed hold a demo day: keep them in it.
    return localStorage.getItem(STORE.demo) ? 'demo' : 'live'
  } catch { return 'live' }
}
const writeMode = (m: Mode) => { try { localStorage.setItem(MODE, m) } catch { /* private mode: this tab still works */ } }

export function readDesk(mode: Mode = readMode()): Desk | null {
  try {
    const d = JSON.parse(localStorage.getItem(STORE[mode]) ?? 'null')
    return d && typeof d.id === 'string' && typeof d.key === 'string' ? d : null
  } catch { return null }
}
const writeDesk = (d: Desk, mode: Mode) => { try { localStorage.setItem(STORE[mode], JSON.stringify(d)) } catch { /* private mode: this tab still works */ } }

/** A desk link carries ?w= (which day), ?k= (a key) and, for the front desk, ?r=desk. The key never stays in the address bar. */
function deskFromUrl(): Desk | null {
  const url = new URL(location.href)
  const id = url.searchParams.get('w')
  const key = url.searchParams.get('k')
  const asDesk = url.searchParams.get('r') === 'desk'
  if (key) {
    url.searchParams.delete('k')
    url.searchParams.delete('r')
    history.replaceState(history.state, '', url)
  }
  if (!id || !key) return null
  const mine = readDesk('live')?.id === id ? readDesk('live') : readDesk('demo')
  if (asDesk) {
    setViewAs('desk')
    return mine?.id === id ? { ...mine, deskKey: key } : { id, key, join: null }
  }
  setViewAs('owner')
  return { id, key, join: null, deskKey: mine?.id === id ? mine.deskKey : undefined }
}

// Which role this tab is acting as. The owner can step into the front desk's shoes; the
// database then sees the front-desk key and refuses owner-only actions for real.
const AS = 'refill.as'
const viewAsNow = (): Role => { try { return sessionStorage.getItem(AS) === 'desk' ? 'desk' : 'owner' } catch { return 'owner' } }
function setViewAs(r: Role) { try { if (r === 'desk') sessionStorage.setItem(AS, 'desk'); else sessionStorage.removeItem(AS) } catch { /* ignore */ } }
const keyFor = (d: Desk) => (viewAsNow() === 'desk' && d.deskKey ? d.deskKey : d.key)

function putInUrl(id: string) {
  const url = new URL(location.href)
  if (url.searchParams.get('w') === id) return
  url.searchParams.set('w', id)
  history.replaceState(history.state, '', url)
}

export const ownerLink = (d: Desk) => `${location.origin}/?w=${d.id}&k=${d.key}#/`
export const deskLinkUrl = (id: string, key: string) => `${location.origin}/?w=${id}&k=${key}&r=desk#/`
export const moveUrl = (id: string) => `${location.origin}/#/m/${id}`
export const joinLink = (code: string) => `${location.origin}/#/join/${code}`
export const staffLinkUrl = (ws: string, staff: string, key: string) => `${location.origin}/#/s/${ws}/${staff}/${key}`

export type Phase = 'connecting' | 'creating' | 'auth' | 'welcome' | 'client' | 'setup' | 'ready' | 'error'
/** The signed-in account: who they are and how they use Refill (null role: not chosen yet). */
export interface Profile { id: string; email: string; name: string | null; role: 'owner' | 'client' | null }

// Desk functions take p_ws and p_key; offer-level ones take only the offer id.
const DESK_FUNCS = new Set(['cancel_slot', 'restore_slot', 'send_offers', 'set_consent', 'add_entry', 'set_clock',
  'staff_link', 'set_staff_presence', 'reassign_slot', 'get_move_options', 'move_booking', 'move_link', 'desk_link', 'set_policy',
  'sync_clock', 'get_history', 'save_staff', 'remove_staff', 'save_service', 'remove_service', 'add_task', 'set_task', 'remove_task', 'add_appointment', 'cover_absence', 'reassign_task', 'read_notice', 'set_listed', 'update_business', 'delete_business'])

/** Today's book. Live: this browser's business, or the setup form if it has none. Demo: the sample day, made on first visit. */
export function useBook() {
  const [state, setState] = useState<State | null>(null)
  const [phase, setPhase] = useState<Phase>('connecting')
  const [offline, setOffline] = useState(false)
  const [mode, setModeState] = useState<Mode>(readMode)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authTick, setAuthTick] = useState(0)
  const desk = useRef<Desk | null>(null)
  const seen = useRef('')

  const load = useCallback(async () => {
    const d = desk.current
    if (!d) return null
    const s = await rpc<State | null>('get_state', { p_ws: d.id, p_key: keyFor(d) })
    // Re-render only when something changed: phones stay smooth between polls.
    const k = s ? JSON.stringify(s) : ''
    if (s && k !== seen.current) { seen.current = k; setState(s) }
    return s
  }, [])

  useEffect(() => {
    let alive = true
    desk.current = null
    seen.current = ''
    setState(null)
    setProfile(null)
    setOffline(false)
    setPhase('connecting')
    ;(async () => {
      try {
        // A desk or owner link opens its workspace directly. Otherwise the demo opens its own day,
        // and the real product goes through the account: sign in, choose a role, then the business.
        let known = deskFromUrl() ?? (mode === 'demo' ? readDesk('demo') : null)
        if (!known && mode === 'live') {
          if (!readSession()) { if (alive) setPhase('auth'); return }
          const me = await rpc<Profile | null>('get_profile', {})
          if (!alive) return
          setProfile(me)
          if (!me?.role) { setPhase('welcome'); return }
          if (me.role === 'client') { setPhase('client'); return }
          const mine = await rpc<{ id: string; join_code: string }[]>('my_businesses', {})
          if (!mine.length) { if (alive) setPhase('setup'); return }
          const local = readDesk('live')
          known = local?.id === mine[0].id ? local : { id: mine[0].id, key: '', join: mine[0].join_code }
        }
        let s: State | null = null
        if (known) {
          desk.current = known
          try { s = await load() } catch (e) { if (!(e instanceof ApiError && e.code === 'FORBIDDEN')) throw e }
        }
        if (s) {
          // A link may open the other kind of workspace: file it under its own kind.
          const kind: Mode = s.workspace.kind ?? 'demo'
          writeDesk({ ...desk.current!, join: desk.current!.join ?? s.workspace.join_code ?? null }, kind)
          if (kind !== mode) { writeMode(kind); if (alive) setModeState(kind); return }
        } else if (mode === 'live') {
          desk.current = null
          if (alive) setPhase(readSession() ? 'setup' : 'auth')
          return
        } else {
          setPhase('creating')
          const made = await rpc<{ id: string; owner_key: string; join_code: string }>('create_workspace', { p_day: dayPayload() })
          desk.current = { id: made.id, key: made.owner_key, join: made.join_code }
          writeDesk(desk.current, 'demo')
          await load()
        }
        if (!alive) return
        putInUrl(desk.current!.id)
        setPhase('ready')
      } catch {
        if (alive) setPhase('error')
      }
    })()
    return () => { alive = false }
  }, [load, mode, authTick])

  // Signing in or out, or a session that can no longer be refreshed, re-routes the whole app.
  useEffect(() => {
    const on = () => setAuthTick((t) => t + 1)
    addEventListener(AUTH_EVENT, on)
    return () => removeEventListener(AUTH_EVENT, on)
  }, [])
  /** Look the account up again, after choosing a role. */
  const refresh = useCallback(() => setAuthTick((t) => t + 1), [])

  useEffect(() => {
    if (phase !== 'ready') return
    const tick = async () => {
      if (document.hidden) return
      try { await load(); setOffline(false) } catch { setOffline(true) }
    }
    const t = setInterval(tick, 2000)
    const onVis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [phase, load])

  // A live book runs on the real clock: set it now and every minute, which also closes a past day into history.
  const live = phase === 'ready' && state?.workspace.kind === 'live'
  useEffect(() => {
    if (!live) return
    const sync = async () => {
      const d = desk.current
      if (!d || document.hidden) return
      try { await rpc('sync_clock', { p_ws: d.id, p_key: keyFor(d) }); await load() } catch { /* the next minute retries */ }
    }
    sync()
    const t = setInterval(sync, 60_000)
    return () => clearInterval(t)
  }, [live, load])

  /** Switch between the live business and the demo. Nothing is lost: each keeps its own workspace. */
  const setMode = useCallback((m: Mode) => {
    writeMode(m)
    setViewAs('owner')
    const url = new URL(location.href)
    url.searchParams.delete('w')
    history.replaceState(history.state, '', url)
    setModeState(m)
  }, [])

  /** Make this browser's live business. Returns the database's refusal code, or null when it worked. */
  const createBusiness = useCallback(async (biz: Record<string, unknown>) => {
    const made = await rpc<{ ok: boolean; code?: string; id: string; owner_key: string; join_code: string }>('create_business', { p_biz: biz })
    if (!made.ok) return made.code ?? 'INVALID_VALUE'
    const d = { id: made.id, key: made.owner_key, join: made.join_code }
    writeDesk(d, 'live')
    writeMode('live')
    desk.current = d
    await load()
    putInUrl(d.id)
    setPhase('ready')
    return null
  }, [load])

  /** Run a database function, then refresh at once so the page never shows a stale state. */
  const act = useCallback(async <T,>(fn: string, args: Record<string, unknown> = {}) => {
    const d = desk.current
    const out = await rpc<T>(fn, DESK_FUNCS.has(fn) && d ? { p_ws: d.id, p_key: keyFor(d), ...args } : args)
    await load().catch(() => setOffline(true))
    return out
  }, [load])

  const reset = useCallback(async () => {
    const d = desk.current
    if (!d) return
    await rpc('reset_workspace', { p_ws: d.id, p_key: d.key, p_day: dayPayload() })
    await load()
  }, [load])

  /** The front desk's key: made once by the owner, kept in this browser, replaced only on request. */
  const deskKey = useCallback(async (fresh = false) => {
    const d = desk.current
    if (!d) return null
    if (d.deskKey && !fresh) return d.deskKey
    const k = await rpc<string>('desk_link', { p_ws: d.id, p_key: d.key })
    desk.current = { ...d, deskKey: k }
    writeDesk(desk.current, readMode())
    return k
  }, [])

  /** Step into a role in this tab. Only a browser holding the owner key can switch back. */
  const viewAs = useCallback(async (r: Role) => {
    if (r === 'desk') await deskKey()
    setViewAs(r)
    await load()
  }, [deskKey, load])

  return { state, phase, offline, mode, profile, desk: desk.current, act, reset, deskKey, viewAs, setMode, createBusiness, refresh }
}
