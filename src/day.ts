// The demo salon day, built from the CSV files in data/salon/ (synthetic).
// Editing those files changes the app; tests check they still load.
import staffCsv from '../data/salon/staff.csv?raw'
import servicesCsv from '../data/salon/services.csv?raw'
import scheduleCsv from '../data/salon/schedule.csv?raw'
import customersCsv from '../data/salon/customers.csv?raw'
import { toMin, type Entry, type Slot } from './engine'

export interface Staff { id: string; name: string; skills: string[]; present: boolean; shift_start: number; shift_end: number }
export interface Service { id: string; name: string; skill: string; minutes: number; price_inr: number }
export interface Day { salon: string; staff: Staff[]; services: Service[]; slots: Slot[]; waitlist: Entry[] }

/** Minimal RFC 4180 reader: quoted fields, commas and quotes inside quotes, CRLF. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  const [head, ...body] = rows
  if (!head) return []
  const keys = head.map((h) => h.trim().replace(/^﻿/, ''))
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

const bool = (v: string) => (v.toLowerCase() === 'true' || v.toLowerCase() === 'yes' ? true : v.toLowerCase() === 'false' || v.toLowerCase() === 'no' ? false : null)
const num = (v: string, what: string) => {
  const n = Number(v)
  if (v === '' || !Number.isFinite(n)) throw new Error(`${what} must be a number, got "${v}"`)
  return n
}

export function buildDay(csv: { staff: string; services: string; schedule: string; customers: string }): Day {
  const staff = parseCsv(csv.staff).map((r) => ({
    id: r.id, name: r.name, skills: r.skills.split('|').map((s) => s.trim()).filter(Boolean), present: bool(r.present) !== false,
    shift_start: r.shift_start ? toMin(r.shift_start) : 600, shift_end: r.shift_end ? toMin(r.shift_end) : 1200,
  }))
  const services = parseCsv(csv.services).map((r) => ({
    id: r.id, name: r.name, skill: r.skill, minutes: num(r.minutes, `service ${r.id} minutes`), price_inr: num(r.price_inr, `service ${r.id} price_inr`),
  }))
  const service = (id: string, where: string) => {
    const s = services.find((x) => x.id === id)
    if (!s) throw new Error(`${where}: unknown service_id "${id}"`)
    return s
  }
  const slots: Slot[] = parseCsv(csv.schedule).map((r) => {
    const s = service(r.service_id, `schedule ${r.id}`)
    return {
      id: r.id, start: r.start, minutes: s.minutes, skill: s.skill, status: r.status as Slot['status'],
      staff: r.staff_id || null, customer: r.customer || null, service: s.name, price_inr: s.price_inr,
    }
  })
  const waitlist: Entry[] = parseCsv(csv.customers).map((r) => {
    const s = service(r.service_id, `customer ${r.id}`)
    return {
      id: r.id, name: r.name, minutes: s.minutes, skill: s.skill, consent: bool(r.consent),
      service: s.name, price_inr: s.price_inr, free_from: r.free_from || null, free_until: r.free_until || null,
    }
  })
  return { salon: 'Kesar Salon, Jubilee Hills', staff, services, slots, waitlist }
}

export const demoDay = () =>
  buildDay({ staff: staffCsv, services: servicesCsv, schedule: scheduleCsv, customers: customersCsv })
