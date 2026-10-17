# Graph Report - refill  (2026-10-17)

## Corpus Check
- 70 files · ~110,467 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 5, .csv 4, .css 2)

## Summary
- 804 nodes · 1397 edges · 63 communities (58 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80b0387d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SlotSheet.tsx
- engine.ts
- api.ts
- package.json
- compilerOptions
- compilerOptions
- db-test.ts
- Refill
- App.tsx
- Rules for AI agents and assistants in this repository
- .oxlintrc.json
- pull_request_template.md
- MBA research received 2026-10-17 (source: MBA teammates; not yet verified)
- Changelog
- Devlog
- tsconfig.json
- Demo salon data (synthetic)
- dhruv.md
- vercel.json
- Apple Design
- Rules
- Appendix B - Canonical Sources (read these before reinventing)
- Flagship feel
- rpc.ts
- Design Audit
- 4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)
- 10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know)
- tasteskill: Anti-Slop Frontend Skill
- Design Engineering
- Ponytail
- 9. AI TELLS (Forbidden Patterns)
- Component Building Principles
- 11. REDESIGN PROTOCOL
- 3. DEFAULT ARCHITECTURE & CONVENTIONS
- 6. PERFORMANCE & ACCESSIBILITY GUARDRAILS
- The Animation Decision Framework
- clip-path for Animation
- Performance Rules
- Gesture and Drag Interactions
- 0. BRIEF INFERENCE (Read the Room Before Anything Else)
- 12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)
- 5. CONTEXT-AWARE PROACTIVITY
- 8. DARK MODE PROTOCOL
- CSS Transform Mastery
- The Sonner Principles (Building Loved Components)
- Spring Animations
- Icon
- Core Philosophy
- Debugging Animations
- Known Limits
- HANDOFF: read this first if you are a fresh Claude working for Dhruv
- Lab.tsx
- day.ts
- engine.test.ts
- Defensive Q&A Cheat Sheet (What Judges Will Ask & How to Answer)
- 3. Concurrency Race Test (`npm run race`)
- liveRace.ts
- Market shocks: rehearsal script for the live app
- Parth Kachhara — scenario tests and UI review
- Teammate tasks (current)
- 1. THE THREE DIALS (Core Configuration)
- Vedanth Raj (vedanth-raj)

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 37 edges
2. `clock()` - 36 edges
3. `money()` - 22 edges
4. `Apple Design` - 21 edges
5. `Flagship feel` - 20 edges
6. `react` - 19 edges
7. `compilerOptions` - 19 edges
8. `rpc()` - 18 edges
9. `Shell()` - 17 edges
10. `tasteskill: Anti-Slop Frontend Skill` - 16 edges

## Surprising Connections (you probably didn't know these)
- `The three case checks` --references--> `reasonFor()`  [INFERRED]
  README.md → src/engine.ts
- `0.2 What is done (all live and tested)` --references--> `SubDial()`  [INFERRED]
  HANDOFF.md → src/Dial.tsx
- `0.2 What is done (all live and tested)` --references--> `SlotDial()`  [INFERRED]
  HANDOFF.md → src/Dial.tsx
- `4. What is built (v3.0.0, all live and tested)` --references--> `useBook()`  [INFERRED]
  HANDOFF.md → src/api.ts
- `0.3 The design language: LOCKED. Build everything inside it.` --references--> `Num()`  [INFERRED]
  HANDOFF.md → src/motion.tsx

## Import Cycles
- None detected.

## Communities (63 total, 5 thin omitted)

### Community 0 - "SlotSheet.tsx"
Cohesion: 0.08
Nodes (69): 4. What is built (v3.0.0, all live and tested), CORE, DbEntry, DbEvent, DbOffer, DbSlot, deskLinkUrl(), joinLink() (+61 more)

### Community 1 - "engine.ts"
Cohesion: 0.13
Nodes (19): Input, InputError, isObj(), LABEL, Options, pairKey(), posInt(), RaceResult (+11 more)

### Community 2 - "api.ts"
Cohesion: 0.13
Nodes (23): asEntry(), asSlot(), asStaff(), dayPayload(), DbBooking, DbMove, DbStaff, Desk (+15 more)

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
Cohesion: 0.15
Nodes (12): Beyond salons, Data, Edge cases from the card, How it is built, Known limits, Refill, Run it, Security and abuse limits (+4 more)

### Community 8 - "App.tsx"
Cohesion: 0.13
Nodes (27): react-dom, Activity, App(), Area, areaOf(), Dock(), DOCKS, InstallEvent (+19 more)

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
Cohesion: 0.33
Nodes (5): Changelog, v1.0.0 · `v1-mba-handover` · 17 Oct 2026, v1.1.0 · 17 Oct 2026 · engineering hardening (not a business-team change), v2.0.0 · 17 Oct 2026 · roles, stylists, rescheduling, v3.0.0 · 17 Oct 2026 · one clear dashboard per role

