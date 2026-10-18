// The face's geometry, shared by the dial and the pointer. Same rules as src/Dial.tsx:
// 0 degrees is 12 o'clock, the day runs clockwise over 300 degrees, the gap is at the bottom.
import { HI, LO, staff, waitlist } from './facts'

export const SPAN = 300
/** Degrees clockwise from 12 o'clock for a time of day. */
export const ang = (m: number) => -SPAN / 2 + ((Math.min(Math.max(m, LO), HI) - LO) / (HI - LO)) * SPAN
/** The time of day at an angle, or null in the gap at the bottom. */
export const minuteAt = (a: number) => (a < -SPAN / 2 || a > SPAN / 2 ? null : LO + ((a + SPAN / 2) / SPAN) * (HI - LO))
export const pt = (r: number, a: number) => [r * Math.sin((a * Math.PI) / 180), -r * Math.cos((a * Math.PI) / 180)] as const
export function arc(r: number, a1: number, a2: number) {
  const [x1, y1] = pt(r, a1)
  const [x2, y2] = pt(r, a2)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export const STEP = Math.min(28, 96 / Math.max(1, staff.length - 1))
export const ringR = (i: number) => 172 - i * STEP
export const ringOf = (staffId: string) => ringR(Math.max(0, staff.findIndex((p) => p.id === staffId)))
/** An appointment's arc, inset a hair at each end so neighbours read as separate. */
export const segD = (r: number, start: number, minutes: number) => {
  const a1 = ang(start) + 0.9
  return arc(r, a1, Math.max(a1 + 0.5, ang(start + minutes) - 0.9))
}
/** The middle of an appointment's arc, where offers land. */
export const midOf = (r: number, start: number, minutes: number) => pt(r, ang(start + minutes / 2))

/** The waitlist sits evenly round the face, outside the hours, in queue order. */
export const ORBIT = 238
export const markAngle = (i: number) => -SPAN / 2 + (i / Math.max(1, waitlist.length - 1)) * SPAN
export const markAt = (id: string) => pt(ORBIT, markAngle(waitlist.findIndex((e) => e.id === id)))

/** The ring's name sits in the 60-degree gap at the bottom, read left to right. */
export function gapPath(r: number) {
  const pad = (12 / r) * (180 / Math.PI)
  const [x1, y1] = pt(r, 210 - pad)
  const [x2, y2] = pt(r, 150 + pad)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}
