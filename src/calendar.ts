/** The business runs on India time; calendar dates never use the viewer's timezone. */
export function businessToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

const dateOf = (day: string) => new Date(`${day}T12:00:00Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)

export function addDays(day: string, days: number): string {
  const date = dateOf(day)
  date.setUTCDate(date.getUTCDate() + days)
  return iso(date)
}

export function shiftMonth(day: string, months: number): string {
  const date = dateOf(day)
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  return iso(date)
}

export function formatDate(day: string): string {
  return dateOf(day).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Monday-first, padded to complete weeks without duplicating adjacent-month dates. */
export function monthDays(month: string): (string | null)[] {
  const first = shiftMonth(month, 0)
  const next = shiftMonth(month, 1)
  const days = Math.round((dateOf(next).getTime() - dateOf(first).getTime()) / 86400000)
  const offset = (dateOf(first).getUTCDay() + 6) % 7
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) =>
    i < offset || i >= offset + days ? null : addDays(first, i - offset))
}