### Community 14 - "Devlog"
Cohesion: 0.50
Nodes (3): 17 Oct 2026, day, 17 Oct 2026, evening: v2.0.0 (roles, stylists, rescheduling), Devlog

### Community 20 - "Apple Design"
Cohesion: 0.09
Nodes (21): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+13 more)

### Community 21 - "Rules"
Cohesion: 0.09
Nodes (20): caveman, Example output, How to invoke, See also, What it does, 1. Answer first, 2. Kill ceremony, 3. Short word (+12 more)

### Community 22 - "Appendix B - Canonical Sources (read these before reinventing)"
Cohesion: 0.09
Nodes (21): APPENDICES - Real Source-Backed Reference Material, Appendix A - Install Commands per Design System, Appendix B - Canonical Sources (read these before reinventing), Appendix C - Apple Liquid Glass: Honest Web Approximation, Apple Liquid Glass (Apple platforms only), Atlassian, Bootstrap, Carbon (+13 more)

### Community 23 - "Flagship feel"
Cohesion: 0.10
Nodes (20): 0. Choose the direction before you code, 10. Everyone, every device, 11. Smoothness is the premium, 12. Voice, 13. How to work (this is how the originals were made), 14. Never, 15. Starting numbers, 1. The content is the hero (+12 more)

### Community 24 - "rpc.ts"
Cohesion: 0.60
Nodes (3): SUPABASE_KEY, SUPABASE_URL, FRIENDLY

### Community 25 - "Design Audit"
Cohesion: 0.10
Nodes (19): Code Quality, Color and Surfaces, Component Patterns, Content, Design Audit, Fix Priority, How This Works, Iconography (+11 more)

### Community 26 - "4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)"
Cohesion: 0.17
Nodes (12): 4.10 Quotes & Testimonials, 4.11 Page Theme Lock (Light / Dark Mode Consistency), 4.1 Typography, 4.2 Color Calibration, 4.3 Layout Diversification, 4.4 Materiality, Shadows, Cards, 4.5 Interactive UI States, 4.6 Data & Form Patterns (+4 more)

### Community 27 - "10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know)"
Cohesion: 0.20
Nodes (10): 10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know), Animation Library Choice, Cards & Containers, Galleries & Media, Hero Paradigms, Layout & Grids, Micro-Interactions & Effects, Navigation & Menus (+2 more)

### Community 28 - "tasteskill: Anti-Slop Frontend Skill"
Cohesion: 0.20
Nodes (10): 13. OUT OF SCOPE, 14. FINAL PRE-FLIGHT CHECK, 2.A When to reach for a real design system (use official packages), 2.B When the brief is an aesthetic, not a system, 2. BRIEF → DESIGN SYSTEM MAP, 7. DIAL DEFINITIONS (Technical Reference), DESIGN_VARIANCE (Level 1-10), MOTION_INTENSITY (Level 1-10) (+2 more)

### Community 29 - "Design Engineering"
Cohesion: 0.22
Nodes (8): Accessibility, Design Engineering, Initial Response, prefers-reduced-motion, Review Checklist, Review Format (Required), Stagger Animations, Touch device hover states

### Community 30 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 31 - "9. AI TELLS (Forbidden Patterns)"
Cohesion: 0.25
Nodes (8): 9.A Visual & CSS, 9. AI TELLS (Forbidden Patterns), 9.B Typography, 9.C Layout & Spacing, 9.D Content & Data ("Jane Doe" Effect), 9.E External Resources & Components, 9.F Production-Test Tells (banned outright), 9.G EM-DASH BAN (the single most-violated Tell)

### Community 32 - "Component Building Principles"
Cohesion: 0.25
Nodes (8): Animate enter states with @starting-style, Buttons must feel responsive, Component Building Principles, Make popovers origin-aware, Never animate from scale(0), Tooltips: skip delay on subsequent hovers, Use blur to mask imperfect transitions, Use CSS transitions over keyframes for interruptible UI

### Community 33 - "11. REDESIGN PROTOCOL"
Cohesion: 0.29
Nodes (7): 11.A Detect the Mode (first action), 11.B Audit Before Touching, 11.C Preservation Rules, 11.D Modernisation Levers (priority order), 11.E Decision Tree: Targeted Evolution vs Full Redesign, 11.F What Never Changes Silently, 11. REDESIGN PROTOCOL

### Community 34 - "3. DEFAULT ARCHITECTURE & CONVENTIONS"
Cohesion: 0.29
Nodes (7): 3.A Stack, 3.B State, 3.C Icons, 3.D Emoji Policy, 3. DEFAULT ARCHITECTURE & CONVENTIONS, 3.E Responsiveness & Layout Mechanics, 3.F Dependency Verification (mandatory)

