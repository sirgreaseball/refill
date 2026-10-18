// Renders the deck art (dark and light) into a folder: node tools/deckart.mjs <outDir>
// Feeds docs/team/source/deck/art. Bundles once, renders every still.
import fs from 'node:fs'
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const outDir = process.argv[2] ?? 'out/deck-art'
fs.mkdirSync(outDir, { recursive: true })
const icon = { dark: { business: '#c6f24e', client: '#ffb547' }, light: { business: '#3f6b00', client: '#b36a00' } }
const jobs = []
for (const light of [false, true]) {
  const sfx = light ? '-light' : ''
  jobs.push(
    ['DeckBg', `DeckBg${sfx}.jpg`, { tone: 'quiet', light }],
    ['DeckBgCover', `DeckBgCover${sfx}.jpg`, { tone: 'cover', light }],
    ['DeckDial', `DeckDial${sfx}.png`, { refilled: false, light }],
    ['DeckMark', `DeckMark${sfx}.png`, { light }],
    ...['business', 'client'].map((kind) => ['DeckIcon', `Icon-${kind}${sfx}.png`, { kind, color: icon[light ? 'light' : 'dark'][kind] }]),
  )
}
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') })
for (const [id, file, inputProps] of jobs) {
  const composition = await selectComposition({ serveUrl, id, inputProps })
  const jpg = file.endsWith('.jpg')
  await renderStill({ serveUrl, composition, output: path.join(outDir, file), inputProps, ...(jpg ? { imageFormat: 'jpeg', jpegQuality: 92 } : { imageFormat: 'png' }) })
  process.stdout.write(file + ' ')
}
console.log('\ndone', jobs.length)
