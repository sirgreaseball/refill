# Graph Report - refill  (2026-10-17)

## Corpus Check
- 47 files · ~61,443 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .csv 4, .example 1)

## Summary
- 392 nodes · 805 edges · 25 communities (19 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14eb4623`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- engine.ts
- api.ts
- package.json
- compilerOptions
- compilerOptions
- db-test.ts
- Refill
- Desk.tsx
- Rules for AI agents and assistants in this repository
- .oxlintrc.json
- pull_request_template.md
- MBA research received 2026-10-17 (source: MBA teammates; not yet verified)
- Changelog
- Devlog
- tsconfig.json
- salon/README.md
- dhruv.md
- vercel.json
- day.ts
- Lab.tsx
- toMin
- Checks
- rpc.ts

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 31 edges
2. `Recovery()` - 23 edges
3. `clock()` - 22 edges
4. `compilerOptions` - 19 edges
5. `rpc()` - 18 edges
6. `Desk()` - 17 edges
7. `react` - 15 edges
8. `money()` - 15 edges
9. `Mark()` - 15 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `The three case checks` --references--> `reasonFor()`  [INFERRED]
  README.md → src/engine.ts
- `make()` --calls--> `rpc()`  [EXTRACTED]
  scripts/db-test.ts → src/rpc.ts
- `Checks()` --indirect_call--> `runScenario()`  [INFERRED]
  src/Lab.tsx → src/engine.ts
- `App()` --calls--> `readDesk()`  [EXTRACTED]
  src/App.tsx → src/api.ts
- `Shell()` --calls--> `useBook()`  [EXTRACTED]
  src/App.tsx → src/api.ts

## Import Cycles
- None detected.

## Communities (25 total, 6 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.10
Nodes (45): react, react-dom, MoveOption, App(), ClockControl(), Entry(), Header(), InstallEvent (+37 more)

### Community 1 - "engine.ts"
Cohesion: 0.11
Nodes (20): Input, InputError, isObj(), LABEL, MatchResult, Options, pairKey(), posInt() (+12 more)

### Community 2 - "api.ts"
Cohesion: 0.08
Nodes (40): CORE, dayPayload(), DbBooking, DbEntry, DbEvent, DbMove, DbOffer, DbSlot (+32 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (37): dependencies, qrcode, react, react-dom, description, devDependencies, oxlint, @types/node (+29 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 6 - "db-test.ts"
Cohesion: 0.04
Nodes (47): after, again, allOk, asDesk, b1, badPolicy, busy, chose (+39 more)

### Community 7 - "Refill"
Cohesion: 0.18
Nodes (10): Data, Edge cases from the card, How it is built, Known limits, Refill, Run it, Security and abuse limits, Team (+2 more)

### Community 8 - "Desk.tsx"
Cohesion: 0.13
Nodes (32): asEntry(), asSlot(), asStaff(), moveUrl(), atRisk(), Board(), Book, chip() (+24 more)

### Community 9 - "Rules for AI agents and assistants in this repository"
Cohesion: 0.29
Nodes (6): Formats you must keep exactly, Hard rules, How the app works (read-only context), Rules for AI agents and assistants in this repository, What this repository is, Who owns what

### Community 10 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 11 - "pull_request_template.md"
Cohesion: 0.40
Nodes (4): Files touched, How I checked it, Test summary, What this changes

### Community 12 - "MBA research received 2026-10-17 (source: MBA teammates; not yet verified)"
Cohesion: 0.50
Nodes (3): Competitor table (screenshot), Gaps doc — "Key Gaps in Existing Apps - Product Opportunity" (Google Doc 17iw3vcB4V98EHGlFVA2b8k8OfEYyt54NRaLRCUlMqK8), MBA research received 2026-10-17 (source: MBA teammates; not yet verified)

### Community 13 - "Changelog"
Cohesion: 0.40
Nodes (4): Changelog, v1.0.0 · `v1-mba-handover` · 17 Oct 2026, v1.1.0 · 17 Oct 2026 · engineering hardening (not a business-team change), v2.0.0 · 17 Oct 2026 · roles, stylists, rescheduling

### Community 20 - "day.ts"
Cohesion: 0.17
Nodes (9): RFC-4180, buildDay(), Day, num(), parseCsv(), Service, Staff, Entry (+1 more)

### Community 21 - "Lab.tsx"
Cohesion: 0.26
Nodes (12): explain(), notice, Scenario, BeforeAfter(), Doc, Eval, Lab(), Ok (+4 more)

### Community 22 - "toMin"
Cohesion: 0.33
Nodes (9): The three case checks, candidates(), matchAll(), race(), reasonFor(), staffOf(), toMin(), tooSoon() (+1 more)

### Community 23 - "Checks"
Cohesion: 0.25
Nodes (7): N, RUNS, Checks(), liveRace(), RaceReport, Sent, Tap

### Community 24 - "rpc.ts"
Cohesion: 0.60
Nodes (3): SUPABASE_KEY, SUPABASE_URL, FRIENDLY

## Knowledge Gaps
- **7 isolated node(s):** `@types/node`, `@types/qrcode`, `@types/react`, `@types/react-dom`, `oxlint` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 212 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `Desk.tsx`, `api.ts`, `package.json`, `Lab.tsx`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/qrcode`, `@types/react` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10150375939849623 - nodes in this community are weakly interconnected._
- **Why does `rpc()` connect `App.tsx` to `api.ts`, `db-test.ts`, `Desk.tsx`, `Checks`, `rpc.ts`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Why does `reasonFor()` connect `toMin` to `Desk.tsx`, `engine.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07928118393234672 - nodes in this community are weakly interconnected._