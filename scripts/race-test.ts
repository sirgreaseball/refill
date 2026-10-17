// Race test against the real database: N customers tap Accept on the same slot
// at the same moment. Run: npm run race            (8 customers, 3 runs)
//                          npm run race -- 20 5     (20 customers, 5 runs)
// Pass = exactly one booking per run, everyone else keeps their waitlist place,
// a repeated tap returns the same booking, and a customer who replied STOP
// after the offer cannot book. The Lab's "Run live race" button runs the same code.
import { liveRace } from '../src/liveRace.ts'

const N = Number(process.argv[2] ?? 8)
const RUNS = Number(process.argv[3] ?? 3)

let allOk = true
for (let i = 1; i <= RUNS; i++) {
  const r = await liveRace(N)
  console.log(`\nrun ${i}: ${r.taps} taps resolved in ${r.ms} ms`)
  for (const [label, ok] of r.checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`)
  allOk = r.ok && allOk
}
console.log(allOk ? `\nAll ${RUNS} runs passed.` : '\nAt least one run FAILED.')
process.exit(allOk ? 0 : 1)
