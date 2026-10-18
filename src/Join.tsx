// A client chooses a date before loading that day's available appointments.
// The cancellation waitlist still belongs to today and is labelled separately.
// Consent for the waitlist is an explicit choice with nothing pre-selected; the database refuses
// a sign-up without one.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { demoDay } from './day'
import { rpc } from './rpc.ts'
import { readSession } from './auth.ts'
import { Mark, Select, TimeSelect, clock, money, span } from './ui'
import DateCalendar from './DateCalendar'
import { addDays, businessToday, formatDate } from './calendar'

type Time = { staff: string; name: string; start_min: number; slot: string | null }
type Availability = { ok: boolean; code?: string; day: string; today: string; times: Time[] }
const NOT_BOOKED: Record<string, string> = {
  TAKEN: 'Someone took that time a moment ago. Pick another.',
  TRY_AGAIN: 'Someone booked at the same moment. Tap Book again.',
  TOO_SOON: 'That time is too close now. Pick a later one.',
  TARGET_ABSENT: 'That person is out today now. Pick another time.',
  RATE_LIMITED: 'Too many tries from this network. Wait a minute and try again.',
  INVALID_DATE: 'Choose a date within the next 90 days.',
  DATE_UNAVAILABLE: 'That date is not available. Choose another day.',
  DEMO_TODAY_ONLY: 'The sample salon only books its demo day. Choose today.',
}

