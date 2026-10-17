// A real race against the real database, shared by the Lab's "Run live race"
// button and scripts/race-test.ts. Creates a throwaway workspace, offers one
// slot to N customers, fires every Accept at once, then checks the outcome.
import { rpc } from './rpc.ts'

export interface RaceReport {
  taps: number
  ms: number
  booking: number | null
  confirmed: number
  waitlisted: number
  checks: [string, boolean][]
  ok: boolean
}

type Tap = { outcome: string; booking?: number; lost_to?: number }
type Sent = { results: { offer: string }[] }

export async function liveRace(n = 8): Promise<RaceReport> {
  const racers = Array.from({ length: n }, (_, i) => ({ id: `W${i + 1}`, name: `Racer ${i + 1}`, minutes: 60, skill: 'hair', consent: true }))
  const { id: ws, owner_key: key } = await rpc<{ id: string; owner_key: string }>('create_workspace', {
    p_day: {
      salon: 'Race test', now_min: 600,
      slots: [
        { id: 'S1', start_min: 1020, minutes: 60, skill: 'hair', status: 'free' },
        { id: 'S2', start_min: 1110, minutes: 60, skill: 'hair', status: 'free' },
      ],
      waitlist: [...racers, { id: 'WX', name: 'Replies STOP', minutes: 30, skill: 'hair', consent: true }],
    },
  })
  const sent = await rpc<Sent>('send_offers', { p_ws: ws, p_key: key, p_slot: 'S1', p_entries: racers.map((r) => r.id) })
  const offers = sent.results.map((r) => r.offer)

  const t0 = performance.now()
  const outcomes = await Promise.all(offers.map((id) => rpc<Tap>('accept_offer', { p_offer: id })))
  const ms = Math.round(performance.now() - t0)

  const confirmed = outcomes.filter((o) => o.outcome === 'CONFIRMED')
  const waitlisted = outcomes.filter((o) => o.outcome === 'WAITLISTED')
  const booking = confirmed[0]?.booking ?? null
  const again = await rpc<Tap>('accept_offer', { p_offer: offers[outcomes.findIndex((o) => o.outcome === 'CONFIRMED')] })

  const wx = await rpc<Sent>('send_offers', { p_ws: ws, p_key: key, p_slot: 'S2', p_entries: ['WX'] })
  await rpc('stop_messages', { p_offer: wx.results[0].offer })
  const afterStop = await rpc<Tap>('accept_offer', { p_offer: wx.results[0].offer })

  const state = await rpc<{ bookings: { slot_id: string; status: string }[] }>('get_state', { p_ws: ws, p_key: key })
  const live = (slot: string) =>
    state.bookings.filter((b) => b.slot_id === slot && b.status === 'confirmed').length

  const checks: [string, boolean][] = [
    [`${n} simultaneous taps, exactly 1 confirmed (#${booking})`, confirmed.length === 1],
    [`${n - 1} kept their waitlist place, each told it lost to #${booking}`, waitlisted.length === n - 1 && waitlisted.every((w) => w.lost_to === booking)],
    ['the database holds one confirmed booking for the slot', live('S1') === 1],
    ['a repeated tap returns the same booking', again.outcome === 'ALREADY_CONFIRMED' && again.booking === booking],
    ['STOP after the offer: booking refused, slot stays free', afterStop.outcome === 'REVOKED' && live('S2') === 0],
  ]
  return { taps: n, ms, booking, confirmed: confirmed.length, waitlisted: waitlisted.length, checks, ok: checks.every(([, ok]) => ok) }
}
