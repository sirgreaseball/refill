// Refill rules engine. Pure functions, no I/O: the same rules the database
// re-checks inside its booking functions (supabase/migrations). The Lab, the
// desk previews and every test run through this file.

export type SlotStatus = 'free' | 'booked' | 'blocked'

export interface Slot {
  id: string
  start: string // "HH:MM", 24h
  minutes: number
  skill: string
  status: SlotStatus
  staff?: string | null
  customer?: string | null
  service?: string | null
  price_inr?: number | null
}

export interface Entry {
  id: string
  minutes: number
  skill: string
  consent: boolean | null // null = unknown, never treated as yes
  name?: string
  service?: string | null
  price_inr?: number | null
  free_from?: string | null
  free_until?: string | null
}

/** v2: who works the slot. A freed slot is that stylist's time, so it fits anything they can do. */
export interface Staff {
  id: string
  name?: string
  skills: string[]
  present: boolean
  /** Working hours in minutes from midnight. The database keeps every move inside them. */
  shift_start?: number
  shift_end?: number
}

export interface Input {
  slots: Slot[]
  waitlist: Entry[]
  staff?: Staff[]
}

/** Why an entry cannot take a slot. Checked in this order; the first failure wins. */
export type Reason = 'NO_CONSENT' | 'SKILL_MISMATCH' | 'DURATION_TOO_LONG' | 'NOT_AVAILABLE'
export const REASON_ORDER: Reason[] = ['NO_CONSENT', 'SKILL_MISMATCH', 'DURATION_TOO_LONG', 'NOT_AVAILABLE']

export type InputError = 'DUPLICATE_ID' | 'MISSING_FIELD' | 'INVALID_VALUE'

