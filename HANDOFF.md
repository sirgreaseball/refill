# HANDOFF: read this first if you are a fresh Claude working for Dhruv

You are picking up a live hackathon build mid-flight. The owner (Dhruv, GitHub `sirgreaseball`) switches Claude accounts when one runs out of usage. You have no chat history; this file is the history. Read it fully, then act. Do not re-ask what is answered here.

Last updated: 17 Oct 2026, ~22:00 IST, at tag `v2.0.0` (commit after `c9084f8`).

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

## 4. What is built (v2.0.0, all live and tested)

Roles, each proven by a key the **database** checks on every call (UI hiding is not the security):
- **Owner** (`#/owner`): recovered revenue, money still open, money lost, offers, consent split, reschedules, stylist load; the rules (offer hold window, daily message cap, late cut-off, lead time; owner only); front-desk link; "see it as each person" hub; who-can-do-what matrix.
- **Front desk** (`#/`, the Desk): day book per stylist with demo clock; cancel / undo; open gaps with who fits and plain-language reasons for every skip; send offers; live offer states; QR per offer; two-phone race; waitlist with consent; evidence log with filters and CSV/JSON export; stylist in/out; **reschedule** (pick a new time, or "Let X choose" link). Owner can "View as front desk", which uses the real front-desk key.
- **Stylist** (`#/s/<ws>/<staff>/<key>`, owner preview `#/staff/<id>`): own day, first names only, "I can't come in today".
- **Customer**: sign-up `#/join/<code>` (explicit yes/no to messages, never pre-ticked), own page `#/me/<token>` (queue place, booking, consent, change or cancel, leave), offer `#/o/<uuid>` (book, decline, stop messages), move link `#/m/<uuid>` (pick a time that truly works, or cancel).
- **Lab** (`#/lab`): the three case checks live, organiser fixture, scenario files, editable input, edge toggles with before/after, live database race.
- Matching is staff-aware: a freed slot can go to anyone whose service that stylist does. Stylist absence revokes their open offers, holds their gaps, flags their customers; nothing moves until the desk or the customer chooses. Working hours (shift) bound every move and option.
- Hardening: offers hold 15 demo-minutes then lapse; max 3 offers per customer per day; rate limits per IP / day / offer; payload and text caps; 20k workspace cap, 3-day retention; table privileges revoked from the public key; append-only events; CSV formula-injection guard. Installable PWA.

Files that matter:
- `src/engine.ts` pure rules (reason order NO_CONSENT > SKILL_MISMATCH > DURATION_TOO_LONG > NOT_AVAILABLE), `src/engine.test.ts`, `tests/core-scenarios.json`, `tests/scenarios.json` (Parth's, currently `[]`).
- `src/api.ts` (types, `useBook`, role keys, `DESK_FUNCS`), `src/rpc.ts` (plain fetch to PostgREST RPC), `src/config.ts` (public URL + publishable key).
- Pages: `src/App.tsx` (routes), `Desk.tsx`, `Owner.tsx`, `Team.tsx`, `StaffView.tsx`, `Join.tsx`, `Me.tsx`, `Offer.tsx`, `Move.tsx`, `MovePicker.tsx`, `Lab.tsx`, `ui.tsx`, `styles.css`.
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

1. **UI revamp.** Dhruv thinks the current look is "AI slop". Rebuild the visual layer with the `flagship-feel` skill (plus `design-taste-frontend`, `emil-design-eng`, `apple-design`, `redesign-existing-projects`). Reference for the feel: the Trace dashboard (section 1). Keep every feature and the database contract; this is a visual and UX pass, not a rewrite of logic. Each role gets a dashboard that feels its own (front desk, owner, stylist, customer). New look must differ from every fingerprint in the flagship-feel appendix.
2. **Android/mobile bugs.** Dhruv saw UI bugs on Android Chrome; details not captured. Ask Dhruv for the list (or screenshots), and test at 360×800 and 412×915 in the browser preview. Fix inside the revamp.
3. **Market-shock rehearsal (9 AM 18 Oct).** All four shocks already work: late cancel (cancel near start, tag LATE), staff absence (mark stylist out, rebook or send link), duration change (Lab edit or a 90-min request vs 60-min gap), consent withdrawn (customer page or STOP). Prepare the exact click path for each; be ready to change data or a rule live and redeploy in minutes.
4. **Docs to v2:** `public/guide/mba.html` and `public/guide/engineering.html` still describe v1. Update README screenshots (`docs/screens`). DEVLOG entry for the MBA-driven reschedule change.
5. **Teammate PRs:** review against `AGENTS.md` scope, run CI, merge. Parth: scenarios JSON. Chirag: CSVs and shock docs. Vedanth: handoff and presentation docs.
6. **Demo video:** OBS screen recording, edit with the Premiere Pro MCP (`mcp__premiere-pro__*`, call `verify_premiere_connection` first). Same approach as Dhruv's Cascade project.
7. **Pitch:** 4-minute path below, plus answers for "how do you prevent double booking", "what if the stylist is out", "consent", "what changed after MBA feedback".

4-minute demo path that works today: Owner tab (numbers at ₹0) → Desk: mark Riya **Out** (her customers turn red, her gap is held) → tap Pooja 13:30 → Pick a new time → "13:30 with Meher" → Move → tap Varun 16:00 → Let Varun choose → Open as Varun → pick a time → back on the Desk, the log shows "by customer" → fill an open gap from the waitlist (consent skips, race) → Owner tab: numbers moved.

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
