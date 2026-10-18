// Renders review stills: node tools/stills.mjs <outDir> [scene[@fraction,...] ...]
// With no scenes, takes three moments from every scene. Bundles once, renders many.
import fs from 'node:fs'
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const outDir = process.argv[2] ?? 'out/stills'
const want = process.argv.slice(3)
fs.mkdirSync(outDir, { recursive: true })
const defs = JSON.parse(fs.readFileSync('src/data/scenes.json', 'utf8'))
const vo = JSON.parse(fs.readFileSync('src/data/vo.json', 'utf8'))
let t = 0
const scenes = defs.scenes.map((d) => {
  let at = d.pre
  d.lines.forEach((id, i) => (at += vo[id].duration + (d.gaps?.[i] ?? 0)))
  const s = { id: d.id, from: t, dur: at + d.post }
  t += s.dur - defs.overlap
  return s
})

const shots = []
for (const sc of scenes) {
  const spec = want.find((w) => w.split('@')[0] === sc.id)
  if (want.length && !spec) continue
  const fr = spec?.includes('@') ? spec.split('@')[1].split(',').map(Number) : [0.35, 0.65, 0.92]
  for (const f of fr) shots.push({ name: `${sc.id}-${String(Math.round(f * 100)).padStart(2, '0')}`, sec: sc.from + f * sc.dur })
}

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') })
const comp = await selectComposition({ serveUrl, id: 'Refill', inputProps: { music: false } })
for (const s of shots) {
  await renderStill({ serveUrl, composition: comp, frame: Math.round(s.sec * comp.fps), output: path.join(outDir, s.name + '.jpg'), imageFormat: 'jpeg', jpegQuality: 80, inputProps: { music: false } })
  process.stdout.write(s.name + ' ')
}
console.log('\ndone', shots.length)
