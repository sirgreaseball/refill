// The Lab: the rules engine with the lid off. Judges can load the organiser
// fixture, change any input, flip an edge case and see the before/after, run
// every scenario file, and fire a real race at the real database.
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import fixture from '../data/fixture/C29.fixture.json'
import core from '../tests/core-scenarios.json'
import team from '../tests/scenarios.json'
import { parseCsv } from './day'
import { candidates, matchAll, notice, race, runScenario, toHHMM, toMin, validate, type Input, type MatchResult, type Scenario } from './engine'
import { liveRace, type RaceReport } from './liveRace.ts'
import { Icon, download, lead } from './ui'
import { candidateExplanation, compareResults, evaluate, exportResult, importJson, presetDocument, slotExplanation, type LabDocument as Doc, type LabEvaluation as Eval, type LabSuccess as Ok } from './labLogic'

const presets: { id: string; label: string; doc: Doc }[] = [
  { id: 'FIX', label: 'Organiser fixture C29', doc: structuredClone(fixture.records) },
  ...(core as Scenario[]).map((s) => ({ id: s.id, label: s.title ?? s.id, doc: presetDocument(s) })),
  ...(team as Scenario[]).map((s) => ({ id: s.id, label: `${s.title ?? s.id} (team)`, doc: presetDocument(s) })),
]

const pretty = (d: unknown) => JSON.stringify(d, null, 2)

