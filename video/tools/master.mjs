// Masters the rendered film's audio to -14 LUFS / -1.5 dBTP (two-pass loudnorm); video is copied.
// Usage: node tools/master.mjs out/refill-review.mp4 out/Refill.mp4
import { spawnSync } from 'node:child_process'

const [src, dst] = process.argv.slice(2)
const ff = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
  if (r.status !== 0) throw new Error(r.stderr.slice(-800))
  return r.stderr
}
const log = ff(['-i', src, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'])
const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1))
console.log('measured', m.input_i, 'LUFS', m.input_tp, 'dBTP')
const ln = `loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
ff(['-y', '-i', src, '-c:v', 'copy', '-af', `${ln},aresample=48000`, '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', dst])
console.log('mastered', dst)
