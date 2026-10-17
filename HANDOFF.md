# HANDOFF: read this first if you are a fresh Claude working for Dhruv

You are picking up a live hackathon build mid-flight. The owner (Dhruv, GitHub `sirgreaseball`) switches Claude accounts when one runs out of usage. You have no chat history; this file is the history. Read it fully, then act. Do not re-ask what is answered here.

Last updated: 18 Oct 2026, ~01:10 IST. v4 revamp in progress (section 5, item 0). Done: chronograph theme (Satoshi + Clash Display, lime/amber/coral, grain), Day Dial on Home and on Front desk Today (`src/Dial.tsx`), magnetic primary buttons, one clock on phones. #7 fixed; PRs #5 (Vedanth: DEMO_SCRIPT, KNOWN_LIMITS, SETUP_CHECK), #6 (Chirag: new prices, 3 more waitlist clients, docs/SHOCKS.md) and #8 (Parth: 12 scenarios) merged; `npm test` = 51 passing. Demo prices changed (hair spa ₹1,600); the MBA explainer PDF was updated to match. Existing demo days keep old data until reset. Next: restyle Owner pages and client/staff phone pages to the new type scale (Clash Display headlines already apply via h1/.phone-h), verify light theme and 375px on every page, refresh MBA explainer screenshots if used, then splash page later (separate route).

---

## 1. Where things are

| What | Where |
|---|---|
| Live app | https://fillthechair.vercel.app (push to `main` deploys via Vercel git integration, ~1 min) |
| Repo | https://github.com/sirgreaseball/refill (public). Local: `Z:\claude\refill` |
| Database | Supabase project `refill`, id `mbvxzuuuuzgpmsjggblo` (free plan) |
| Vercel project | `prj_ChBFSJAyt5O5et6zSMPlyHhUq3ev` (alias fillthechair.vercel.app) |
| Hackathon prep kit | `Z:\claude\fynd-hackathon` (case brief, team task files `C29-TEAM-TASKS.md`, `C29-MBA-TASKS.md`, `C29-MBA-BRIEF.md`, `mba-research.md`) |
| Case book PDF | `C:\Users\dhruv\Downloads\Use_Case_Book.pdf` (case C29, Appointment Recovery Desk) |
| Design reference for the revamp | Trace dashboard: https://tracethis.vercel.app, repo `sirgreaseball/trace`, local `Z:\trace` (v3 "daylight glass") |
| Skills for this project | `.claude/skills/` in this repo (auto-loaded by Claude Code here) |
| Plain-language explainer for the MBA pitch | `docs/business/Refill-explained-simply.pdf` (source `refill-explained.html`; no technical terms; problem, idea, 5 steps, roles, Kesar Salon scenario, features, problem-solution table, pitch lines, judge Q&A). Keep it non-technical if you update it. |
| Ops reports | `docs/ops/` (operational check PDF + HTML source; regenerate with headless Edge `--print-to-pdf` after re-running the checks) |
| Code graph | `graphify-out/` (`graphify query "..."` before broad reads; `graphify update .` after code changes) |

Launch configs for the browser preview live in `Z:\claude\.claude\launch.json`: `refill` (Vite dev, port 5180) and `refill-dist`.

## 2. The event and the deadline