export default function Lab() {
  const [text, setText] = useState(() => pretty(presets[0].doc))
  const [preset, setPreset] = useState('FIX')
  const [before, setBefore] = useState<(Ok & { label: string }) | null>(null)
  const [dropping, setDropping] = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ev = useMemo(() => evaluate(text), [text])

  const load = (id: string) => {
    const p = presets.find((x) => x.id === id)
    if (!p) return
    setPreset(id)
    setBefore(null)
    setText(pretty(p.doc))
  }

  const mutate = (label: string, fn: (d: Doc & { slots: Record<string, unknown>[]; waitlist: Record<string, unknown>[] }, r: MatchResult) => boolean) => {
    if (ev.kind !== 'ok') return
    const doc = structuredClone(ev.doc) as Doc & { slots: Record<string, unknown>[]; waitlist: Record<string, unknown>[] }
    if (!fn(doc, ev.result)) return
    setBefore({ ...ev, label })
    setText(pretty(doc))
  }

  const firstMatchEntry = (d: { waitlist: Record<string, unknown>[] }, r: MatchResult) => d.waitlist.find((w) => w.id === r.matches[0]?.[0])
  const toggles: [string, string, (d: Doc & { slots: Record<string, unknown>[]; waitlist: Record<string, unknown>[] }, r: MatchResult) => boolean][] = [
    ['Late cancellation', 'A booked slot opens 20 minutes before it starts', (d) => {
      const s = d.slots.find((x) => x.status === 'booked')
      if (!s) return false
      s.status = 'free'
      d.now = toHHMM(Math.max(0, toMin(String(s.start)) - 20))
      return true
    }],
    ['Staff absence', 'The staff member for the first open slot calls in sick: the slot is blocked', (d) => {
      const s = d.slots.find((x) => x.status === 'free')
      if (!s) return false
      s.status = 'blocked'
      return true
    }],
    ['Longer service', 'The matched customer now needs 30 minutes more', (d, r) => {
      const e = firstMatchEntry(d, r)
      if (!e) return false
      e.minutes = Number(e.minutes) + 30
      return true
    }],
    ['Withdraw consent', 'The matched customer replies STOP', (d, r) => {
      const e = firstMatchEntry(d, r)
      if (!e) return false
      e.consent = false
      return true
    }],
  ]

  const importFile = async (file: File) => {
    setImportErr(null)
    if (file.size > 2_000_000) return setImportErr('That file is over 2 MB. A day of appointments is a few kilobytes.')
    const raw = await file.text()
    if (/\.json$/i.test(file.name) || raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
      try {
        setBefore(null)
        setText(pretty(importJson(raw)))
      } catch (e) { setImportErr(`Not valid JSON: ${(e as Error).message}`) }
      return
    }
    const rows = parseCsv(raw)
    if (!rows.length) return setImportErr('The CSV has a header but no rows.')
    const cols = Object.keys(rows[0])
    const cur = ev.kind === 'ok' ? ev.doc : { slots: [], waitlist: [] }
    const typed = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, val]) => [k,
      k === 'minutes' ? (val === '' ? null : Number(val)) : k === 'consent' ? (val === 'true' ? true : val === 'false' ? false : val === '' ? null : val) : val === '' ? null : val])))
    if (cols.includes('start')) setText(pretty({ ...cur, slots: typed }))
    else if (cols.includes('consent')) setText(pretty({ ...cur, waitlist: typed }))
    else setImportErr(`Unknown CSV: columns ${cols.join(', ')}. Use slot columns (id,start,minutes,skill,status) or waitlist columns (id,minutes,skill,consent).`)
    setBefore(null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    const f = e.dataTransfer.files[0]
    if (f) importFile(f)
  }

  return (
    <div className="lab">
      <section className="lab-intro">
        <p className="overline">Lab</p>
        <h1 className="lab-title">Change any input. Watch the rules hold.</h1>
        <p className="quiet">This page runs the same rules engine as the desk, in your browser. The database re-checks every one of them when a real offer is sent or accepted.</p>
      </section>

      <Checks />

      <div className="lab-grid">
        <section className="lab-in" aria-label="Input">
          <header className="section-head">
            <h2>Input</h2>
            <span className="head-acts">
              <button className="btn is-quiet" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Import</button>
              <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
            </span>
          </header>
          <label className="select-row">Load a case
            <select value={preset} onChange={(e) => load(e.target.value)}>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.label}</option>)}
            </select>
          </label>
          <div className={`editor ${dropping ? 'is-drop' : ''}`} onDragOver={(e) => { e.preventDefault(); setDropping(true) }} onDragLeave={() => setDropping(false)} onDrop={onDrop}>
            <textarea value={text} onChange={(e) => { setText(e.target.value); setBefore(null) }} spellCheck={false} aria-label="Input JSON: slots and waitlist" />
            {dropping && <div className="drop-hint">Drop a JSON or CSV file</div>}
          </div>
          {importErr && <p className="err" role="alert">{importErr}</p>}

          <h3 className="list-head">Edge cases</h3>
          <div className="toggles">
            {toggles.map(([label, hint, fn]) => (
              <button key={label} className="toggle" disabled={ev.kind !== 'ok'} onClick={() => mutate(label, fn)}>
                <strong>{label}</strong><small>{hint}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="lab-out" aria-label="Result" aria-live="polite">
          <header className="section-head"><h2>Result</h2>
            {ev.kind === 'ok' && <button className="btn is-quiet" onClick={() => download('refill-lab-result.json', pretty(exportResult(ev)))}><Icon name="download" /> JSON</button>}
          </header>
          <Result ev={ev} />
          {before && ev.kind === 'ok' && <BeforeAfter before={before} after={ev} />}
        </section>
      </div>
    </div>
  )
}

function Result({ ev }: { ev: Eval }) {
  if (ev.kind === 'parse') return <div className="verdict-card is-bad"><span className="code is-bad">PARSE_ERROR</span><p>{ev.message}</p></div>
  if (ev.kind === 'invalid') return (
    <div className="verdict-card is-bad"><span className="code is-bad">{ev.error}</span><p>{ev.message}</p><p className="quiet mono">at {ev.at}. Nothing was matched: a bad file never produces a half-right answer.</p></div>
  )
  const { input, result, raced, now } = ev
  const slot = (id: string) => input.slots.find((s) => s.id === id)!
  return (
    <div className="result">
      {raced && (
        <div className="verdict-card">
          <p className="overline">Race for {ev.doc.race!.slot}: {ev.doc.race!.requests.join(', ')} tap in that order</p>
          <p><strong>Confirmed:</strong> {raced.confirmed ?? 'nobody'} · <strong>Kept waitlist place:</strong> {raced.waitlisted.join(', ') || 'none'}</p>
          {Object.keys(raced.rejected).length > 0 && <p><strong>Rejected:</strong> {Object.entries(raced.rejected).map(([k, r]) => `${k} (${r})`).join(', ')}</p>}
        </div>
      )}
      <div className="verdict-card">
        <p className="overline">Matches{now !== undefined ? ` · clock ${toHHMM(now)}` : ''}</p>
        {result.matches.length === 0 ? <p>No slot is filled.</p> : (
          <ul className="rows">{result.matches.map(([w, s]) => (
            <li key={w + s} className="match"><span className="mono">{w}</span><Icon name="arrow" size={16} /><span className="mono">{s}</span>
              <span className="quiet">{slot(s).start} · {slot(s).minutes} min {slot(s).skill}{now !== undefined && notice(toMin(slot(s).start), now) === 'LATE' ? ` · late notice, ${lead(toMin(slot(s).start) - now)}` : ''}</span></li>
          ))}</ul>
        )}
      </div>
      {input.slots.map((s) => {
        const state = slotExplanation(s, result)
        return (
          <div key={s.id} className="slot-card">
            <p className="overline">{s.id} · {s.start} · {s.minutes} min · {s.skill} · <span className={s.status === 'free' ? 'beat-text' : ''}>{s.status}</span></p>
            {state.code !== 'OFFERABLE' ? <p className="quiet">{state.message}</p> : (
                <ul className="rows">
                  {input.waitlist.map((e) => {
                    const explanation = candidateExplanation(input, result, s, e)
                    return (
                      <li key={e.id} className="skip">
                        <span className="skip-name mono">{e.id}</span>
                        <span className={`code ${explanation.code === 'MATCHED' ? 'is-act' : ''}`}>{explanation.code}</span>
                        <span className="skip-why">{explanation.message}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
          </div>
        )
      })}
    </div>
  )
}

function BeforeAfter({ before, after }: { before: Ok & { label: string }; after: Ok }) {
  const fmt = (m: [string, string][]) => (m.length ? m.map(([w, s]) => `${w}→${s}`).join(', ') : 'none')
  const changes = compareResults(before, after)
  return (
    <div className="verdict-card is-diff">
      <p className="overline">{before.label}: before and after</p>
      <p><strong>Before:</strong> {fmt(before.result.matches)}</p>
      <p><strong>After:</strong> {fmt(after.result.matches)}</p>
      {changes.length > 0 && <ul className="rows mono small">{changes.map((c) => <li key={c}>{c}</li>)}</ul>}
      <button className="btn is-quiet" onClick={() => download('refill-before-after.json', pretty({ edge_case: before.label, before: { input: before.doc, matches: before.result.matches, perSlot: before.result.perSlot }, after: { input: after.doc, matches: after.result.matches, perSlot: after.result.perSlot } }))}>
        <Icon name="download" /> Before/after proof
      </button>
    </div>
  )
}

function Checks() {
  const [report, setReport] = useState<RaceReport | null>(null)
  const [racing, setRacing] = useState(false)
  const [raceErr, setRaceErr] = useState<string | null>(null)

  const rows = useMemo(() => {
    const s = (minutes: number, status: 'free' | 'booked' = 'free') => ({ id: 'S1', start: '10:00', minutes, skill: 'hair', status })
    const w = (id: string, minutes: number, consent: boolean | null) => ({ id, minutes, skill: 'hair', consent })
    const one: Input = { slots: [s(30)], waitlist: [w('W1', 60, true)] }
    const c1 = matchAll(one)
    const two: Input = { slots: [s(60)], waitlist: [w('A', 60, true), w('B', 60, true)] }
    const c2 = race(two, 'S1', ['A', 'B'])
    const c3 = candidates(s(60), [w('C', 30, false)])
    const v = validate(fixture)
    const fx = v.ok ? matchAll(v.input).matches : []
    const coreRuns = (core as Scenario[]).map(runScenario)
    const teamRuns = (team as Scenario[]).map(runScenario)
    return [
      { label: 'Case check 1 · a 60-minute request cannot occupy a 30-minute slot', expected: 'no match; W1 DURATION_TOO_LONG', actual: c1.matches.length ? 'matched!' : `no match; W1 ${c1.perSlot.S1.excluded.W1}`, pass: c1.matches.length === 0 && c1.perSlot.S1.excluded.W1 === 'DURATION_TOO_LONG' },
      { label: 'Case check 2 · two requests compete for one slot', expected: 'A confirmed, B waitlisted', actual: `${c2.confirmed} confirmed, ${c2.waitlisted.join(',') || 'nobody'} waitlisted`, pass: c2.confirmed === 'A' && c2.waitlisted.join() === 'B' },
      { label: 'Case check 3 · a customer without consent is excluded from outreach', expected: 'C excluded, NO_CONSENT', actual: c3.eligible.length ? 'offered!' : `C excluded, ${c3.excluded[0]?.reason}`, pass: c3.eligible.length === 0 && c3.excluded[0]?.reason === 'NO_CONSENT' },
      { label: 'Organiser fixture C29 · expected_match', expected: fixture.records.expected_match.join(' → '), actual: fx.map((m) => m.join(' → ')).join(', ') || 'none', pass: fx.length === 1 && fx[0].join() === fixture.records.expected_match.join() },
      { label: `Core scenarios · tests/core-scenarios.json`, expected: `${coreRuns.length} pass`, actual: `${coreRuns.filter((r) => r.pass).length} pass`, pass: coreRuns.every((r) => r.pass) },
      { label: `Team scenarios · tests/scenarios.json`, expected: teamRuns.length ? `${teamRuns.length} pass` : 'file not filled yet', actual: `${teamRuns.filter((r) => r.pass).length} pass`, pass: teamRuns.length === 0 || teamRuns.every((r) => r.pass) },
    ]
  }, [])

  const runRace = async () => {
    setRacing(true)
    setRaceErr(null)
    try { setReport(await liveRace(8)) } catch (e) { setRaceErr((e as Error).message) }
    setRacing(false)
  }

  useEffect(() => { document.title = 'Lab · Refill' ; return () => { document.title = 'Refill' } }, [])

  return (
    <section className="checks" aria-label="Checks">
      <header className="checks-head">
        <p className="score"><b className={rows.every((r) => r.pass) ? 'act-text' : 'risk-text'}>{rows.filter((r) => r.pass).length}<i>/{rows.length}</i></b><small>checks pass, computed now in this browser by the same engine the desk uses</small></p>
        <p className="quiet small">The last row fires a real race at the live database.</p>
      </header>
      <ul className="rows">
        {rows.map((r) => (
          <li key={r.label} className="check">
            <span className={`dot ${r.pass ? 'is-pass' : 'is-fail'}`} aria-label={r.pass ? 'pass' : 'fail'} />
            <span className="check-label">{r.label}</span>
            <span className="check-io mono"><span><small>expected</small>{r.expected}</span><span><small>actual</small>{r.actual}</span></span>
          </li>
        ))}
        <li className="check">
          <span className={`dot ${report ? (report.ok ? 'is-pass' : 'is-fail') : ''}`} />
          <span className="check-label">Live database race · 8 phones tap Accept on one slot at once</span>
          <span className="check-io">
            {!report && <button className="btn is-primary" onClick={runRace} disabled={racing}><Icon name="bolt" /> {racing ? 'Racing…' : 'Run live race'}</button>}
            {report && <span className="mono">{report.confirmed} confirmed · {report.waitlisted} kept their place · {report.ms} ms</span>}
            {raceErr && <span className="err">{raceErr}</span>}
          </span>
          {report && <ul className="race-checks">{report.checks.map(([l, ok]) => <li key={l}><span className={`dot ${ok ? 'is-pass' : 'is-fail'}`} />{l}</li>)}</ul>}
        </li>
      </ul>
    </section>
  )
}