### Community 35 - "6. PERFORMANCE & ACCESSIBILITY GUARDRAILS"
Cohesion: 0.29
Nodes (7): 6.A Hardware Acceleration, 6.B Reduced Motion (mandatory), 6.C Dark Mode (mandatory for any consumer-facing page), 6.D Core Web Vitals Targets, 6.E DOM Cost, 6.F Z-Index Restraint, 6. PERFORMANCE & ACCESSIBILITY GUARDRAILS

### Community 36 - "The Animation Decision Framework"
Cohesion: 0.33
Nodes (6): 1. Should this animate at all?, 2. What is the purpose?, 3. What easing should it use?, 4. How fast should it be?, Perceived performance, The Animation Decision Framework

### Community 37 - "clip-path for Animation"
Cohesion: 0.33
Nodes (6): clip-path for Animation, Comparison sliders, Hold-to-delete pattern, Image reveals on scroll, Tabs with perfect color transitions, The inset shape

### Community 38 - "Performance Rules"
Cohesion: 0.33
Nodes (6): CSS animations beat JS under load, CSS variables are inheritable, Framer Motion hardware acceleration caveat, Only animate transform and opacity, Performance Rules, Use WAAPI for programmatic CSS animations

### Community 39 - "Gesture and Drag Interactions"
Cohesion: 0.33
Nodes (6): Damping at boundaries, Friction instead of hard stops, Gesture and Drag Interactions, Momentum-based dismissal, Multi-touch protection, Pointer capture for drag

### Community 40 - "0. BRIEF INFERENCE (Read the Room Before Anything Else)"
Cohesion: 0.40
Nodes (5): 0.A Read these signals first, 0.B Output a one-line "Design Read" before generating, 0. BRIEF INFERENCE (Read the Room Before Anything Else), 0.C If the brief is ambiguous, ask one question, do not guess, 0.D Anti-Default Discipline

### Community 41 - "12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)"
Cohesion: 0.40
Nodes (5): 12.A File Location, 12.B Required Frontmatter, 12.C Required Body Sections, 12.D Block-Library Discipline, 12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)

### Community 42 - "5. CONTEXT-AWARE PROACTIVITY"
Cohesion: 0.40
Nodes (5): 5.A Sticky-Stack - Canonical Skeleton, 5.B Horizontal-Pan - Canonical Skeleton, 5.C Scroll-Reveal Stagger - Canonical Skeleton (lighter alternative), 5. CONTEXT-AWARE PROACTIVITY, 5.D Forbidden Animation Patterns

### Community 43 - "8. DARK MODE PROTOCOL"
Cohesion: 0.40
Nodes (5): 8.A Token Strategy (pick one, stick to it), 8.B Do Not Prescribe Specific Colors Here, 8.C Default Mode, 8.D Test in Both Modes Before Finishing, 8. DARK MODE PROTOCOL

### Community 44 - "CSS Transform Mastery"
Cohesion: 0.40
Nodes (5): 3D transforms for depth, CSS Transform Mastery, scale() scales children too, transform-origin, translateY with percentages

### Community 45 - "The Sonner Principles (Building Loved Components)"
Cohesion: 0.40
Nodes (5): Asymmetric enter/exit timing, Cohesion matters, Review your work the next day, The opacity + height combination, The Sonner Principles (Building Loved Components)

### Community 46 - "Spring Animations"
Cohesion: 0.40
Nodes (5): Interruptibility advantage, Spring Animations, Spring-based mouse interactions, Spring configuration, When to use springs

### Community 47 - "Icon"
Cohesion: 0.13
Nodes (35): react, MoveOption, Bar(), Clock(), demoDay(), ang(), arc(), Dial() (+27 more)

### Community 48 - "Core Philosophy"
Cohesion: 0.50
Nodes (4): Beauty is leverage, Core Philosophy, Taste is trained, not innate, Unseen details compound

### Community 49 - "Debugging Animations"
Cohesion: 0.50
Nodes (4): Debugging Animations, Frame-by-frame inspection, Slow motion testing, Test on real devices

### Community 50 - "Known Limits"
Cohesion: 0.05
Nodes (37): 1. No Owner Authentication or Multi-Tenant Access Control, 2. Simulated Messaging via Mobile Web View (No Live SMS or WhatsApp Gateway), 3. Client Polling (1.2s Interval) Instead of Live WebSocket Subscriptions, 4. Synthetic Data Validating Rules Rather than Commercial Demand, 5. Single-Day Scheduling Horizon (24-Hour Calendar), 6. Single-Service Appointments (No Composite Service Bundles), 7. Fixed 15-Minute Offer Expiry Window, 8. Ephemeral Workspace Lifecycle (3-Day Pruning) (+29 more)

