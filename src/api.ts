// Talks to the database functions in supabase/migrations. Nothing here writes a
// table directly; every write is a function that re-checks the rules.
import { useCallback, useEffect, useRef, useState } from 'react'
import { rpc } from './rpc.ts'
import { demoDay } from './day'
import { toHHMM, toMin, type Entry, type Slot } from './engine'

export interface Workspace { id: string; salon: string; now_min: number; late_cutoff_min: number; min_lead_min: number }
export interface DbStaff { id: string; name: string; skills: string[]; present: boolean }
export interface DbSlot {
  id: string; start_min: number; minutes: number; skill: string; status: 'free' | 'booked' | 'blocked'
  staff_id: string | null; customer: string | null; service: string | null; price_inr: number | null; refilled: boolean
}
export interface DbEntry {
  id: string; pos: number; name: string; minutes: number; skill: string; consent: boolean | null
  consent_at: string | null; consent_source: string | null; service: string | null; price_inr: number | null
  free_from: number | null; free_until: number | null; status: 'waiting' | 'booked' | 'removed'
}
export interface DbOffer { id: string; slot_id: string; entry_id: string; status: 'sent' | 'accepted' | 'waitlisted' | 'declined' | 'revoked'; created_at: string }
export interface DbBooking { id: number; slot_id: string; entry_id: string; offer_id: string | null; status: 'confirmed' | 'cancelled'; created_at: string }
export interface DbEvent { id: number; at: string; kind: string; code: string | null; slot_id: string | null; entry_id: string | null; booking_id: number | null; detail: Record<string, unknown> }
export interface State { workspace: Workspace; staff: DbStaff[]; slots: DbSlot[]; waitlist: DbEntry[]; offers: DbOffer[]; bookings: DbBooking[]; events: DbEvent[] }

export { ApiError, rpc } from './rpc.ts'

/** Engine-shaped views of database rows, so the page previews with the exact rules the database enforces. */
export const asSlot = (s: DbSlot): Slot => ({
  id: s.id, start: toHHMM(s.start_min), minutes: s.minutes, skill: s.skill, status: s.status,
  staff: s.staff_id, customer: s.customer, service: s.service, price_inr: s.price_inr,
})
export const asEntry = (e: DbEntry): Entry => ({
  id: e.id, name: e.name, minutes: e.minutes, skill: e.skill, consent: e.consent, service: e.service, price_inr: e.price_inr,
  free_from: e.free_from == null ? null : toHHMM(e.free_from), free_until: e.free_until == null ? null : toHHMM(Math.min(e.free_until, 1439)),
})

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

const KEY = 'refill.workspace'
const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const write = (id: string) => { try { localStorage.setItem(KEY, id) } catch { /* private mode: the URL still carries it */ } }

function putInUrl(id: string) {
  const url = new URL(location.href)
  if (url.searchParams.get('w') === id) return
  url.searchParams.set('w', id)
  history.replaceState(history.state, '', url)
}

export type Phase = 'connecting' | 'creating' | 'ready' | 'error'

// Functions that act on a whole workspace; offer-level ones (accept, decline, stop) take only the offer id.
const WS_FUNCS = new Set(['cancel_slot', 'send_offers', 'set_consent', 'add_entry', 'set_clock'])

/** Today's book: finds or creates this viewer's workspace, then keeps it fresh. */
export function useBook() {
  const [state, setState] = useState<State | null>(null)
  const [phase, setPhase] = useState<Phase>('connecting')
  const [offline, setOffline] = useState(false)
  const wsRef = useRef<string | null>(null)

  const load = useCallback(async (id: string) => {
    const s = await rpc<State | null>('get_state', { p_ws: id })
    if (s) setState(s)
    return s
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const known = new URL(location.href).searchParams.get('w') ?? read()
        if (known && /^[0-9a-f-]{36}$/i.test(known) && (await load(known))) {
          wsRef.current = known
        } else {
          setPhase('creating')
          const id = await rpc<string>('create_workspace', { p_day: dayPayload() })
          wsRef.current = id
          await load(id)
        }
        if (!alive) return
        write(wsRef.current!)
        putInUrl(wsRef.current!)
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
      if (document.hidden || !wsRef.current) return
      try { await load(wsRef.current); setOffline(false) } catch { setOffline(true) }
    }
    const t = setInterval(tick, 1200)
    const onVis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [phase, load])

  /** Run a database function, then refresh at once so the page never shows a stale state. */
  const act = useCallback(async <T,>(fn: string, args: Record<string, unknown> = {}) => {
    const out = await rpc<T>(fn, WS_FUNCS.has(fn) ? { p_ws: wsRef.current, ...args } : args)
    if (wsRef.current) await load(wsRef.current).catch(() => setOffline(true))
    return out
  }, [load])

  const reset = useCallback(async () => {
    if (!wsRef.current) return
    await rpc('reset_workspace', { p_ws: wsRef.current, p_day: dayPayload() })
    await load(wsRef.current)
  }, [load])

  return { state, phase, offline, ws: wsRef.current, act, reset }
}
