// Writes out/youtube/refill.en.srt from the narration's word timings, timed to the film.
import fs from 'node:fs'
const defs = JSON.parse(fs.readFileSync('src/data/scenes.json', 'utf8'))
const vo = JSON.parse(fs.readFileSync('src/data/vo.json', 'utf8'))
const SPOKEN = [[/\bC twenty-nine\b/, 'C29']] // how a line is said vs how it reads
let t = 0
const blocks = []
for (const d of defs.scenes) {
  let at = d.pre
  d.lines.forEach((id, i) => {
    let cur = []
    const flush = () => {
      if (!cur.length) return
      blocks.push({ a: t + at + cur[0].s, b: t + at + cur.at(-1).e + 0.15, text: SPOKEN.reduce((s, [re, r]) => s.replace(re, r), cur.map((w) => w.w).join(' ')) })
      cur = []
    }
    for (const w of vo[id].words) {
      if (cur.map((x) => x.w).join(' ').length + w.w.length + 1 > 42) flush()
      cur.push(w)
      if (/[.?!]$/.test(w.w) && cur.length > 3) flush()
    }
    flush()
    at += vo[id].duration + (d.gaps?.[i] ?? 0)
  })
  t += at + d.post - defs.overlap
}
const ts = (s) => {
  const ms = Math.round(s * 1000)
  return [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60].map((x) => String(x).padStart(2, '0')).join(':') + ',' + String(ms % 1000).padStart(3, '0')
}
blocks.forEach((c, i) => { if (blocks[i + 1]) c.b = Math.min(c.b, blocks[i + 1].a - 0.02) })
fs.mkdirSync('out/youtube', { recursive: true })
fs.writeFileSync('out/youtube/refill.en.srt', blocks.map((c, i) => `${i + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${c.text}\n`).join('\n'))
console.log(blocks.length, 'captions')
