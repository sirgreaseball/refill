import { describe, expect, it } from 'vitest'
import core from '../tests/core-scenarios.json'
import { type Scenario } from './engine'
import { evaluate, importJson, presetDocument } from './labLogic'

const slot = { id: 'S1', start: '14:30', minutes: 60, skill: 'hair', status: 'free' }
const entry = { id: 'W1', minutes: 60, skill: 'hair', consent: true }
const run = (doc: unknown) => evaluate(JSON.stringify(doc))

describe('Lab invalid input (#16)', () => {
  it('keeps the invalid clock reproduction in the result panel', () => {
    expect(evaluate('{"slots":[],"waitlist":[],"now":"99:99"}')).toMatchObject({ kind: 'invalid', error: 'INVALID_VALUE', at: 'now' })
  })

  it.each(['24:00', '12:60', '', 900, null, {}, []])('rejects an invalid clock %j', (now) => {
    expect(run({ slots: [], waitlist: [], now })).toMatchObject({ kind: 'invalid', error: 'INVALID_VALUE', at: 'now' })
  })

  it('rejects string race requests instead of treating the string as an iterable', () => {
    expect(evaluate('{"slots":[{"id":"S1","start":"14:30","minutes":60,"skill":"hair","status":"free"}],"waitlist":[],"race":{"slot":"S1","requests":"W1"}}'))
      .toMatchObject({ kind: 'invalid', error: 'INVALID_VALUE', at: 'race.requests' })
  })

  it.each([null, false, [], 'S1'])('rejects a non-object race %j', (race) => {
    expect(run({ slots: [slot], waitlist: [], race })).toMatchObject({ kind: 'invalid', at: 'race' })
  })

  it('validates race ids and request elements before rendering', () => {
    expect(run({ slots: [slot], waitlist: [], race: { slot: 'missing', requests: [] } })).toMatchObject({ kind: 'invalid', at: 'race.slot' })
    expect(run({ slots: [slot], waitlist: [], race: { slot: 'S1', requests: [null] } })).toMatchObject({ kind: 'invalid', at: 'race.requests[0]' })
    expect(run({ slots: [slot], waitlist: [], race: { slot: 'S1' } })).toMatchObject({ kind: 'invalid', at: 'race.requests' })
  })

  it('preserves unknown-request and duplicate-tap semantics', () => {
    expect(run({ slots: [slot], waitlist: [entry], race: { slot: 'S1', requests: ['missing', 'W1', 'W1'] } }))
      .toMatchObject({ kind: 'ok', raced: { confirmed: 'W1', waitlisted: [], rejected: { missing: 'UNKNOWN_ID' } } })
  })

  it('handles parse errors, primitive roots and malformed optional fields without throwing', () => {
    expect(evaluate('{')).toMatchObject({ kind: 'parse' })
    for (const root of [null, false, 42, 'text', [], {}, { slots: [null], waitlist: [] }])
      expect(run(root).kind).toBe('invalid')
    expect(run({ slots: [{ ...slot, staff: { toString: null } }], waitlist: [], staff: [] })).toMatchObject({ kind: 'invalid', at: 'slots[0].staff' })
    expect(run({ slots: [], waitlist: [], staff: [{ id: 'ST1', name: { toString: null }, skills: ['hair'], present: true }] }))
      .toMatchObject({ kind: 'invalid', at: 'staff[0].name' })
  })

  it('accepts midnight and applies valid clock constraints', () => {
    expect(run({ slots: [slot], waitlist: [entry], now: '00:00' })).toMatchObject({ kind: 'ok', now: 0, result: { matches: [['W1', 'S1']] } })
    expect(run({ slots: [slot], waitlist: [entry], now: '14:25' })).toMatchObject({ kind: 'ok', result: { matches: [], perSlot: { S1: { tooSoon: true } } } })
  })
})

describe('Lab context preservation (#15)', () => {
  const scenario = (id: string) => (core as Scenario[]).find((item) => item.id === id)!

  it('keeps a stylist’s additional skills in C19', () => {
    expect(run(presetDocument(scenario('C19')))).toMatchObject({ kind: 'ok', result: { matches: [['W1', 'S1']] } })
  })

  it('keeps absent staff out of matching and races in C20/C22', () => {
    expect(run(presetDocument(scenario('C20')))).toMatchObject({ kind: 'ok', result: { matches: [], perSlot: { S1: { staffAbsent: true } } } })
    expect(run(presetDocument(scenario('C22')))).toMatchObject({ kind: 'ok', raced: { confirmed: null, waitlisted: ['W1', 'W2'], rejected: {} } })
  })

  it('keeps the staff list so C23 rejects an unknown stylist', () => {
    expect(run(presetDocument(scenario('C23')))).toMatchObject({ kind: 'invalid', error: 'INVALID_VALUE' })
  })

  it('preserves both absent staff and the clock in the reported imported document', () => {
    const doc = {
      slots: [{ ...slot, staff: 'ST1' }], waitlist: [entry],
      staff: [{ id: 'ST1', name: 'Synthetic Stylist', skills: ['hair', 'skin'], present: false }], now: '14:25',
    }
    const imported = importJson(JSON.stringify(doc))
    expect(imported).toEqual(doc)
    expect(run(imported)).toMatchObject({ kind: 'ok', now: 865, input: { staff: doc.staff }, result: { matches: [], perSlot: { S1: { tooSoon: true } } } })
  })

  it('preserves nested context for fixtures and scenario arrays without altering the source', () => {
    const source = { ...scenario('C22'), now: '13:00', metadata: { note: 'Synthetic context' } }
    const original = structuredClone(source)
    const doc = presetDocument(source)
    expect(doc).toMatchObject({ staff: source.staff, now: '13:00', race: source.race, metadata: source.metadata })
    expect(doc).not.toHaveProperty('expect')
    expect(importJson(JSON.stringify({ records: doc }))).toEqual(doc)
    expect(importJson(JSON.stringify([doc]))).toEqual(doc)
    expect(source).toEqual(original)
  })
})
