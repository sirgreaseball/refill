import { describe, expect, test } from 'vitest'
import { addDays, businessToday, formatDate, monthDays, shiftMonth } from './calendar'

describe('salon calendar dates', () => {
  test('today changes at midnight in Kolkata, independently of the browser timezone', () => {
    expect(businessToday(new Date('2026-10-18T18:29:59Z'))).toBe('2026-10-18')
    expect(businessToday(new Date('2026-10-18T18:30:00Z'))).toBe('2026-10-19')
    expect(businessToday(new Date('2026-12-31T18:30:00Z'))).toBe('2027-01-01')
  })

  test.each([
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2028-02-29', 1, '2028-03-01'],
    ['2027-02-28', 1, '2027-03-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-10-18', 0, '2026-10-18'],
  ])('moves %s by %i calendar days', (date, count, expected) => {
    expect(addDays(date, count)).toBe(expected)
  })

  test.each([
    ['2026-10-18', 0, '2026-10-01'],
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-03-31', -1, '2026-02-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-01-01', -1, '2025-12-01'],
    ['2026-10-18', 12, '2027-10-01'],
  ])('moves %s by %i months without overflowing a short month', (date, count, expected) => {
    expect(shiftMonth(date, count)).toBe(expected)
  })

  test('formats the selected calendar day without moving it across timezones', () => {
    const label = formatDate('2026-10-18')
    expect(label).toContain('18')
    expect(label).toMatch(/Oct/)
    expect(label).toContain('2026')
  })
})

describe('month grid', () => {
  test.each([
    ['2027-02-01', 28, 0, 28],
    ['2026-10-01', 35, 3, 31],
    ['2026-11-01', 42, 6, 30],
    ['2028-02-01', 35, 1, 29],
  ])('%s has Monday-first complete weeks and every date once', (month, cells, padding, days) => {
    const grid = monthDays(month)
    expect(grid).toHaveLength(cells)
    expect(grid.length % 7).toBe(0)
    expect(grid.slice(0, padding)).toEqual(Array(padding).fill(null))
    expect(grid[padding]).toBe(month)
    expect(grid.filter((date) => date !== null)).toEqual(
      Array.from({ length: days }, (_, index) => `${month.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`),
    )
    expect(grid.slice(padding + days)).toEqual(Array(cells - padding - days).fill(null))
  })

  test('a selected mid-month date renders the whole month', () => {
    expect(monthDays('2026-10-18')).toEqual(monthDays('2026-10-01'))
  })
})
