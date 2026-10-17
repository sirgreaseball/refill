import { matchAll, race, toMin, validate, type Input, type InputError, type MatchResult, type RaceResult, type Scenario } from './engine'

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