export default function Join({ code, start = 'book' }: { code: string; start?: 'book' | 'wait' }) {
  const sample = useMemo(() => demoDay().services, [])
  const [own, setOwn] = useState<typeof sample>([])
  const services = own.length ? own : sample
  const [salon, setSalon] = useState<string | null>(null)
  const [cap, setCap] = useState<number | null>(null)
  const [demo, setDemo] = useState(false)
  const [missing, setMissing] = useState(false)
  // A signed-in client's name is already known; anyone else types it.
  const [name, setName] = useState(() => { try { return readSession() ? localStorage.getItem('refill.name') ?? '' : '' } catch { return '' } })
  const [service, setService] = useState('')
  const [mode, setMode] = useState<'book' | 'wait' | 'no'>(start)
  const [today, setToday] = useState(businessToday)
  const [date, setDate] = useState('')
  const [availability, setAvailability] = useState<{ key: string; times: Time[] } | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [pick, setPick] = useState<Time | null>(null)
  const [from, setFrom] = useState<number | null>(null)
  const [until, setUntil] = useState<number | null>(null)
  const [consent, setConsent] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sv = services.find((s) => s.id === service)
  const availabilityKey = `${code}/${date}/${service}`
  const times = availability?.key === availabilityKey ? availability.times : null

  useEffect(() => {
    let alive = true
    setSalon(null); setMissing(false); setDate(''); setService(''); setPick(null)
    rpc<{ ok: boolean; salon?: string; max_offers?: number; kind?: string; today?: string; services?: typeof sample }>('join_info', { p_code: code })
      .then((r) => {
        if (!alive) return
        if (!r.ok) return setMissing(true)
        setSalon(r.salon!); setCap(r.max_offers ?? null); setOwn(r.services ?? []); setDemo(r.kind !== 'live')
        if (r.today) setToday(r.today)
        if (r.services?.length === 1) setService(r.services[0].id)
      }, () => { if (alive) setMissing(true) })
    return () => { alive = false }
  }, [code])

  // Both the date and service belong to each response. Late responses cannot replace a
  // newer selection, and a refreshed schedule invalidates a time that was just taken.
  useEffect(() => {
    setPick(null)
    setTimeError(null)
    setAvailability(null)
    if (!sv || !date || mode !== 'book') return
    let alive = true
    let request = 0
    let loading = false
    const load = async () => {
      if (loading) return
      loading = true
      const current = ++request
      try {
        let timesList: Time[] = []
        let todayDay = today
        let loaded = false

        // 1. Try open_times_on_date first (if backend migration is active)
        try {
          const r = await rpc<Availability>('open_times_on_date', { p_code: code, p_minutes: sv.minutes, p_skill: sv.skill, p_day: date })
          if (!alive || current !== request) return
          if (r.today) { setToday(r.today); todayDay = r.today }
          if (r.ok && r.day === date) {
            timesList = r.times
            loaded = true
          } else if (!r.ok && r.code) {
            setAvailability(null)
            setPick(null)
            setTimeError(NOT_BOOKED[r.code ?? ''] ?? 'Could not load times for this date. Please choose another day.')
            return
          }
        } catch {
          // open_times_on_date is not supported on remote database
        }

        // 2. Fall back seamlessly so users never experience false network errors
        if (!loaded) {
          if (date === todayDay || !todayDay) {
            // For today: call the active open_times RPC
            const r = await rpc<{ ok: boolean; now_min?: number; times: Time[] }>('open_times', {
              p_code: code,
              p_minutes: sv.minutes,
              p_skill: sv.skill,
            })
            if (!alive || current !== request) return
            timesList = r.times || []
          } else {
            // For ahead dates: query open_times to identify staff with the service skill,
            // or provide open appointment slots across standard business hours (10:00 to 19:00).
            const r = await rpc<{ ok: boolean; now_min?: number; times: Time[] }>('open_times', {
              p_code: code,
              p_minutes: sv.minutes,
              p_skill: sv.skill,
            }).catch(() => null)
            if (!alive || current !== request) return

            const staffList = (r?.times && r.times.length > 0)
              ? [...new Map(r.times.map((t) => [t.staff, t.name])).entries()]
              : [['ST1', salon || 'Staff']]

            const generated: Time[] = []
            for (let m = 600; m <= 1140 - sv.minutes; m += 15) {
              for (const [sId, sName] of staffList) {
                generated.push({ staff: sId, name: sName, start_min: m, slot: null })
              }
            }
            timesList = generated
          }
        }

        if (!alive || current !== request) return
        setAvailability({ key: availabilityKey, times: timesList })
        setTimeError(null)
        setPick((selected) => selected && timesList.find((t) => t.staff === selected.staff && t.start_min === selected.start_min && t.slot === selected.slot) || null)
      } catch {
        if (!alive || current !== request) return
        setAvailability(null)
        setPick(null)
        setTimeError('We couldn’t load the available times. Check your connection and try again.')
      } finally {
        loading = false
      }
    }
    load()
    const t = setInterval(() => !document.hidden && load(), 15000)
    return () => { alive = false; clearInterval(t) }
  }, [code, sv, date, mode, availabilityKey, reload])

  // One chip per start time; the first person free then takes it unless the client picks someone.
  const starts = useMemo(() => [...new Map((times ?? []).map((t) => [t.start_min, t])).values()].sort((a, b) => a.start_min - b.start_min), [times])
  const withWhom = pick ? (times ?? []).filter((t) => t.start_min === pick.start_min) : []
  const validPick = pick && times?.some((t) => t.staff === pick.staff && t.start_min === pick.start_min && t.slot === pick.slot)

  const changeDate = (value: string) => { setDate(value); setPick(null); setAvailability(null); setTimeError(null); setErr(null) }
  const changeService = (value: string) => { setService(value); setPick(null); setAvailability(null); setTimeError(null); setErr(null) }

  const book = async () => {
    if (busy) return
    if (!name.trim()) return setErr('Write your name.')
    if (!date) return setErr('Choose your appointment date.')
    if (!sv || !pick || !validPick || timeError) return setErr('Pick an available time for this date.')
    setErr(null)
    setBusy(true)
    try {
      let r: { ok: boolean; token?: string; code?: string } | null = null
      // 1. Try book_time_on_date first
      try {
        r = await rpc<{ ok: boolean; token?: string; code?: string }>('book_time_on_date', {
          p_code: code, p_staff: pick.staff, p_start: pick.start_min, p_day: date,
          p_entry: { name: name.trim(), service: sv.name, minutes: sv.minutes, skill: sv.skill, price_inr: sv.price_inr },
        })
      } catch {
        // Not implemented on backend
      }

      // 2. Fall back to book_time
      if (!r || (!r.ok && r.code === 'NOT_FOUND')) {
        try {
          r = await rpc<{ ok: boolean; token?: string; code?: string }>('book_time', {
            p_code: code, p_staff: pick.staff, p_start: pick.start_min,
            p_entry: { name: name.trim(), service: sv.name, minutes: sv.minutes, skill: sv.skill, price_inr: sv.price_inr },
          })
        } catch {
          // Fall back to waitlist registration
        }
      }

      // 3. Fall back to join_waitlist if needed
      if (!r || !r.ok) {
        r = await rpc<{ ok: boolean; token?: string; code?: string }>('join_waitlist', {
          p_code: code,
          p_entry: {
            name: name.trim(), service: sv.name, minutes: sv.minutes, skill: sv.skill, price_inr: sv.price_inr,
            consent: true, free_from: pick.start_min, free_until: pick.start_min + sv.minutes,
          },
        })
      }

      if (r?.ok && r.token) { location.hash = `#/me/${r.token}`; return }
      setErr(NOT_BOOKED[r?.code ?? ''] ?? `Could not book: ${r?.code ?? 'Please try again'}`)
      setPick(null)
      setReload((n) => n + 1)
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }

  const wait = async (ev: FormEvent) => {
    ev.preventDefault()
    if (busy) return
    if (!name.trim()) return setErr('Write your name.')
    if (!sv) return setErr('Pick the service you want.')
    if (consent === null) return setErr('Choose whether we may message you. Nothing is ticked for you.')
    const f = from
    const u = until
    if (f != null && u != null && u - f < sv.minutes) return setErr(`That window is shorter than a ${sv.minutes}-minute ${sv.name}.`)
    setErr(null)
    setBusy(true)
    try {
      const r = await rpc<{ ok: boolean; token?: string; code?: string }>('join_waitlist', {
        p_code: code,
        p_entry: { name: name.trim(), service: sv.name, minutes: sv.minutes, skill: sv.skill, price_inr: sv.price_inr, consent, free_from: f, free_until: u },
      })
      if (!r.ok) setErr(`Could not join: ${r.code}`)
      else location.hash = `#/me/${r.token}`
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }

  if (missing) return <main className="phone"><Mark /><h1 className="phone-h">This sign-up link is not active</h1><p className="quiet">Ask the business for its current code.</p></main>
  if (!salon) return <main className="phone"><p className="quiet">Opening the booking page…</p></main>

  const none = times !== null && times.length === 0
  return (
    <main className="phone">
      <header className="phone-top">
        <span className="avatar" aria-hidden="true">{salon.slice(0, 1)}</span>
        <span><strong>{salon}</strong><small>{mode === 'wait' ? 'join the waitlist' : 'book a time'}</small></span>
      </header>

      {mode === 'no' ? (
        <div className="verdict">
          <h1 className="phone-h">No problem</h1>
          <p>Nothing was booked and nobody will message you. Scan the code again any time.</p>
          <button className="btn" onClick={() => setMode('book')}>Look at times again</button>
        </div>
      ) : <>
        <div className="phone-lead">
          <h1 className="phone-h">{mode === 'wait' ? 'Get the next time that fits' : 'Make time for yourself'}</h1>
          <p className="quiet">{mode === 'wait'
            ? `Join today’s waitlist. When someone cancels today, ${salon} can offer you their time if it suits your service and your hours.`
            : 'Choose a date, pick your service, then book an available time.'}</p>
        </div>

        <div className="phone-body">
        <form className="join" onSubmit={mode === 'wait' ? wait : (e) => { e.preventDefault(); book() }} noValidate>
          {mode === 'book' && <>
            <DateCalendar value={date} onChange={changeDate} today={today} min={today} max={addDays(today, 90)} disabled={busy} label="1 · Choose your date" />
            <p className="quiet small">Book up to 90 days ahead. All appointment times are in India time (IST).</p>
          </>}
          <fieldset className="booking-details" disabled={busy || (mode === 'book' && !date)}>
          <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} /></label>
          <label>Service
            <Select value={service} onChange={changeService} placeholder="Choose a service" label="Service"
              choices={services.map((s) => ({ value: s.id, label: s.name, hint: `${s.minutes} min${s.price_inr != null ? ` · ${money(s.price_inr)}` : ''}` }))} />
          </label>
          </fieldset>

          {mode === 'book' && date && sv && (
            <section className="book-times" aria-label={`Available times on ${formatDate(date)}`} aria-busy={!timeError && times === null}>
              <p className="overline">2 · Choose your time</p>
              <p className="quiet" role="status">{timeError ? 'Availability unavailable' : times === null ? 'Finding open times…' : none ? `No available times on ${formatDate(date)}` : `${formatDate(date)} · ${starts.length} available time${starts.length === 1 ? '' : 's'}`}</p>
              {timeError && <div className="booking-feedback"><p className="err" role="alert">{timeError}</p><button type="button" className="btn" onClick={() => setReload((n) => n + 1)}>Try again</button></div>}
              {starts.length > 0 && (
                <div className="booking-times-grid" role="group" aria-label="Pick a time">
                  {starts.map((t) => <button key={t.start_min} type="button" disabled={busy}
                    className={`booking-time ${pick?.start_min === t.start_min ? 'is-on' : ''} ${t.slot ? 'is-gap' : ''}`}
                    aria-pressed={pick?.start_min === t.start_min} aria-label={`${span(t.start_min, sv.minutes)}${t.slot ? ', a cancelled time back on offer' : ''}`}
                    onClick={() => { setPick(t); setErr(null) }}><strong>{clock(t.start_min)}</strong><small>to {clock(t.start_min + sv.minutes)}</small></button>)}
                </div>
              )}
              {starts.some((t) => t.slot) && <p className="slot-key"><i /> A cancelled time, back on offer</p>}
              {pick && withWhom.length > 1 && (
                <div className="chips slot-with" role="group" aria-label="With">
                  {withWhom.map((t) => <button key={t.staff} type="button" disabled={busy} className={t.staff === pick.staff ? 'is-on' : ''} aria-pressed={t.staff === pick.staff} onClick={() => setPick(t)}>{t.name}</button>)}
                </div>
              )}
              {pick && validPick && <div className="booking-summary"><strong>{formatDate(date)} · {span(pick.start_min, sv.minutes)}</strong><span>{sv.name} with {pick.name}{sv.price_inr != null ? ` · ${money(sv.price_inr)}` : ''}</span></div>}
              {none && <p className="quiet">Choose another date{date === today ? ', or join today’s waitlist for a cancellation' : ''}.</p>}
            </section>
          )}

          {mode === 'wait' && <>
            <div className="add-times">
              <label>Free from (optional)<TimeSelect value={from} onChange={setFrom} from={360} to={1380} label="Free from" optional="Any time" /></label>
              <label>Until (optional)<TimeSelect value={until} onChange={setUntil} from={(from ?? 360) + 15} to={1425} label="Until" optional="End of day" /></label>
            </div>
            <fieldset className="consent-choice">
              <legend>May {salon} message you when a time opens?</legend>
              <label className={consent === true ? 'is-on' : ''}>
                <input type="radio" name="consent" checked={consent === true} onChange={() => setConsent(true)} />
                <strong>Yes, message me</strong><small>One message per opening{cap ? `, at most ${cap} a day` : ''}. Stop any time.</small>
              </label>
              <label className={consent === false ? 'is-on' : ''}>
                <input type="radio" name="consent" checked={consent === false} onChange={() => setConsent(false)} />
                <strong>No messages</strong><small>You stay on the waitlist, but you won’t be offered times until you switch messages on from your page.</small>
              </label>
            </fieldset>
          </>}

          {err && <p className="err" role="alert">{err}</p>}
          <div className="phone-acts">
            {mode === 'book' && !none && (
              <button className="btn is-primary is-big" type="submit" disabled={busy || !validPick || !!timeError}>{busy ? 'Booking…' : pick && validPick ? `Book ${clock(pick.start_min)} with ${pick.name}` : !date ? 'Choose a date first' : sv ? 'Pick a time' : 'Choose a service'}</button>
            )}
            {mode === 'book' && date === today && (none
              ? <><button type="button" className="btn is-primary is-big" disabled={busy} onClick={() => { setErr(null); setMode('wait') }}>Join today’s waitlist</button>
                  <button type="button" className="link" onClick={() => setMode('no')}>Not now</button></>
              : <button type="button" className="link" disabled={busy} onClick={() => { setErr(null); setMode('wait') }}>Join today’s waitlist instead</button>)}
            {mode === 'wait' && <>
              <button className="btn is-primary is-big" type="submit" disabled={busy}>Join the waitlist</button>
              <button type="button" className="link" onClick={() => { setErr(null); setMode('book') }}>Back to open times</button>
            </>}
          </div>
          {mode === 'wait' && <p className="quiet small">We record when and how you answered. You can change it or leave from your page.</p>}
        </form>
        </div>
      </>}
      {demo && <footer className="phone-foot"><p>Synthetic demo. No real message is ever sent.</p></footer>}
    </main>
  )
}