export interface Options {
  /** Current time in minutes since midnight. When set, slots starting sooner than `minLead` are not offered. */
  now?: number
  minLead?: number
  /** v2 (the default when staff are given): match on the stylist's skills, skip absent stylists. false = v1 rules. */
  staffAware?: boolean
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

export const toMin = (hhmm: string) => {
  const m = HHMM.exec(hhmm)
  if (!m) throw new Error(`Bad time "${hhmm}"`)
  return Number(m[1]) * 60 + Number(m[2])
}
export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// ---------------------------------------------------------------- validation

export type Validated =
  | { ok: true; input: Input }
  | { ok: false; error: InputError; at: string; message: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const posInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0
const text = (v: unknown) => typeof v === 'string' && v.trim() !== ''

/**
 * Checks untrusted JSON (a pasted file, an import, a scenario) and returns typed input.
 * Accepts the organiser fixture shape ({ records: { slots, waitlist } }) as well.
 * The first problem stops the run, so a bad file never produces a half-right answer.
 */
export function validate(raw: unknown): Validated {
  const root = isObj(raw) && isObj(raw.records) ? raw.records : raw
  const fail = (error: InputError, at: string, message: string): Validated => ({ ok: false, error, at, message })
  if (!isObj(root)) return fail('MISSING_FIELD', '$', 'Expected an object with "slots" and "waitlist".')
  for (const key of ['slots', 'waitlist'] as const) {
    if (root[key] === undefined) return fail('MISSING_FIELD', key, `"${key}" is missing.`)
    if (!Array.isArray(root[key])) return fail('INVALID_VALUE', key, `"${key}" must be a list.`)
  }

  const slots: Slot[] = []
  const seenSlots = new Set<string>()
  for (const [i, s] of (root.slots as unknown[]).entries()) {
    const at = `slots[${i}]`
    if (!isObj(s)) return fail('INVALID_VALUE', at, `${at} must be an object.`)
    for (const k of ['id', 'start', 'minutes', 'skill', 'status'])
      if (s[k] === undefined) return fail('MISSING_FIELD', `${at}.${k}`, `${at} has no "${k}".`)
    if (!text(s.id)) return fail('INVALID_VALUE', `${at}.id`, `${at}.id must be text.`)
    if (seenSlots.has(s.id as string)) return fail('DUPLICATE_ID', `${at}.id`, `Slot id "${s.id}" appears twice.`)
    seenSlots.add(s.id as string)
    if (typeof s.start !== 'string' || !HHMM.test(s.start))
      return fail('INVALID_VALUE', `${at}.start`, `${at}.start must be a 24h time like "10:30".`)
    if (!posInt(s.minutes)) return fail('INVALID_VALUE', `${at}.minutes`, `${at}.minutes must be a positive whole number.`)
    if (!text(s.skill)) return fail('INVALID_VALUE', `${at}.skill`, `${at}.skill must be text.`)
    if (!['free', 'booked', 'blocked'].includes(s.status as string))
      return fail('INVALID_VALUE', `${at}.status`, `${at}.status must be "free", "booked" or "blocked".`)
    slots.push(s as unknown as Slot)
  }

  const waitlist: Entry[] = []
  const seenEntries = new Set<string>()
  for (const [i, e] of (root.waitlist as unknown[]).entries()) {
    const at = `waitlist[${i}]`
    if (!isObj(e)) return fail('INVALID_VALUE', at, `${at} must be an object.`)
    for (const k of ['id', 'minutes', 'skill', 'consent'])
      if (e[k] === undefined) return fail('MISSING_FIELD', `${at}.${k}`, `${at} has no "${k}".`)
    if (!text(e.id)) return fail('INVALID_VALUE', `${at}.id`, `${at}.id must be text.`)
    if (seenEntries.has(e.id as string)) return fail('DUPLICATE_ID', `${at}.id`, `Waitlist id "${e.id}" appears twice.`)
    seenEntries.add(e.id as string)
    if (!posInt(e.minutes)) return fail('INVALID_VALUE', `${at}.minutes`, `${at}.minutes must be a positive whole number.`)
    if (!text(e.skill)) return fail('INVALID_VALUE', `${at}.skill`, `${at}.skill must be text.`)
    if (e.consent !== true && e.consent !== false && e.consent !== null)
      return fail('INVALID_VALUE', `${at}.consent`, `${at}.consent must be true, false or null.`)
    for (const k of ['free_from', 'free_until'])
      if (e[k] != null && (typeof e[k] !== 'string' || !HHMM.test(e[k] as string)))
        return fail('INVALID_VALUE', `${at}.${k}`, `${at}.${k} must be a 24h time or null.`)
    waitlist.push(e as unknown as Entry)
  }

  let staff: Staff[] | undefined
  if (root.staff !== undefined) {
    if (!Array.isArray(root.staff)) return fail('INVALID_VALUE', 'staff', '"staff" must be a list.')
    staff = []
    const seenStaff = new Set<string>()
    for (const [i, p] of (root.staff as unknown[]).entries()) {
      const at = `staff[${i}]`
      if (!isObj(p)) return fail('INVALID_VALUE', at, `${at} must be an object.`)
      for (const k of ['id', 'skills', 'present'])
        if (p[k] === undefined) return fail('MISSING_FIELD', `${at}.${k}`, `${at} has no "${k}".`)
      if (!text(p.id)) return fail('INVALID_VALUE', `${at}.id`, `${at}.id must be text.`)
      if (seenStaff.has(p.id as string)) return fail('DUPLICATE_ID', `${at}.id`, `Staff id "${p.id}" appears twice.`)
      seenStaff.add(p.id as string)
      if (!Array.isArray(p.skills) || !p.skills.every(text)) return fail('INVALID_VALUE', `${at}.skills`, `${at}.skills must be a list of text.`)
      if (typeof p.present !== 'boolean') return fail('INVALID_VALUE', `${at}.present`, `${at}.present must be true or false.`)
      staff.push(p as unknown as Staff)
    }
    for (const s of slots)
      if (s.staff && !seenStaff.has(s.staff))
        return fail('INVALID_VALUE', `slots.${s.id}.staff`, `Slot ${s.id} names staff member "${s.staff}", who is not in staff.`)
  }
  return { ok: true, input: { slots, waitlist, staff } }
}

// ---------------------------------------------------------------- matching

/** First rule this entry breaks for this slot, or null if it fits. With a stylist (v2), skill means what they can do. */
export function reasonFor(entry: Entry, slot: Slot, staff?: Staff | null): Reason | null {
  if (entry.consent !== true) return 'NO_CONSENT'
  if (staff ? !staff.skills.includes(entry.skill) : entry.skill !== slot.skill) return 'SKILL_MISMATCH'
  if (entry.minutes > slot.minutes) return 'DURATION_TOO_LONG'
  const start = toMin(slot.start)
  if (entry.free_from && start < toMin(entry.free_from)) return 'NOT_AVAILABLE'
  if (entry.free_until && start + slot.minutes > toMin(entry.free_until)) return 'NOT_AVAILABLE'
  return null
}

/** A free slot that starts too soon to offer gets this instead of a candidate list. */
export const tooSoon = (slot: Slot, opts: Options = {}) =>
  opts.now !== undefined && toMin(slot.start) < opts.now + (opts.minLead ?? 10)

export interface SlotResult {
  eligible: string[] // waitlist ids that fit, in queue order
  excluded: Record<string, Reason>
  chosen: string | null
  tooSoon?: boolean
  staffAbsent?: boolean
}

/** The stylist who works this slot under v2 rules, or null (v1 rules, or no stylist known). */
export function staffOf(slot: Slot, staff: Staff[] | undefined, opts: Options = {}): Staff | null {
  if (opts.staffAware === false || !staff || !slot.staff) return null
  return staff.find((p) => p.id === slot.staff) ?? null
}

export interface MatchResult {
  matches: [string, string][] // [waitlist id, slot id]
  perSlot: Record<string, SlotResult>
}

/** Candidates for one slot: everyone who fits, in queue order, and everyone skipped with the rule they broke. */
export function candidates(slot: Slot, waitlist: Entry[], staff?: Staff | null) {
  const eligible: Entry[] = []
  const excluded: { entry: Entry; reason: Reason }[] = []
  for (const entry of waitlist) {
    const reason = reasonFor(entry, slot, staff)
    if (reason) excluded.push({ entry, reason })
    else eligible.push(entry)
  }
  return { eligible, excluded }
}

/**
 * Fill every free slot from the waitlist. Slots in listed order; each takes the
 * first eligible entry not already matched; nobody gets two slots.
 */
export function matchAll(input: Input, opts: Options = {}): MatchResult {
  const taken = new Set<string>()
  const result: MatchResult = { matches: [], perSlot: {} }
  for (const slot of input.slots) {
    if (slot.status !== 'free') continue
    if (tooSoon(slot, opts)) {
      result.perSlot[slot.id] = { eligible: [], excluded: {}, chosen: null, tooSoon: true }
      continue
    }
    const who = staffOf(slot, input.staff, opts)
    if (who && !who.present) {
      result.perSlot[slot.id] = { eligible: [], excluded: {}, chosen: null, staffAbsent: true }
      continue
    }
    const { eligible, excluded } = candidates(slot, input.waitlist, who)
    const chosen = eligible.find((e) => !taken.has(e.id))?.id ?? null
    if (chosen) {
      taken.add(chosen)
      result.matches.push([chosen, slot.id])
    }
    result.perSlot[slot.id] = {
      eligible: eligible.map((e) => e.id),
      excluded: Object.fromEntries(excluded.map((x) => [x.entry.id, x.reason])),
      chosen,
    }
  }
  return result
}

// ---------------------------------------------------------------- races

export interface RaceResult {
  confirmed: string | null
  waitlisted: string[]
  rejected: Record<string, Reason | 'UNKNOWN_ID'>
}

/**
 * Several customers accept the same slot; requests arrive in the given order.
 * The first eligible one is confirmed, later eligible ones keep their waitlist
 * place, ineligible ones are rejected. A repeated id is the same request.
 * The database does the same thing with a row lock (accept_offer).
 */
export function race(input: Input, slotId: string, requests: string[]): RaceResult {
  const slot = input.slots.find((s) => s.id === slotId)
  if (!slot) throw new Error(`Unknown slot "${slotId}"`)
  const out: RaceResult = { confirmed: null, waitlisted: [], rejected: {} }
  const who = staffOf(slot, input.staff)
  let open = slot.status === 'free' && who?.present !== false
  for (const id of new Set(requests)) {
    const entry = input.waitlist.find((e) => e.id === id)
    if (!entry) {
      out.rejected[id] = 'UNKNOWN_ID'
      continue
    }
    const reason = reasonFor(entry, slot, who)
    if (reason) out.rejected[id] = reason
    else if (open) {
      out.confirmed = id
      open = false
    } else out.waitlisted.push(id)
  }
  return out
}

// ---------------------------------------------------------------- time policy

export type Notice = 'NORMAL' | 'LATE' | 'PAST'

/** How much notice a cancellation gave. `cutoff` is the late-cancellation window in minutes. */
export function notice(slotStart: number, now: number, cutoff = 120): Notice {
  const lead = slotStart - now
  if (lead < 0) return 'PAST'
  return lead < cutoff ? 'LATE' : 'NORMAL'
}

// ---------------------------------------------------------------- words

/** One plain sentence for the evidence view. */
export function explain(reason: Reason, entry: Entry, slot: Slot, staff?: Staff | null): string {
  switch (reason) {
    case 'NO_CONSENT':
      return entry.consent === null ? 'Has not said yes to messages yet, so is never messaged' : 'Said no to messages'
    case 'SKILL_MISMATCH':
      return staff
        ? `Wants ${entry.skill}; ${staff.name ?? 'this staff member'} does ${staff.skills.join(' and ')}`
        : `Wants ${entry.skill}; this slot was for ${slot.skill}`
    case 'DURATION_TOO_LONG':
      return `Needs ${entry.minutes} min; the gap is ${slot.minutes} min`
    case 'NOT_AVAILABLE':
      return `Only free ${entry.free_from ?? 'any time'}–${entry.free_until ?? 'close'}`
  }
}

/** The short words a business owner reads first; the code stays alongside for the record. */
export const LABEL: Record<string, string> = {
  NO_CONSENT: 'No permission to message',
  SKILL_MISMATCH: 'Different service',
  DURATION_TOO_LONG: 'Needs more time',
  NOT_AVAILABLE: 'Not free then',
  FREQUENCY_CAP: 'Messaged enough today',
  STAFF_ABSENT: 'Staff member is out',
}

// ---------------------------------------------------------------- scenarios

export interface Scenario {
  id: string
  title?: string
  slots: unknown
  waitlist: unknown
  staff?: unknown
  race?: { slot: string; requests: string[] }
  expect: {
    matches?: [string, string][]
    excluded?: Record<string, Record<string, string>>
    error?: InputError
    confirmed?: string | null
    waitlisted?: string[]
    rejected?: Record<string, string>
  }
}

const pairKey = (p: [string, string]) => `${p[0]}>${p[1]}`
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

/** Runs one scenario file entry and lists every way the engine disagrees with it. */
export function runScenario(s: Scenario): { pass: boolean; problems: string[] } {
  const problems: string[] = []
  const v = validate(s.staff === undefined ? { slots: s.slots, waitlist: s.waitlist } : { slots: s.slots, waitlist: s.waitlist, staff: s.staff })
  const ex = s.expect ?? {}
  if (ex.error) {
    if (v.ok) problems.push(`expected input error ${ex.error}, input was accepted`)
    else if (v.error !== ex.error) problems.push(`expected ${ex.error}, got ${v.error} (${v.message})`)
    return { pass: problems.length === 0, problems }
  }
  if (!v.ok) return { pass: false, problems: [`input rejected: ${v.error} at ${v.at} (${v.message})`] }

  if (s.race) {
    const r = race(v.input, s.race.slot, s.race.requests)
    if ('confirmed' in ex && r.confirmed !== ex.confirmed)
      problems.push(`confirmed: expected ${ex.confirmed}, got ${r.confirmed}`)
    if (ex.waitlisted && !sameSet(ex.waitlisted, r.waitlisted))
      problems.push(`waitlisted: expected [${ex.waitlisted}], got [${r.waitlisted}]`)
    if (ex.rejected) {
      const want = Object.entries(ex.rejected).map(([k, val]) => `${k}:${val}`)
      const got = Object.entries(r.rejected).map(([k, val]) => `${k}:${val}`)
      if (!sameSet(want, got)) problems.push(`rejected: expected {${want}}, got {${got}}`)
    }
    return { pass: problems.length === 0, problems }
  }

  const m = matchAll(v.input)
  if (ex.matches) {
    const want = ex.matches.map(pairKey)
    const got = m.matches.map(pairKey)
    if (!sameSet(want, got)) problems.push(`matches: expected [${want}], got [${got}]`)
  }
  for (const [slotId, byEntry] of Object.entries(ex.excluded ?? {}))
    for (const [entryId, reason] of Object.entries(byEntry)) {
      const got = m.perSlot[slotId]?.excluded[entryId]
      if (got !== reason) problems.push(`${slotId}/${entryId}: expected ${reason}, got ${got ?? 'not excluded'}`)
    }
  return { pass: problems.length === 0, problems }
}
