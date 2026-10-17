import { explain, matchAll, race, staffOf, toMin, validate, type Entry, type Input, type InputError, type MatchResult, type RaceResult, type Reason, type Scenario, type Slot } from './engine'

export interface LabDocument extends Record<string, unknown> {
  slots: unknown
  waitlist: unknown
  now?: string
  race?: { slot: string; requests: string[] }
}

export type LabEvaluation =
  | { kind: 'parse'; message: string }
  | { kind: 'invalid'; error: InputError; at: string; message: string }
  | { kind: 'ok'; input: Input; result: MatchResult; raced: RaceResult | null; now?: number; doc: LabDocument }

export type LabSuccess = Extract<LabEvaluation, { kind: 'ok' }>

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''
const invalid = (at: string, message: string): LabEvaluation => ({ kind: 'invalid', error: 'INVALID_VALUE', at, message })

/** Strip scenario assertions, not input fields: staff and future engine context must survive. */
export function presetDocument(scenario: Scenario): LabDocument {
  const doc: Record<string, unknown> = { ...structuredClone(scenario) }
  delete doc.id
  delete doc.title
  delete doc.expect
  return doc as LabDocument
}

/** Import the full input, leaving invalid shapes intact for the editor's validation panel. */
export function importJson(text: string): unknown {
  const parsed: unknown = JSON.parse(text)
  const selected = Array.isArray(parsed) ? parsed[0] ?? null : parsed
  return isObject(selected) && Object.hasOwn(selected, 'records') ? selected.records : selected
}

/** Untrusted editor input must always produce a result, including fields outside engine validation. */
export function evaluate(text: string): LabEvaluation {
  let raw: unknown
  try { raw = JSON.parse(text) } catch (error) { return { kind: 'parse', message: (error as Error).message } }
  try {
    const root = isObject(raw) && isObject(raw.records) ? raw.records : raw
    if (isObject(root)) {
      if ('now' in root && (typeof root.now !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(root.now)))
        return invalid('now', 'now must be a 24h time like "14:30".')
      if ('race' in root) {
        if (!isObject(root.race)) return invalid('race', 'race must be an object with slot and requests.')
        if (!isText(root.race.slot)) return invalid('race.slot', 'race.slot must name a slot.')
        if (!Array.isArray(root.race.requests)) return invalid('race.requests', 'race.requests must be a list of waitlist ids.')
        const badRequest = root.race.requests.findIndex((id) => !isText(id))
        if (badRequest !== -1) return invalid(`race.requests[${badRequest}]`, 'Each request must be a non-empty waitlist id.')
      }
      // These optional engine fields also appear in explanations; reject objects before interpolation.
      if (Array.isArray(root.slots)) {
        for (const [i, slot] of root.slots.entries())
          if (isObject(slot) && slot.staff != null && !isText(slot.staff))
            return invalid(`slots[${i}].staff`, 'staff must be a staff id or null.')
      }
      if (Array.isArray(root.staff)) {
        for (const [i, person] of root.staff.entries())
          if (isObject(person) && person.name !== undefined && typeof person.name !== 'string')
            return invalid(`staff[${i}].name`, 'name must be text.')
      }
    }
    const checked = validate(root)
    if (!checked.ok) return { kind: 'invalid', error: checked.error, at: checked.at, message: checked.message }
    const doc = root as LabDocument
    if (doc.race && !checked.input.slots.some((slot) => slot.id === doc.race!.slot))
      return invalid('race.slot', `Unknown slot "${doc.race.slot}".`)
    const now = doc.now === undefined ? undefined : toMin(doc.now)
    return {
      kind: 'ok', input: checked.input, doc, now,
      result: matchAll(checked.input, { now }),
      raced: doc.race ? race(checked.input, doc.race.slot, doc.race.requests) : null,
    }
  } catch (error) {
    return invalid('$', error instanceof Error ? error.message : 'This input could not be evaluated.')
  }
}

type SlotState = 'OFFERABLE' | 'BLOCKED' | 'BOOKED' | 'TOO_SOON' | 'STAFF_ABSENT'
interface Explanation { code: SlotState | Reason | 'MATCHED' | 'WAITING' | 'ALREADY_MATCHED'; message: string }

/** Per-slot existence alone is not eligibility: absent/too-soon rows exist but cannot be offered. */
export function slotExplanation(slot: Slot, result: MatchResult): Explanation {
  if (slot.status === 'blocked') return { code: 'BLOCKED', message: 'Blocked (staff absent): never offered.' }
  if (slot.status === 'booked') return { code: 'BOOKED', message: 'Booked: never offered.' }
  const row = result.perSlot[slot.id]
  if (row.tooSoon) return { code: 'TOO_SOON', message: 'Starts too soon to offer.' }
  if (row.staffAbsent) return { code: 'STAFF_ABSENT', message: 'Staff member is out: never offered.' }
  return { code: 'OFFERABLE', message: 'Open to offers.' }
}

export function candidateExplanation(input: Input, result: MatchResult, slot: Slot, entry: Entry): Explanation {
  const state = slotExplanation(slot, result)
  if (state.code !== 'OFFERABLE') return state
  const row = result.perSlot[slot.id]
  const reason = Object.hasOwn(row.excluded, entry.id) ? row.excluded[entry.id] : undefined
  if (reason) return { code: reason, message: explain(reason, entry, slot, staffOf(slot, input.staff)) }
  if (row.chosen === entry.id) return { code: 'MATCHED', message: 'First in the queue who fits' }
  const currentIndex = input.slots.findIndex((item) => item.id === slot.id)
  const previous = result.matches.find(([id, slotId]) => id === entry.id && input.slots.findIndex((item) => item.id === slotId) < currentIndex)
  if (previous) return { code: 'ALREADY_MATCHED', message: `Already matched to earlier slot ${previous[1]}` }
  return { code: 'WAITING', message: row.chosen ? `Fits; waiting behind ${row.chosen}, who takes this slot` : 'Fits; keeps their waitlist place' }
}

/** Compare candidate outcomes only while the slot can be offered in both snapshots. */
export function compareResults(before: LabSuccess, after: LabSuccess): string[] {
  const changes: string[] = []
  const ids = new Set([...before.input.slots, ...after.input.slots].map((slot) => slot.id))
  for (const id of ids) {
    const a = before.input.slots.find((slot) => slot.id === id)
    const b = after.input.slots.find((slot) => slot.id === id)
    const aState = a ? slotExplanation(a, before.result).code : 'NOT_PRESENT'
    const bState = b ? slotExplanation(b, after.result).code : 'NOT_PRESENT'
    if (aState !== bState) changes.push(`${id}: ${aState} → ${bState}`)
    if (!a || !b || aState !== 'OFFERABLE' || bState !== 'OFFERABLE') continue
    const entries = new Set([...before.input.waitlist, ...after.input.waitlist].map((entry) => entry.id))
    for (const entryId of entries) {
      const aEntry = before.input.waitlist.find((entry) => entry.id === entryId)
      const bEntry = after.input.waitlist.find((entry) => entry.id === entryId)
      const aCode = aEntry ? candidateExplanation(before.input, before.result, a, aEntry).code : 'NOT_PRESENT'
      const bCode = bEntry ? candidateExplanation(after.input, after.result, b, bEntry).code : 'NOT_PRESENT'
      if (aCode !== bCode) changes.push(`${id}/${entryId}: ${aCode} → ${bCode}`)
    }
  }
  return changes
}
