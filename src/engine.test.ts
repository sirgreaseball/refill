import { describe, expect, test } from 'vitest'
import fixture from '../data/fixture/C29.fixture.json'
import core from '../tests/core-scenarios.json'
import team from '../tests/scenarios.json'
import { candidates, matchAll, notice, race, runScenario, toMin, tooSoon, validate, type Scenario } from './engine'
import { buildDay, demoDay, parseCsv } from './day'

const input = (raw: unknown) => {
  const v = validate(raw)
  if (!v.ok) throw new Error(v.message)
  return v.input
}

describe('organiser fixture C29', () => {
  test('expected_match W1 -> S2 is reproduced exactly', () => {
    const result = matchAll(input(fixture))
    expect(result.matches).toEqual([fixture.records.expected_match])
  })
  test('the three public checks', () => {
    const s30 = { id: 'S', start: '10:00', minutes: 30, skill: 'hair', status: 'free' as const }
    // 1. a 60-minute request cannot occupy a 30-minute slot
    expect(matchAll({ slots: [s30], waitlist: [{ id: 'W', minutes: 60, skill: 'hair', consent: true }] }).matches).toEqual([])
    // 2. two requests for one slot: one confirmed, one waitlisted
    const two = { slots: [{ ...s30, minutes: 60 }], waitlist: [
      { id: 'A', minutes: 60, skill: 'hair', consent: true },
      { id: 'B', minutes: 60, skill: 'hair', consent: true },
    ] }
    expect(race(two, 'S', ['A', 'B'])).toEqual({ confirmed: 'A', waitlisted: ['B'], rejected: {} })
    // 3. no consent, no outreach
    const { eligible, excluded } = candidates({ ...s30, minutes: 60 }, [{ id: 'C', minutes: 30, skill: 'hair', consent: false }])
    expect(eligible).toEqual([])
    expect(excluded[0].reason).toBe('NO_CONSENT')
  })
})

describe.each([
  ['core', core as Scenario[]],
  ['team (tests/scenarios.json)', team as Scenario[]],
])('%s scenarios', (_name, list) => {
  test.skipIf(list.length === 0)('file is not empty', () => expect(list.length).toBeGreaterThan(0))
  test.each(list.map((s) => [`${s.id} ${s.title ?? ''}`.trim(), s] as const))('%s', (_label, s) => {
    const { pass, problems } = runScenario(s)
    expect(problems).toEqual([])
    expect(pass).toBe(true)
  })
})

describe('v2: staff-aware matching', () => {
  const day = demoDay()
  const input = { slots: day.slots, waitlist: day.waitlist, staff: day.staff }
  test('a freed slot fits more people when the stylist can do more (v2 >= v1)', () => {
    const slot = { ...day.slots.find((s) => s.id === 'R5')! } // Riya does hair and skin
    const v1 = candidates(slot, day.waitlist).eligible.map((e) => e.id)
    const v2 = candidates(slot, day.waitlist, day.staff.find((p) => p.id === slot.staff)).eligible.map((e) => e.id)
    expect(v2).toEqual(expect.arrayContaining(v1))
    expect(v2.length).toBeGreaterThan(v1.length) // Rhea's 45-min facial now fits Riya's 60-min gap
  })
  test('an absent stylist takes every free slot of theirs off the table', () => {
    const absent = { ...input, staff: day.staff.map((p) => (p.id === 'ST1' ? { ...p, present: false } : p)) }
    const r = matchAll(absent)
    expect(r.perSlot.R5.staffAbsent).toBe(true)
    expect(r.matches.some(([, s]) => s === 'R5')).toBe(false)
  })
  test('v1 rules are still available for the before/after comparison', () => {
    const v1 = matchAll(input, { staffAware: false })
    expect(v1.perSlot.R5.staffAbsent).toBeUndefined()
  })
})

describe('time policy', () => {
  test('a 20-minute notice is a late cancellation', () => expect(notice(toMin('12:00'), toMin('11:40'))).toBe('LATE'))
  test('three hours notice is normal', () => expect(notice(toMin('15:00'), toMin('12:00'))).toBe('NORMAL'))
  test('a slot that already started is past', () => expect(notice(toMin('12:00'), toMin('12:05'))).toBe('PAST'))
  test('a free slot starting in 5 minutes is not offered', () => {
    const slot = { id: 'S', start: '12:00', minutes: 60, skill: 'hair', status: 'free' as const }
    expect(tooSoon(slot, { now: toMin('11:55') })).toBe(true)
    const r = matchAll({ slots: [slot], waitlist: [{ id: 'W', minutes: 30, skill: 'hair', consent: true }] }, { now: toMin('11:55') })
    expect(r.matches).toEqual([])
    expect(r.perSlot.S.tooSoon).toBe(true)
  })
})

describe('demo salon data (data/salon/*.csv)', () => {
  const day = demoDay()
  test('loads and passes the same validation as any import', () => {
    expect(validate({ slots: day.slots, waitlist: day.waitlist }).ok).toBe(true)
  })
  test('every slot belongs to a known stylist', () => {
    const ids = new Set(day.staff.map((s) => s.id))
    for (const slot of day.slots) expect(ids.has(slot.staff ?? '')).toBe(true)
  })
  test('no stylist is double-booked in the base schedule', () => {
    for (const st of day.staff) {
      const mine = day.slots.filter((s) => s.staff === st.id).map((s) => [toMin(s.start), toMin(s.start) + s.minutes])
      mine.sort((a, b) => a[0] - b[0])
      for (let i = 1; i < mine.length; i++) expect(mine[i][0]).toBeGreaterThanOrEqual(mine[i - 1][1])
    }
  })
  test('an unknown service id is a loud error, not a silent gap', () => {
    expect(() => buildDay({ staff: 'id,name,skills,present\n', services: 'id,name,skill,minutes,price_inr\n', schedule: 'id,start,staff_id,service_id,customer,status\nX,10:00,ST1,NOPE,,free\n', customers: 'id,name,service_id,consent,free_from,free_until\n' })).toThrow(/unknown service_id/)
  })
  test('csv reader handles quotes and commas', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([{ a: 'x, y', b: 'say "hi"' }])
  })
})
