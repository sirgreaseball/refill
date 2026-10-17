// Talks to the database functions in supabase/migrations. Nothing here writes a
// table directly; every write is a function that re-checks the rules, and every
// owner function checks the owner key.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, rpc } from './rpc.ts'
import { demoDay } from './day'
import { toHHMM, toMin, type Entry, type Slot, type Staff } from './engine'

export interface Workspace {
  id: string; salon: string; now_min: number; late_cutoff_min: number; min_lead_min: number
  hold_min: number; max_offers: number; join_code: string | null
}
export interface DbStaff { id: string; name: string; skills: string[]; present: boolean }
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
export interface State { workspace: Workspace; staff: DbStaff[]; slots: DbSlot[]; waitlist: DbEntry[]; offers: DbOffer[]; bookings: DbBooking[]; events: DbEvent[] }

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
  }
}

// ---------------------------------------------------------------- the owner's key

export interface Desk { id: string; key: string; join: string | null }
const KEY = 'refill.desk'

export function readDesk(): Desk | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return d && typeof d.id === 'string' && typeof d.key === 'string' ? d : null
  } catch { return null }
}
const writeDesk = (d: Desk) => { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* private mode: this tab still works */ } }

/** A desk link carries ?w= (which day) and, only for the owner's own phone, ?k= (the key). The key never stays in the address bar. */
function deskFromUrl(): Desk | null {
  const url = new URL(location.href)
  const id = url.searchParams.get('w')
  const key = url.searchParams.get('k')
  if (key) {
    url.searchParams.delete('k')
    history.replaceState(history.state, '', url)
  }
  return id && key ? { id, key, join: null } : null
}

function putInUrl(id: string) {
  const url = new URL(location.href)
  if (url.searchParams.get('w') === id) return
  url.searchParams.set('w', id)
  history.replaceState(history.state, '', url)
}

export const ownerLink = (d: Desk) => `${location.origin}/?w=${d.id}&k=${d.key}#/`
export const joinLink = (code: string) => `${location.origin}/#/join/${code}`
export const staffLinkUrl = (ws: string, staff: string, key: string) => `${location.origin}/#/s/${ws}/${staff}/${key}`

export type Phase = 'connecting' | 'creating' | 'ready' | 'error'

// Owner functions take p_ws and p_key; offer-level ones take only the offer id.
const OWNER_FUNCS = new Set(['cancel_slot', 'restore_slot', 'send_offers', 'set_consent', 'add_entry', 'set_clock',
  'staff_link', 'set_staff_presence', 'reassign_slot'])

/** Today's book: finds this owner's demo day (or makes a fresh one), then keeps it fresh. */
export function useBook() {
  const [state, setState] = useState<State | null>(null)
  const [phase, setPhase] = useState<Phase>('connecting')
  const [offline, setOffline] = useState(false)
  const desk = useRef<Desk | null>(null)

  const load = useCallback(async () => {
    const d = desk.current
    if (!d) return null
    const s = await rpc<State | null>('get_state', { p_ws: d.id, p_key: d.key })
    if (s) setState(s)
    return s
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const known = deskFromUrl() ?? readDesk()
        let ok = false
        if (known) {
          desk.current = known
          try { ok = !!(await load()) } catch (e) { if (!(e instanceof ApiError && e.code === 'FORBIDDEN')) throw e }
        }
        if (!ok) {
          setPhase('creating')
          const made = await rpc<{ id: string; owner_key: string; join_code: string }>('create_workspace', { p_day: dayPayload() })
          desk.current = { id: made.id, key: made.owner_key, join: made.join_code }
          await load()
        }
        if (!alive) return
        writeDesk({ ...desk.current!, join: desk.current!.join ?? null })
        putInUrl(desk.current!.id)
        setPhase('ready')
      } catch {
        if (alive) setPhase('error')
      }
    })()
    return () => { alive = false }
  }, [load])

  useEffect(() => {
    if (phase !== 'ready') return
    const tick = async () => {
      if (document.hidden) return
      try { await load(); setOffline(false) } catch { setOffline(true) }
    }
    const t = setInterval(tick, 1200)
    const onVis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [phase, load])

  /** Run a database function, then refresh at once so the page never shows a stale state. */
  const act = useCallback(async <T,>(fn: string, args: Record<string, unknown> = {}) => {
    const d = desk.current
    const out = await rpc<T>(fn, OWNER_FUNCS.has(fn) && d ? { p_ws: d.id, p_key: d.key, ...args } : args)
    await load().catch(() => setOffline(true))
    return out
  }, [load])

  const reset = useCallback(async () => {
    const d = desk.current
    if (!d) return
    await rpc('reset_workspace', { p_ws: d.id, p_key: d.key, p_day: dayPayload() })
    await load()
  }, [load])

  return { state, phase, offline, desk: desk.current, act, reset }
}
