// The whole film is timed by the voice. Each scene lists its lines; a line starts after the
// scene's lead-in plus every earlier line and pause. Scenes overlap by OVERLAP seconds so one
// can dissolve into the next.
import { FPS } from './theme'

type Word = { w: string; s: number; e: number }
type Vo = { text: string; duration: number; words: Word[] }
import vo from './data/vo.json'
export const VO = vo as Record<string, Vo>

import defs from './data/scenes.json' // shared with tools/music.py

type Def = { id: string; pre: number; lines: string[]; gaps?: number[]; post: number }
const DEFS: Def[] = defs.scenes
export const OVERLAP = defs.overlap

export type Scene = {
  id: string
  from: number // seconds, global
  dur: number // seconds
  cue: Record<string, number> // line id -> seconds from scene start
}

export const SCENES: Scene[] = []
let t = 0
for (const d of DEFS) {
  const cue: Record<string, number> = {}
  let at = d.pre
  d.lines.forEach((id, i) => {
    cue[id] = at
    at += VO[id].duration + (d.gaps?.[i] ?? 0)
  })
  const dur = at + d.post
  SCENES.push({ id: d.id, from: t, dur, cue })
  t += dur - OVERLAP
}
export const TOTAL = t + OVERLAP
export const sceneOf = (id: string) => SCENES.find((s) => s.id === id)!

// Seconds (scene-relative) when word n of a line starts. A string finds the first word that
// begins with it (case-insensitive), searching from word `from`.
export function at(sc: Scene, line: string, word: number | string = 0, from = 0): number {
  const ws = VO[line].words
  const i = typeof word === 'number' ? word : ws.findIndex((w, j) => j >= from && w.w.toLowerCase().replace(/[^a-z0-9']/g, '').startsWith(word.toLowerCase()))
  if (i < 0) throw new Error(`word "${word}" not in line ${line}`)
  return sc.cue[line] + ws[i].s
}
export const end = (sc: Scene, line: string) => sc.cue[line] + VO[line].duration
export const frames = (s: number) => Math.round(s * FPS)