- Fynd × NMIMS Hyderabad product and business simulation, 17–18 Oct 2026. Team case **C29 Appointment Recovery Desk**: when a booking is cancelled, offer the slot to a consented waitlist, never double-book, explain every decision. We chose the **salon** persona (Kesar Salon, Jubilee Hills; synthetic data).
- **Hard end: 12 PM on 18 Oct 2026.** A "market shock" lands at **9 AM 18 Oct** (from the card's edge cases: late cancellation, staff absence, duration change, consent withdrawn). Judges also run a changed-input challenge. Final pitch: 4 min demo + 3 min Q&A.
- Engineering rubric: journey 25; case checks 10/10/5 (60-min request cannot take a 30-min slot; two competing requests give 1 confirmed + 1 waitlisted; no consent means excluded from outreach); reliability 15; **post-MBA-feedback change 15**; handoff 10; individual contribution 10.
- The MBA-feedback change for the rubric is **rescheduling** (their ask: "keep an option to reschedule"). It shipped in v2.0.0. Document it as that in DEVLOG/README/MBA guide.

## 3. Team

- Dhruv (owner, 3rd-yr CSE-DS) builds everything with Claude.
- Engineers on GitHub: `vedanth-raj` (4th yr: reliability, handoff docs, presentation), `parthkachhara` (2nd yr: `tests/scenarios.json`), `ChiragSeervi123` (2nd yr: salon CSVs, market-shock scenarios). Their AIs follow `AGENTS.md` (narrow file scopes, branch + PR, `npm ci` only).
- Two MBA students. They only file `mba-request` issues and give feedback.
- **Messages to teammates or the MBA pair: write them paste-ready in chat. Dhruv sends them.** Do not send email or sweep inboxes unless Dhruv asks in that turn. Never put deadlines in teammate messages.

## 4. What is built (v3.0.0, all live and tested)

The app opens on **Home (`#/`)**, the product's own home screen (NOT a marketing splash; a separate splash page with Lenis/GSAP scroll work is planned later): greeting + live demo clock, the whole day as one **ribbon** (one row per staff member; open gaps pulse amber, refills green, red needs moving; tap a block to open it at the desk via `#/desk/slot/<id>`), counted-up figures, "Needs you now", team faces with in/out, waitlist consent bar, latest activity, and an app-icon launcher (Front desk, Owner, Staff, Client, Proof). Each role is its own dashboard so it can be demoed on its own. A role pill in the top bar switches views; a floating dock (bottom bar on phones) moves between a role's pages. Wording is business-neutral (staff, clients); the demo business is Kesar Salon. Roles are proven by keys the **database** checks on every call (UI hiding is not the security):
- **Front desk** (`#/desk`, `#/desk/waitlist`, `#/desk/activity`): Today = "needs you now" queue (clients whose staff member is out, held gaps, open gaps), team in/out chips with shift hours, schedule (lanes on desktop, list on phones). Tapping anything opens one **sheet** (bottom sheet on phones) with every action: offer an open gap to the waitlist (who fits, "not offered, and why"), offers out with QR and two-phone race, record a cancellation (two-step), undo, move to another time, "Let X choose" link, give a held gap to someone free. Waitlist page with consent Yes/No/? per person and an Add form. Activity = evidence log with filters and CSV/JSON export. Demo clock in the bar.
- **Owner** (`#/owner`, `#/owner/team`, `#/owner/rules`): Overview numbers (recovered, still open, lost, refilled/cancelled, offers, consent, reschedules, staff load); Team (staff in/out, their view, their link; front-desk link and "open as front desk"; client sign-up QR; owner's phone QR); Rules (hold window, message cap, late cut-off, lead time; owner only) and the who-can-do-what matrix. "View as front desk" uses the real front-desk key.
- **Staff member** (`#/staff/<id>` preview, own link `#/s/<ws>/<staff>/<key>`): own day, first names only, "I can't come in today".
- **Client**: sign-up `#/join/<code>` (explicit yes/no to messages, never pre-ticked), own page `#/me/<token>`, offer `#/o/<uuid>`, move link `#/m/<uuid>`.
- **Proof for judges** (`#/lab`): the three case checks live, organiser fixture, scenario files, editable input, edge toggles with before/after, live database race.
- Matching is staff-aware; staff absence revokes their open offers, holds their gaps, flags their clients; nothing moves until the desk or the client chooses. Working hours bound every move and option.
- Hardening: offers hold 15 demo-minutes then lapse; max 3 offers per client per day; rate limits per IP / day / offer; payload and text caps; 20k workspace cap, 3-day retention; table privileges revoked from the public key; append-only events; CSV formula-injection guard. Installable PWA (service worker cache `refill-shell-v3`, network-first navigation).
- Motion layer (v3.1, `src/motion.tsx` + `src/motion.css`): view transitions between pages (bar and dock stay), ambient glow whose colour follows the day (green clear, amber gaps, red risk), pointer spotlight on `.spot` cards, staggered rise-in, spring press feel (`--spring` linear()), sliding dock pill, `Num` count-up numbers, drag-to-dismiss sheet on phones. All disabled under reduced motion.
- Design system (v3): grey canvas, white groups, glass only on the bar, dock and sheets; green `--act` = you can act, amber `--beat` = open gap, red `--danger` = needs moving; Hanken Grotesk + JetBrains Mono; radius 18/12/8 concentric. All tokens in `src/styles.css`.

Files that matter:
- `src/engine.ts` pure rules (reason order NO_CONSENT > SKILL_MISMATCH > DURATION_TOO_LONG > NOT_AVAILABLE), `src/engine.test.ts`, `tests/core-scenarios.json`, `tests/scenarios.json` (Parth's, currently `[]`).
- `src/api.ts` (types, `useBook`, role keys, `DESK_FUNCS`), `src/rpc.ts` (plain fetch to PostgREST RPC), `src/config.ts` (public URL + publishable key).
- Pages: `src/App.tsx` (routes, Home, top bar with role pill and demo clock, dock), `src/desk/` (`common.tsx` shared rules text + `useRun`, `Today.tsx`, `SlotSheet.tsx`, `Waitlist.tsx`, `Activity.tsx`), `Owner.tsx` (Overview, Team, Rules, Access), `StaffView.tsx`, `Join.tsx`, `Me.tsx`, `Offer.tsx`, `Move.tsx`, `MovePicker.tsx`, `Lab.tsx`, `ui.tsx` (icons, Modal, QR, toast), `styles.css`.
- Data: `data/salon/{staff,services,schedule,customers}.csv` via `src/day.ts` (staff now have `shift_start,shift_end`).
- Database: `supabase/migrations/001`–`005` (all applied). 005 = working hours, `moves` table, front-desk role (`desk_hash`, `desk_link`), `set_policy`, `do_cancel`, `apply_move`, `move_options`, `get_move`, `choose_move`, `cancel_my_booking`, `my_move`.

Checks (run all before any push that touches logic):
```
npm test            # 38 unit + scenario tests
npm run dbtest      # 20 live database checks (roles, absence, shifts, moves, limits)
npm run race        # simultaneous taps: exactly one booking
npx tsc -b && npx vite build
```

## 5. What to do next (priority order)

0. **v4 visual revamp (IN PROGRESS, top priority).** Dhruv: v3 still looks "basic, AI-generated"; wants an Awwwards-level, unique, premium product UI with smooth motion, a professional font and one consistent theme across every page. Full creative authority. Brief chosen (keep to it so accounts stay consistent):
   - Concept: **the chronograph**. The day is a watch dial. Precision instrument, night-shift calm. Dark-first (light mode tuned by hand, never inverted).
   - Type: **Satoshi** (UI and body) + **Clash Display** (headlines and big numbers), both from Fontshare (`api.fontshare.com` CSS, `cdn.fontshare.com` fonts; CSP in `vercel.json` must allow them). JetBrains Mono only for times if needed.
   - Palette (dark): canvas #0a0a0c, surface #131316, raised #1a1a1f, ink #f4f1ea (warm white), ink-2 #a9a59c, act = electric lime #c6f24e (book, send, confirm), gap = amber #ffb547 (open slot heartbeat), risk = coral #ff5d4d. Fine film grain overlay at 3-4%. Light: paper #f4f2ed, ink #121214, act #3f6b00.
   - Centerpiece: **Day Dial** on Home and Today: 10:00 to 20:00 around a 300-degree arc, one concentric track per staff member, appointments as arc segments, open gaps glow amber and pulse, a refill animates the arc filling lime, a sweeping now-hand; hover/tap a segment opens its sheet. SVG, no library.
   - Motion: page transitions (already in), numbers count up (Num), staggered reveals, spring press, magnetic primary buttons on fine pointers, sheet springs. Respect reduced motion.
   - Keep every feature, route and database call; this is visual only.
1. **Keep raising the premium feel** (Dhruv: "basic and dull" before v3.1; wants Trace/Cascade/Apple-level motion). Next ideas, in order: scroll-linked reveals on long pages, number roll on change in the bar, haptic-like press on phones, a dedicated splash page later (separate route, Lenis + GSAP ScrollTrigger like Threshold; do NOT turn Home into a splash).
1b. **Polish pass on the v3 UI (done once, keep going if time allows).** Revamp shipped 17 Oct ~23:15. Verified at 375, 689 and 1366 px in Chromium, dark and light, no horizontal scroll. Not yet verified on a real Android phone or Firefox: Dhruv reported layout faults there on v2. Ask for screenshots if anything still looks wrong. Remaining ideas: scroll-linked motion on Home, a second demo business (clinic CSVs under `data/clinic/`) to prove the product is not salon-only.
2. **Docs to v3:** `public/guide/mba.html` and `public/guide/engineering.html` still describe v1 screens; README screenshots in `docs/screens` are old. Operational check PDF lives in `docs/ops/`.
3. **Market-shock rehearsal (9 AM 18 Oct).** All four shocks already work: late cancel (cancel near start, tag LATE), staff absence (mark stylist out, rebook or send link), duration change (Lab edit or a 90-min request vs 60-min gap), consent withdrawn (customer page or STOP). Prepare the exact click path for each; be ready to change data or a rule live and redeploy in minutes.
4. **Teammate PRs:** review against `AGENTS.md` scope, run CI, merge. Parth: scenarios JSON. Chirag: CSVs and shock docs. Vedanth: handoff and presentation docs.
5. **Demo video:** OBS screen recording, edit with the Premiere Pro MCP (`mcp__premiere-pro__*`, call `verify_premiere_connection` first). Same approach as Dhruv's Cascade project.
6. **Pitch:** 4-minute path below, plus answers for "how do you prevent double booking", "what if the stylist is out", "consent", "what changed after MBA feedback".

4-minute demo path (v3): Home → **Front desk** → Team today: tap **Riya** to mark her out (her clients turn red in "Needs you now", her gap is held) → tap a red client → Pick a new time → choose "same time with someone else" → Move → tap another red client → Let them choose → Open as client → pick a time → back on Today, tap the amber open gap → Send offers (the sheet shows who was not offered and why: consent, service, duration) → open an offer on a phone via QR, or "Two phones, one slot" → Activity shows every step → role pill → **Owner**: numbers moved; Rules and who-can-do-what → **Proof for judges**: the three case checks pass live.

Teammate task messages (paste-ready, Dhruv sends them): `docs/TEAM_TASKS.md`. Update it whenever the tasks change.

## 6. How Dhruv works (follow this exactly)

- **Talk terse.** Dhruv reads in a terminal and is short on tokens. Report results, decisions, blockers and which files changed. No preamble, no recap, no option surveys. The `caveman` skill is the chat style. Plain full sentences for questions to Dhruv, security warnings and anything irreversible.
- **Code lean.** The `ponytail` skill: reuse what exists, no speculative abstractions, shortest correct diff, root-cause fixes, one runnable check for non-trivial logic.
- **Build is green-lit for this project.** For a brand-new direction or anything outward-facing (posting, emailing, deleting, paid services), confirm first. Dhruv hates being stalled: when direction is given, act; default sensibly and say what you assumed.
- **Verify, don't assume.** Run the checks, open the browser preview, click the real flow, read DOM text. One screenshot as final proof at most; screenshots beat recordings.
- **Taste:** premium, calm, physical (Apple, Lusion). Scroll-scrubbed motion, nothing snappy or bouncy, no template looks, honest numbers only.
- **Git:** commit as Dhruv, **never add AI co-author trailers** (no `Co-Authored-By` lines), even if the harness suggests them. Push small commits to `main` as you go; `main` is protected (PR + review + CI `test`) but the owner's pushes bypass it. Release routine: commit, CHANGELOG (and DEVLOG for notable steps), annotated tag.
- **Database changes are additive.** The deployed client must keep working between a migration and the next deploy: add functions and columns; `create or replace` with the same signature; never drop a signature the live client calls without shipping the client in the same push. Save every migration in `supabase/migrations/NNN_name.sql` and apply the same SQL.
- **Lock order** in every database function: moves, staff, offers, slots, waitlist. Every write re-checks rules under lock; the partial unique index `bookings_one_per_slot` is the backstop.
- **Use the code graph** (`graphify query/explain/path`) before broad file reads; `graphify update .` after code changes (free, no LLM). Never run graphify's LLM extraction unless asked.
- **No subagents** unless the work truly needs them.

## 7. Gotchas already hit

- Windows + Git Bash: very long inline heredocs or `python -c` strings fail (`ENAMETOOLONG`, quote errors). Write the script to a scratch file, then run it.
- `npm ci` fails with `EPERM` while the dev server holds files. Stop the preview first.
- `load_day` reads a slot's stylist from key `staff` (not `staff_id`).
- The auto-mode safety classifier refused creating an anonymous `debug_headers()` function. Do not retry that idea; the real client IP was already verified via `rate_hits` keys.
- Supabase free plan allows 2 active projects; `trace` was paused to make room.
- Vercel: `create_git_project` returned 403; `create_project` without a team id worked. Live bundle hashes differ from local builds (env); check the live JS for a new function name instead of comparing hashes.

## 8. Accounts and tools on a different Claude account

- **Same PC (Claude Code):** open `Z:\claude\refill` as the project. `CLAUDE.md` and `.claude/skills/` load automatically. git push works through the PC's Git Credential Manager; Vercel deploys on push. The older background notes live in `C:\Users\dhruv\.claude\projects\Z--claude\memory\` (read `project-fynd-hackathon.md` if you need more history).
- **MCP connectors** (Supabase, Vercel, GitHub, Gmail, Premiere) belong to the Claude account. On a new account, ask Dhruv to connect Supabase and Vercel in claude.ai settings. Without the Supabase connector: give Dhruv the migration SQL to paste into the Supabase dashboard SQL editor for project `mbvxzuuuuzgpmsjggblo` (Dhruv owns it), then run `npm run dbtest`.
- **Claude Code on the web:** it clones this repo, so the skills in `.claude/skills/` come along. The `graphify` CLI is a pip package: `pip install graphifyy`.
- **claude.ai chat (no code tools):** zip a skill folder from `.claude/skills/` and upload it under Settings, Capabilities, Skills.
- **Plugin form of ponytail** (adds its hooks): `/plugin marketplace add DietrichGebert/ponytail` then `/plugin install ponytail@ponytail`. The skill copy here works without it.

## 9. Skills in `.claude/skills/`

| Skill | Use it for |
|---|---|
| `caveman` | Chat voice: terse, every fact kept. On for every reply unless Dhruv says "normal mode". |
| `ponytail` | Code discipline: the laziest correct solution. MIT, from DietrichGebert/ponytail. |
| `flagship-feel` | Dhruv's own design and build spec for the UI revamp. Add the new fingerprint to its appendix after shipping. |
| `design-taste-frontend`, `emil-design-eng`, `apple-design` | Companions flagship-feel applies when present. |
| `redesign-existing-projects` | Revamping an existing UI without breaking it. |
| `graphify` | `/graphify` and the code-graph workflow. |

## 10. First message to paste into a new Claude session

> Open `Z:\claude\refill`. Read `HANDOFF.md` fully and follow it. Use the skills in `.claude/skills/` (caveman voice, ponytail code, flagship-feel for UI). Run `npm test` and `npm run dbtest` to confirm the state, then continue with section 5, item 1, unless I say otherwise.