### Community 51 - "HANDOFF: read this first if you are a fresh Claude working for Dhruv"
Cohesion: 0.11
Nodes (17): 0.1 What this is, 0.2 What is done (all live and tested), 0.3 The design language: LOCKED. Build everything inside it., 0.4 Check the state first (2 minutes), 0.5 What to do next, in order, 0.6 Tools on the new account, 0. The short version, 10. First message to paste into a new Claude session (+9 more)

### Community 52 - "Lab.tsx"
Cohesion: 0.18
Nodes (13): explain(), MatchResult, notice, Reason, BeforeAfter(), Doc, Eval, Lab() (+5 more)

### Community 53 - "day.ts"
Cohesion: 0.18
Nodes (7): RFC-4180, Day, num(), Service, Staff, Entry, Slot

### Community 54 - "engine.test.ts"
Cohesion: 0.35
Nodes (11): buildDay(), parseCsv(), candidates(), matchAll(), race(), reasonFor(), staffOf(), toMin() (+3 more)

### Community 55 - "Defensive Q&A Cheat Sheet (What Judges Will Ask & How to Answer)"
Cohesion: 0.18
Nodes (10): 4-Minute Minute-by-Minute Run Sheet, Defensive Q&A Cheat Sheet (What Judges Will Ask & How to Answer), Q1: "How do you mathematically guarantee that two people never get booked into the same chair?", Q2: "Why not check whether the slot is free in React before sending the booking request?", Q3: "What happens if a customer experiences network lag and taps 'Accept' multiple times?", Q4: "How does Refill handle customer consent under privacy regulations like the DPDP Act?", Q5: "Could an attacker call your Supabase database directly and alter appointments?", Q6: "Could someone else clone your repository and verify it without setup headaches?" (+2 more)

### Community 56 - "3. Concurrency Race Test (`npm run race`)"
Cohesion: 0.20
Nodes (9): 1. Setup Steps & Results Table, 2. Summary of `npm test`, 3. Concurrency Race Test (`npm run race`), Clean-Machine Setup & Handoff Verification, Execution Output, Failure Report, Run Breakdown Table, Test Breakdown (+1 more)

### Community 57 - "liveRace.ts"
Cohesion: 0.29
Nodes (6): N, RUNS, liveRace(), RaceReport, Sent, Tap

### Community 58 - "Market shocks: rehearsal script for the live app"
Cohesion: 0.29
Nodes (6): 1. Late cancellation, 2. A staff member calls in sick, 3. A client needs a longer service than the free gap, 4. A client withdraws consent, Before you start, Market shocks: rehearsal script for the live app

### Community 59 - "Parth Kachhara — scenario tests and UI review"
Cohesion: 0.33
Nodes (5): Parth Kachhara — scenario tests and UI review, Pull request, Scenario contribution, UI review, Validation

### Community 60 - "Teammate tasks (current)"
Cohesion: 0.33
Nodes (5): Chirag (market-shock rehearsal), MBA pair (feedback + business slides), Parth (real-phone testing + scenarios), Teammate tasks (current), Vedanth (demo script + Q&A)

### Community 61 - "1. THE THREE DIALS (Core Configuration)"
Cohesion: 0.50
Nodes (4): 1.A Dial Inference (design read → dial values), 1.B Use-Case Presets, 1.C How the Dials Drive Output, 1. THE THREE DIALS (Core Configuration)

### Community 62 - "Vedanth Raj (vedanth-raj)"
Cohesion: 0.50
Nodes (3): Links, Responsibilities & What I Did, Vedanth Raj (vedanth-raj)

## Knowledge Gaps
- **7 isolated node(s):** `@types/node`, `@types/qrcode`, `@types/react`, `@types/react-dom`, `oxlint` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 514 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Icon` to `SlotSheet.tsx`, `api.ts`, `package.json`, `App.tsx`, `Lab.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/qrcode`, `@types/react` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SlotSheet.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07892107892107893 - nodes in this community are weakly interconnected._
- **Why does `rpc()` connect `Icon` to `SlotSheet.tsx`, `api.ts`, `db-test.ts`, `rpc.ts`, `liveRace.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._
- **Why does `tasteskill: Anti-Slop Frontend Skill` connect `tasteskill: Anti-Slop Frontend Skill` to `11. REDESIGN PROTOCOL`, `3. DEFAULT ARCHITECTURE & CONVENTIONS`, `6. PERFORMANCE & ACCESSIBILITY GUARDRAILS`, `0. BRIEF INFERENCE (Read the Room Before Anything Else)`, `12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)`, `5. CONTEXT-AWARE PROACTIVITY`, `8. DARK MODE PROTOCOL`, `Appendix B - Canonical Sources (read these before reinventing)`, `4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)`, `10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know)`, `1. THE THREE DIALS (Core Configuration)`, `9. AI TELLS (Forbidden Patterns)`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13405797101449277 - nodes in this community are weakly interconnected._