// Renders the figures for the team documents into out/docfigs: three diagrams and frames from the film.
// Usage: node tools/docfigs.mjs
import fs from 'node:fs'
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const out = 'out/docfigs'
fs.mkdirSync(out, { recursive: true })
const defs = JSON.parse(fs.readFileSync('src/data/scenes.json', 'utf8'))
const vo = JSON.parse(fs.readFileSync('src/data/vo.json', 'utf8'))
let t = 0
const at = {}
for (const d of defs.scenes) {
  let a = d.pre
  d.lines.forEach((id, i) => (a += vo[id].duration + (d.gaps?.[i] ?? 0)))
  at[d.id] = { from: t, dur: a + d.post }
  t += a + d.post - defs.overlap
}
const FRAMES = { pain: 0.9, solution: 0.92, desk_gap: ['desk', 0.32], desk_fit: ['desk', 0.86], client: 0.42, race: 0.86, staff: 0.86, owner: 0.38, rules: ['owner', 0.86], features: 0.92, usp: 0.9, proof: 0.9, business: 0.9, end: 0.6 }

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') })
for (const id of ['DocArch', 'DocFlow', 'DocOffer']) {
  const comp = await selectComposition({ serveUrl, id })
  await renderStill({ serveUrl, composition: comp, output: `${out}/${id}.png`, imageFormat: 'png' })
  process.stdout.write(id + ' ')
}
const film = await selectComposition({ serveUrl, id: 'Refill', inputProps: { music: false } })
for (const [name, v] of Object.entries(FRAMES)) {
  const [scene, f] = Array.isArray(v) ? v : [name, v]
  const sec = at[scene].from + f * at[scene].dur
  await renderStill({ serveUrl, composition: film, frame: Math.round(sec * film.fps), output: `${out}/film-${name}.jpg`, imageFormat: 'jpeg', jpegQuality: 88, inputProps: { music: false } })
  process.stdout.write(name + ' ')
}
console.log('\ndone')
