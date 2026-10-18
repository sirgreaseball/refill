// Renders each script line with ElevenLabs (default voice Sarah) into public/vo/<id>.mp3
// plus <id>.json with word timings. Existing lines are skipped: delete a file to re-take it.
// Usage: node tools/vo.mjs [id ...]
import fs from 'node:fs'

const VOICE = 'EXAVITQu4vr4xnSDxMaL' // Sarah, premade (free-tier API allows premade voices only)
const MODEL = 'eleven_multilingual_v2'
const key = fs.readFileSync('.env', 'utf8').match(/^ELEVENLABS_API_KEY=(.*)$/m)?.[1].trim().replace(/^"|"$/g, '')
if (!key) throw new Error('ELEVENLABS_API_KEY missing in .env')

const script = JSON.parse(fs.readFileSync('script.json', 'utf8'))
const only = process.argv.slice(2)
fs.mkdirSync('public/vo', { recursive: true })

// Character alignment -> words with start/end seconds.
function words(al) {
  const out = []
  let cur = null
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) out.push(cur); cur = null; return }
    if (!cur) cur = { w: '', s: al.character_start_times_seconds[i], e: 0 }
    cur.w += ch
    cur.e = al.character_end_times_seconds[i]
  })
  if (cur) out.push(cur)
  return out
}

for (const [i, line] of script.entries()) {
  if (only.length && !only.includes(line.id)) continue
  const mp3 = `public/vo/${line.id}.mp3`
  if (fs.existsSync(mp3) && !only.length) continue
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: line.text,
      model_id: MODEL,
      // Neighbouring lines keep intonation continuous across separately rendered clips.
      previous_text: script[i - 1]?.text,
      next_text: script[i + 1]?.text,
      voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1.0 },
    }),
  })
  if (!res.ok) { console.log(line.id, 'FAILED', res.status, (await res.text()).slice(0, 200)); process.exit(1) }
  const j = await res.json()
  fs.writeFileSync(mp3, Buffer.from(j.audio_base64, 'base64'))
  const w = words(j.alignment)
  fs.writeFileSync(`public/vo/${line.id}.json`, JSON.stringify({ text: line.text, duration: w.at(-1).e, words: w }))
  console.log(line.id, w.at(-1).e.toFixed(2) + 's')
}

// One file of every line's timing for the composition to import.
const all = Object.fromEntries(script.filter((l) => fs.existsSync(`public/vo/${l.id}.json`)).map((l) => [l.id, JSON.parse(fs.readFileSync(`public/vo/${l.id}.json`, 'utf8'))]))
fs.writeFileSync('src/data/vo.json', JSON.stringify(all))
