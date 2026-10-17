# Graph Report - refill  (2026-10-17)

## Corpus Check
- 35 files · ~22,638 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .csv 4, .example 1)

## Summary
- 272 nodes · 506 edges · 20 communities (13 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7bca3119`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Desk.tsx
- Lab.tsx
- api.ts
- package.json
- compilerOptions
- compilerOptions
- rpc
- Refill
- devDependencies
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

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 20 edges
2. `compilerOptions` - 19 edges
3. `Recovery()` - 16 edges
4. `Desk()` - 15 edges
5. `compilerOptions` - 15 edges
6. `Lab()` - 11 edges
7. `toMin()` - 10 edges
8. `validate()` - 10 edges
9. `clock()` - 10 edges
10. `Refill` - 10 edges

## Surprising Connections (you probably didn't know these)
- `The three case checks` --references--> `reasonFor()`  [INFERRED]
  README.md → src/engine.ts
- `Shell()` --calls--> `useBook()`  [EXTRACTED]
  src/App.tsx → src/api.ts
- `Desk()` --calls--> `candidates()`  [EXTRACTED]
  src/Desk.tsx → src/engine.ts
- `Desk()` --calls--> `reasonFor()`  [EXTRACTED]
  src/Desk.tsx → src/engine.ts
- `Recovery()` --indirect_call--> `asEntry()`  [INFERRED]
  src/Desk.tsx → src/api.ts

## Import Cycles
- None detected.

## Communities (20 total, 7 thin omitted)

### Community 0 - "Desk.tsx"
Cohesion: 0.10
Nodes (48): CORE, qrcode, react, react-dom, asEntry(), asSlot(), App(), ClockControl() (+40 more)

### Community 1 - "Lab.tsx"
Cohesion: 0.11
Nodes (40): parseCsv(), candidates(), explain(), Input, InputError, isObj(), matchAll(), MatchResult (+32 more)

### Community 2 - "api.ts"
Cohesion: 0.09
Nodes (24): RFC-4180, dayPayload(), DbBooking, DbEntry, DbEvent, DbOffer, DbSlot, DbStaff (+16 more)

### Community 3 - "package.json"
Cohesion: 0.08
Nodes (25): dependencies, qrcode, react, react-dom, description, name, private, scripts (+17 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 6 - "rpc"
Cohesion: 0.21
Nodes (10): N, RUNS, SUPABASE_KEY, SUPABASE_URL, liveRace(), RaceReport, Sent, Tap (+2 more)

### Community 7 - "Refill"
Cohesion: 0.18
Nodes (10): Data, Edge cases from the card, How it is built, Known limits, Refill, Run it, Team, The journey a judge can repeat (+2 more)

### Community 8 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, oxlint, @types/node, @types/qrcode, @types/react, @types/react-dom, typescript, vite (+2 more)

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

## Knowledge Gaps
- **7 isolated node(s):** `@types/node`, `@types/qrcode`, `@types/react`, `@types/react-dom`, `oxlint` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 143 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Desk.tsx` to `Lab.tsx`, `api.ts`, `package.json`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/qrcode`, `@types/react` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Desk.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09935064935064936 - nodes in this community are weakly interconnected._
- **Why does `reasonFor()` connect `Lab.tsx` to `Desk.tsx`, `Refill`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Lab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10628019323671498 - nodes in this community are weakly interconnected._
- **Why does `The three case checks` connect `Refill` to `Lab.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09032258064516129 - nodes in this community are weakly interconnected._