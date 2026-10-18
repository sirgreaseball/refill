# HANDOFF: read this first if you are a fresh Claude working for Dhruv

> **NEWEST FIRST: read 0.8** (18 Oct afternoon: the film, the splash merge, sign-in v8, the team documents and the themed final deck). Everything below it is the earlier history and still true.
>
> **START HERE.** State at 18 Oct 2026, ~02:40 IST (checks: tests 51/51, build green, flowtest 14/14; migration 011 applied: booking first, server clock, settings and deletes; v7 phone pass, see the last block of 0.7). v4 redesign done on every page. v5 (real product + Try the demo) is live. Parth's Lab bugs are with his agent. Read 0.7 first. Dhruv switched Claude accounts because the old one ran out of usage. You have no chat history. This file is the history. Do not ask Dhruv to re-explain anything covered here. Read sections 0 to 9, run the checks in 0.4, then continue with 0.5, item 1. Keep this file current after every milestone (commit + push), because Dhruv may switch accounts again at any time.

## 0. The short version

### 0.1 What this is
**Refill** is an appointment-recovery app for the Fynd × NMIMS Hyderabad hackathon, case **C29 Appointment Recovery Desk**. When a client cancels, Refill offers the freed slot to the next waiting client who fits it and said yes to messages. The first to accept gets it. It never double-books and always explains why. The demo business is a salon (Kesar Salon, Jubilee Hills), but the wording is business-neutral (staff, clients).

- Live: https://fillthechair.vercel.app (every push to `main` deploys in about 1 minute).
- Repo: https://github.com/sirgreaseball/refill (public). Local: `Z:\claude\refill`.
- Database: Supabase project `mbvxzuuuuzgpmsjggblo`.
- **Hard end: 12 PM, 18 Oct 2026.** A market shock lands at 9 AM. Final pitch: 4 min demo + 3 min Q&A.

### 0.2 What is done (all live and tested)
- **v1 to v2:** the rules engine, the database guarantees (one booking per slot, consent checked at booking, rate limits), four roles proven by private keys (owner, front desk, staff, client), staff absence, working hours, rescheduling (desk picks a time, or the client gets a link and picks), owner rules, and the evidence log. `npm run dbtest` gives 20/20; `npm run race` passes.
- **v3 (17 Oct night):** information architecture rebuilt with one dashboard per role. Home is the product's own home screen, not a splash. Front desk: Today, Waitlist, Activity. Owner: Overview, Team, Rules. Every appointment action lives in one sheet. The dock is per role.
- **v3.1:** motion layer. View transitions, ambient glow, spotlight, staggered reveals, spring press, sliding dock pill, drag-to-dismiss sheet, count-up numbers, refill sweep.
- **v4 (done on every page, 18 Oct ~00:10):** the **chronograph** design language (section 0.3). Theme tokens, fonts and grain; the **Day Dial** on Home and Front desk Today; magnetic primary buttons. Then, per page:
  - Owner Overview: cancelled-value ledger strip (recovered lime, still open amber, passed unfilled ink-3) + one `SubDial` per staff member (share of shift booked, coral when out) + a six-figure offers row (`.figs`).
  - Owner Team: staff rows (out = coral avatar) and one Links group of rows (no three-card grid). Owner Rules: instrument rows with unit inputs; who-can-do-what cells carry a dot (filled yes, ring own, faint no).
  - Waitlist: consent strip + three figures; each person's free window on a 10:00–20:00 track. Activity: event rail with coloured ticks, per-filter counts; chips scroll on phones.
  - Client pages Offer / Me / Move and StaffView: `SlotDial` (in `src/Dial.tsx`) is the hero: appointments on one ring of the day dial, hand at the demo clock. Amber open, lime when booked (draws in), coral if staff is out, dashed when gone. Join: consent choice indicator, mono labels.
  - Lab: pass-count score as the loud moment, expected/actual two-column readouts, phone layout for the race row.
  - Shared: page-head h1 clamp(32px, 4.6vw, 56px); off-palette blue glow, rainbow team faces and app-icon gradients replaced with token materials. All new CSS is at the end of `src/motion.css`.
  - Verified in the browser preview at 1280 and 375 px, dark and light, no horizontal scroll; tests 51/51, build green after every page.
- **Fixes:** issue #7 (consent copy: clients who decline messages are told they will not get offers). The Modal no longer steals focus on every poll. Polls skip unchanged state.
- **Teammate PRs merged:**
  - #5 Vedanth: `docs/DEMO_SCRIPT.md`, `docs/KNOWN_LIMITS.md`, `docs/SETUP_CHECK.md`.
  - #6 Chirag: new prices (hair spa ₹1,600), 3 more waitlist clients, `docs/SHOCKS.md`.
  - #8 Parth: 12 scenarios in `tests/scenarios.json`.
  - `npm test` = **51 passing**.
- **Documents:**
  - `docs/ops/Refill-operational-check-2026-10-17.pdf` (technical status).
  - `docs/business/Refill-explained-simply.pdf` (plain-language explainer for the MBA pitch, matches Chirag's prices).
  - `docs/TEAM_TASKS.md` (paste-ready teammate messages; Dhruv sends them).

- **v8 sign-in (18 Oct):** the way in rebuilt from the best sign-in pages (Linear, Stripe, Resend, Clerk, Cal.com, Supabase): a stage with the Day Dial playing a refill loop, a focused form (switch link, show password, Caps Lock, strength sub-dial, inline errors, remembered email, desktop-only autofocus), an "or" rule to the demo and booking. `src/SignIn.tsx`, CSS at the end of `src/motion.css` (v8).
### 0.3 The design language: LOCKED. Build everything inside it.
Dhruv's standing instruction: **do not stray from this design language.** Do not add anything that does not fit the flow. You have full creative freedom *inside* it: make your own decisions without asking, and make it feel premium (Awwwards level, Apple-calm, never generic AI-SaaS). Whatever you build, build it from these pieces.

- **Concept: the chronograph.** The day is a watch face. A precision instrument with night-shift calm. Dark-first; the light theme (`[data-theme='light']`) is tuned by hand, never inverted.
- **Tokens** (`src/styles.css` `:root`):
  - Surfaces: canvas `#0a0a0c`, surface `#131316`, surface-2 `#18181c`, surface-3 `#222228`.
  - Ink: `#f4f1ea` (warm white), ink-2 `#a9a59c`, ink-3 `#6f6c66`.
  - Lines: warm white at 8% and 14%.
- **Colour has meaning; never use it as decoration:**
  - `--act` lime `#c6f24e`: you can act; also means refilled.
  - `--beat` amber `#ffb547`: an open gap (it pulses).
  - `--danger` coral `#ff5d4d`: someone needs moving, or a staff member is out.
- **Type: Satoshi** (UI and body) + **Clash Display** (h1, big numbers, `.stat-v`, `.phone-h`, `.lab-title`, sheet time) + JetBrains Mono (overlines, times, codes). Fontshare CSS is in `index.html`; `vercel.json` CSP allows Fontshare. No other fonts.
- **Shape:** concentric radius 20 / 12 / 8. White-on-dark groups sit on the canvas. Glass only on things that float: the bar, the dock, sheets, menus. Film grain at about 4%. A faint inset top highlight on raised surfaces.
- **Centerpiece:** the **Day Dial** (`src/Dial.tsx`). 10:00 to 20:00 clockwise over 300 degrees, one ring per staff member, arcs per appointment. Amber gaps pulse, lime refills draw in, coral needs moving, and a hand marks the demo clock. Every arc opens its appointment.
- **Motion** (`src/motion.tsx`, `src/motion.css`):
  - View transitions; the bar and dock persist.
  - `Glow` follows the day's mood (lime clear, amber gaps, coral risk).
  - `.spot` pointer spotlight.
  - Staggered `rise` on `.stack`, `.bento`, `.apps`.
  - Springs `--spring` and `--spring-bounce`; `Num` count-up; magnetic `.btn.is-primary` and `.role-pill`.
  - Dock sliding pill; drag-to-dismiss sheet on phones; refill sweep.
  - Everything off under reduced motion.
- **Layout patterns to reuse:**
  - `.page-head` (overline + Clash h1 + lede).
  - `.stack` of `.group` cards; `.stats` / `.stat`.
  - Home `.bento` of `.tile`; `.sheet` for item actions.
  - `.dock` per role; `.queue` / `.q-item`; `.chips`; `.seg`; `.tag` / `.code`.
  - `.btn` + `.is-primary` / `.is-quiet` / `.is-danger`.
- **Never:**
  - New accent colours, extra fonts or new radii.
  - Tailwind, component kits or heavy animation libraries.
  - Gradient-mesh heroes, emoji icons, three-equal-card grids or fake numbers.
  - Turning Home into a marketing splash. A separate splash route with Lenis + GSAP scroll work may come later, only if Dhruv asks.
- After shipping a look change, add or refresh the fingerprint line in `.claude/skills/flagship-feel/SKILL.md`'s appendix.

### 0.4 Check the state first (2 minutes)
```
cd Z:\claude\refill
git pull
npm ci          # stop any running dev server first (EPERM otherwise)
npm test        # expect 51 passing
npx tsc -b && npx vite build
npm run dbtest  # expect 20/20 against the live database
```
Preview: `.claude/launch.json` defines `refill` (Vite on port 5180). Use the browser preview to check at 1280 px and 375 px, in dark and light. Note: the preview pane pauses CSS animations and `requestAnimationFrame` while hidden, and view transitions freeze mid-fade in screenshots. Take a second screenshot before deciding anything is stuck, or inject a debug style that sets animation and transition durations to 0 (also on `::view-transition-*`). A stale `vite` process holding `node_modules` makes `npm ci` fail with EPERM: find it with `Get-CimInstance Win32_Process -Filter "name='node.exe'"` and stop it.

### 0.5 What to do next, in order
1. ~~Finish v4 on every page~~ **done 18 Oct ~00:10** (see 0.2). Polish only from here; keep features and database calls unchanged.
2. **Market-shock readiness (9 AM):** `docs/SHOCKS.md` has Chirag's click paths for late cancel, staff absence, duration change and consent withdrawal. Run each on the live site after the UI changes; fix anything that broke.
3. **Demo script:** align `docs/DEMO_SCRIPT.md` (Vedanth) with the v4 UI. Start on Home with the Day Dial, mark a staff member out, reschedule, fill an amber gap, then show Owner and Proof (`#/lab`).
4. **Docs:** `public/guide/mba.html` and `public/guide/engineering.html` still describe v1 screens. Refresh them, and the README screenshots in `docs/screens`, once the UI settles.
5. **Teammates:** keep `docs/TEAM_TASKS.md` current. Parth is testing on a real Android phone (Chrome + Firefox) and filing issues; check new GitHub issues and fix real bugs.
6. **Video:** OBS recording, edited with the Premiere Pro MCP (`verify_premiere_connection` first).
7. Refresh `docs/ops` operational check PDF before submission if Dhruv asks (re-run the checks; headless Edge `--print-to-pdf`).

### 0.7 Now (18 Oct ~00:45): v5 shipped, Parth's bugs split, what is left

**Supabase connector is connected on this account** (server id `4dc4c961-...`, project `mbvxzuuuuzgpmsjggblo`). Apply migrations with `apply_migration`, then run `npm run dbtest`. Migrations 006, 007 and 008 are applied and saved in `supabase/migrations/`.

**Parth's bug reports (#9 to #20) run in two lanes so two agents work at once without clashing.**
- **Parth's agent:** #15 to #18 (Lab) and #20 (guides). Branch `parth/lab-fixes`, files listed in `AGENTS.md`, brief in `docs/agents/parth-lab-fixes.md`. Do not edit `src/Lab.tsx`, `public/guide/*` or `src/labLogic*` until that PR is merged. When it lands: Dhruv merges, then `git pull --rebase`.
- **Claude:** #9 to #14 and #19 are fixed, pushed and auto-closed. `npm run dbtest` covers #9, #11 and #14.

**v5: a real product with a demo mode (live).**
- **Two kinds of workspace.** `workspaces.kind` is 'demo' (the sample salon, demo clock, deleted after 3 days) or 'live' (made empty by its owner, kept, real clock in India time).
  - The browser keeps each one's keys apart: `refill.desk` holds the demo, `refill.business` the live one, and `refill.mode` the current choice (`src/api.ts`: `readMode`, `setMode`, `createBusiness`).
  - Browsers that already held a demo day stay in the demo. New visitors get live mode.
- **Top bar.** Live mode shows "Try the demo". Demo mode shows "Demo · Exit" plus the demo clock. Reset exists only in the demo, and the database refuses it for live (`NOT_DEMO`) and refuses `set_clock` for live (`LIVE_CLOCK`).
- **New visitor:** `src/Setup.tsx` takes the business name, type, services (name, minutes, price) and team (hours, which services). It calls `create_business`.
- **Live clock:** the desk calls `sync_clock` on load and every minute. On a new IST date, `archive_day` moves the whole book into `history` and starts empty. Waiting clients stay.
- **Owner (`src/Manage.tsx`):**
  - Staff add, edit and remove (`save_staff`, `remove_staff`). Removal is refused while the person has clients ahead (`HAS_BOOKINGS`). It is a soft delete: `staff.active` is false and their link stops working.
  - Tasks (`add_task`, `set_task`, `remove_task`). Staff tick their own tasks on their link.
  - Services (`save_service`, `remove_service`; a demo falls back to the CSV list).
  - History page (`#/owner/history`, 4th dock item): today, then past days from `get_history`.
- **Desk:** "New appointment" on Today (`add_appointment`). A client name books the slot; no name adds open time for the waitlist. Overlaps, past times and off-shift times are refused.
- **Clients:** `#/me` lists "Your places" (every me-link on this device, `refill.places`). The Me page has a switcher and "Your past visits" (`get_my_entry.history`). Sign-up lists the business's own services and its real message cap.
- **Dial and calendar** follow the team's working hours (`dayRange` in `src/Dial.tsx`). The demo stays 10:00 to 20:00.
- **Client pages** say "synthetic demo" only on a demo (`kind` from `join_info`, `get_my_entry`, `get_offer`, `get_move`).
- Tested end to end in the browser on 18 Oct: setup, booking, open time, staff add/remove/refusal, tasks, services, history rollover (backdated the test business's `day` by SQL), client join, places, demo switch back. All checks pass: tests 51/51, dbtest 25/25, race 3/3. Test business `ffeb1f31-...` ("Bright Minds Tuition") is synthetic and can stay.

**v5.1 accounts (18 Oct ~01:30, pushed):**
- The real product needs an account. Live mode, signed out, opens `src/SignIn.tsx`: create an account or sign in with email and password. This is Supabase Auth called with plain fetch (`src/auth.ts`); the session is in `refill.session` and `rpc.ts` sends it as a Bearer token.
- After the first sign-in, Welcome asks "I run a business" or "I book appointments" (`set_profile`). Owners go to Setup, then their dashboard (`my_businesses`; the account owns the business through `workspaces.owner_user`, and `is_owner` / `role_of` accept the account or the key). Clients go to `src/ClientHome.tsx` (`my_entries`: every place joined while signed in, open offers, bookings, past visits). Sign out is in the ⋯ menu.
- "Confirm email" is **off** (done 18 Oct ~01:15; GET `/auth/v1/settings` shows `mailer_autoconfirm: true`). Any email works with no inbox step, so demos can use many Gmail addresses. `npm run dbtest` = 28/28, including a throwaway owner account.
- Tested end to end in the browser on 18 Oct:
  - Owner: sign up, choose "I run a business", set up Glow Spa, reach the dashboard. Sign out, clear the local key, sign in: the business opens from the account alone.
  - Client: sign up, choose "I book appointments", join with the code, see the place listed. The owner adds open time and sends the offer. The client's home shows it, they book it, and the home reads "You're booked".
- Also fixed: the dial's glow clipped shallow arcs flat (filter now `userSpaceOnUse`); the top bar's glass did not blur (moved from `.bar::before` onto `.bar`); theme is one tap in the top bar with Threshold's flood; the calendar has no sideways scrollbar.
- Note: `src/auth.ts` and a page called `Auth.tsx` clash on Windows (case-insensitive), hence `SignIn.tsx`.

**v6 no boxes (18 Oct ~01:45, pushed):**
- Every page puts content on the canvas, grouped by space and hairlines, the way Threshold reads. The rule set is the "v6" block at the end of `src/motion.css`.
- One tonal **stage** per page holds the centrepiece: `.today-hero`, `.ov-hero`, and Home's `.tile.is-hero`. Sections (`.group`, `.tile`) have no background, shadow or radius, only a top hairline.
- Figures are split by hairlines. Verdicts and states use a coloured left rail instead of a tinted box. The chat bubble stays because it is a message.
- Rows (queue, agenda, people, links, waitlist, history, role choices) get the pointer spotlight (`GLOW` in `src/motion.tsx`).
- Glass is only on what floats: bar, dock, sheets, menus, toasts.
- Keep this when adding pages: no new panels around sections.

**18 Oct ~01:55 (this account):** demo script rewritten (`docs/DEMO_SCRIPT.md`) and the full demo path rehearsed on the live site; every step matched. Found and fixed (13255ed): page and theme changes went only through `startViewTransition`, so in a window that cannot paint (hidden, minimised, captured off-screen, the preview pane) the route stayed stuck until reload. Both now apply after 350-400 ms either way. Note: the race winner books their own service, so the recovered figure is that client's price (Meera ₹1,600 or Sameer ₹750).

**18 Oct ~02:30 (this account): marketplace first step + account actions (migration 010, applied).**
- `workspaces.listed` (default true; only `kind='live'` ever shows). `directory(p_q)` is public: name, type, join code, staff count, waiting count, up to 6 services; never a client's name. Search matches name, type or a service name. Owner toggles it in Owner > Team > Links (`set_listed`, owner only).
- Clients find places in `src/Directory.tsx`: `DirectoryList` on the signed-in client home, and the public page `#/places` (linked from the sign-in page). Tapping a place opens its `#/join/<code>`.
- Signed-in clients act from their home for any linked place: `my_entry_move` (change or cancel: opens the move link), `my_entry_leave`, `my_entry_consent`. `claim_entries(tokens)` attaches places joined on this device before signing in (`refill.places`), called on client-home mount.
- Fixed in `src/ClientHome.tsx`: a cancelled booking said "You left this list"; a booking whose staff member is out now shows it with "Pick a new time".
- `npm run flowtest` (`scripts/flow-test.ts`): 9 cross-role checks with keys and a client token, no accounts: join reaches owner, desk offer reaches client, booking reaches owner, staff out reaches client, client move, tasks owner to staff and back, desk cancel reaches client, consent both ways, demo never listed. All pass.
- `npm run dbtest` now unlists its throwaway "Test Tutors" business (6 old ones unlisted by SQL).
- **Safety rule for Claude:** Claude must not create accounts or type passwords on the hosted Supabase Auth itself. Account flows are tested by Dhruv with the test accounts in `docs/TEST_ACCOUNTS.md`; everything else is tested by script. Avoid running `npm run dbtest` yourself: its section 12 signs up a throwaway account.

**18 Oct ~02:40 (this account): v7, booking first, server clock, settings (migration 011, applied).** Dhruv's list, all done and pushed:
- **Booking first.** The counter code / link (`#/join/<code>`, `src/Join.tsx`) now opens **Book a time today**: pick a service, today's open times show as chips (`open_times`: empty time in the shift of someone who is in and does it, plus cancelled slots nobody holds an offer for, shown amber). **Book** calls `book_time` (locks the staff row; a cancelled slot is booked as is and counts as recovered; event `SELF_BOOKED`). Nothing open: **Join the waitlist** (the old form, consent choice) or **Not now**. A slot with a live offer is never sold to a walk-in.
- **Desk books someone already waiting.** New appointment has a **Who** select of waiting clients; `add_appointment` takes `entry`, books it as theirs (their page and account show it) and withdraws their open offers. Root cause of Dhruv's "booked but I can't see it": desk appointments typed by name were never linked to any client.
- **"No offer on the client side":** the data showed the offers did arrive (W2 at Gaming Parlor), but the client's page put them below the dial, off a phone screen. The open offer is now the first thing on `#/me/<token>` (and the tab title says so). Entries joined while signed out have no account link; they attach on sign-in (`claim_entries`).
- **Clock.** pg_cron job `refill-live-clock` runs `tick_live()` every minute: every live business is on India time even with no desk open (also closes a past day). The bar's live clock ticks on the device on the minute (`LiveClock`, `onEveryMinute` in `src/App.tsx`). The demo clock: tap the time to open the phone's own time picker, ±15 min on wider screens, and **Now** follows the real time (stored in `refill.realTime`; must be off for the demo script).
- **Front desk Today** opens on the **Calendar** (lanes per person); **Dial** is the second toggle (`refill.dayView2`). On a phone the calendar scrolls sideways (960 px wide) with names pinned left, opening at the current time. The phone-only agenda list is gone. A colour key (open, refilled, needs moving, booked) sits above both views.
- **Dial.** Names are set along each ring in the 60-degree gap at the bottom (`textPath`), truncated to fit, so they never collide with arcs or leave the face. Each ring shows the person's working hours as a brighter band.
- **No staff.** Setup's **Who does it** is **Just me** (default: the owner is the one person, all services, their hours) or **Me and a team**.
- **Profile menu** replaces the ⋯ menu: round initial button, head with name and email, Settings, theme (phones only; the bar hides its theme button under 520 px), Open on my phone, Install, Reset demo day, Sign out. **Settings** (`#/settings`, `src/Settings.tsx`): business name and type (`update_business`), directory listing (moved here from Team > Links), your name (`set_profile`), sign out, **Delete this business** (type its name; `delete_business`, live only, cascades everything) and **Delete my account** (`delete_account`; an owner must delete their business first).
- **Glass blur (bar, dock), real cause.** The production CSS minifier (Vite 8, lightningcss) merged `backdrop-filter` plus `-webkit-backdrop-filter` into the `-webkit-` one only, which Chrome and Firefox ignore, so the live site never blurred (dev builds did, which hid it). Write only the standard `backdrop-filter`; the build adds the prefix itself. Check with `grep backdrop-filter dist/assets/*.css` after a build. The bar and dock also dropped their view-transition names.
- **Phones.** Menus open full width under the bar and scroll, never off screen. Sign-in: the form comes first on phones, the story under it; the tab opens on **Sign in** if this device made an account before. Checked with Playwright at 360, 390 and 1280: no sideways scroll on 11 routes, no console errors.
- **Client and staff pages on desktop** (Join, Me, Offer, Move, StaffView, ClientHome, Directory, Places): each page groups its children in `.phone-lead` (who, when, the dial) and `.phone-body` (actions, lists). Both are `display: contents` on phones, so the phone layout is untouched; at 960 px and wider the page becomes two columns with the lead sticky on the left. New phone pages should use the same two wrappers.
- **Dropdowns** are the app's own `Select` (`src/ui.tsx`): a field with the value and a quiet mono hint (length, price, hours), opening a menu with a check on the chosen one; keyboard works (arrows, Enter, Escape, first letter); opens upward near the bottom of the screen. Used everywhere except the Lab's case picker (Parth's file, not merged), which gets `appearance: base-select` styling where Chrome supports it. Do not add a native `<select>`.
- **Booking times** (Join) read as an hour-by-hour face: one row per hour, the quarter hours in fixed columns, so a gap in a row is a time already taken; amber outline = a cancelled time back on offer; staff choice is chips.
- `npm run flowtest` = 14 checks (new: self-booking reaches the owner, no double booking, a gap with an offer out is held, desk books a waiting client, rename/delete guards).

**Splash (another Claude account, 18 Oct ~03:15):** the story page at the real path `/splash` (GSAP + Lenis, the Day Dial as art; a `vercel.json` rewrite serves it) is being built on branch `splash` in the worktree `Z:\claude\refill-splash`, brief in `docs/agents/splash-brief.md`. Do not edit `src/story/**`; it arrives as a pull request that Dhruv merges.

**Known limits (say them honestly if asked):**
- A live book holds one day: clients book today's times only, no future dates yet.
- Staff and front desk use private links, not accounts.
- No admin console yet.
- No real SMS/WhatsApp yet: offers appear on the client's page and account.

**Still to do, in order:**
1. Market-shock rehearsal (0.5 item 2) on the **demo**, after these changes.
2. ~~`docs/DEMO_SCRIPT.md`~~ **rewritten 18 Oct ~01:40** for accounts + Try the demo + v6 UI: sign-in page, real desk, demo Home dial, Harsh late cancel (case checks 1 and 3), two phones (case check 2), Arjun out with Manav moved and Kunal's link (MBA change), Owner, Lab live race. Labels verified against source; Q&A rewritten and honest about limits.
3. Admin console for the team (business-level data and feedback only, never client data). It needs an admin key table and a feedback table.
4. Dates on appointments (future booking, true multi-day history). Cross-device client accounts.

### 0.8 Now (18 Oct ~13:00): film, splash, sign-in v8, team documents, final deck
Everything here was done in one Claude session after the hackathon build. App checks after it: `npm test` 51/51, build green. Everything below is committed (the deck, the brief, their sources and the `video/` project source).

**1. The product film (done, uploaded).**
- A 3:29 narrated motion-graphics film of Refill, 1080p 60 fps, in the chronograph language. Remotion project in `video/` (source committed; `video/.gitignore` keeps out `node_modules`, `out`, `.env` and the 86 MB of generated audio in `public/vo`, `public/sfx`, `public/music`, which stays on Dhruv's PC).
- Flow: case brief, pain, solution and logo, front desk, client, two-phone race, staff, owner, features, USP (rules live in the database), Lab proof, business and pilot, end card.
- Voice: ElevenLabs free tier, premade voice **Sarah** (`EXAVITQu4vr4xnSDxMaL`), model `eleven_multilingual_v2`. The free tier cannot use Voice Library voices through the API (402 `paid_plan_required`). The key is in `video/.env` (gitignored). A full pass used about 1,700 of 10,000 credits.
- Timing is driven by the voice: `video/src/data/scenes.json` + `video/src/data/vo.json`; animations key to spoken words with `at(sc, line, word)`. Sound effects (`tools/sfx.py`, 29 sounds) and the music bed (`tools/music.py`) are synthesised, so there are no licence issues. Pipeline and commands: `video/README.md`.
- Output: `video/out/Refill.mp4` (mastered to -14 LUFS). Uploaded **unlisted** to Dhruv's channel SirGreaseball: https://youtu.be/5BfsKofkIHw, with title, description, 11 chapters, tags, English captions (`video/out/youtube/refill.en.srt`) and a custom thumbnail. The upload kit is in `video/out/youtube/`.

**2. Splash merged.** Chirag's `/splash` story page (PR #22) was reviewed locally (desktop, phone, no console errors, GSAP/Lenis only in its own chunk), then approved and merged by Dhruv. Live at https://fillthechair.vercel.app/splash.

**3. Sign-in page v8 (commit `e5daa23`, live).** Rebuilt after studying Linear, Stripe, Resend, Clerk, Cal.com and Supabase sign-in pages. Details are in 0.2 and in `src/SignIn.tsx` plus the v8 block at the end of `src/motion.css`. Not added: Google sign-in and "forgot password" (they need a Supabase OAuth app and SMTP).

**4. Team documents (commit `428c477`, in `docs/team/`).**
- `Refill-BTech-Master.pdf/.docx` (28 pages): architecture, stack, repository map, rules engine and algorithms, database (security model, tables, indexes, locking, offers, rate limits, clocks, migrations, all 83 functions), frontend, tests, deployment, status, codes, Q&A.
- `Refill-MBA-Master.pdf/.docx` (25 pages): problem, product in plain words, personas, customer value, competitors, pricing and cost hypotheses (marked as assumptions), first-customer path, growth experiment, negotiated change, 30-day pilot, evidence vs assumptions, risks, pitch kit.
- Sources: `docs/team/source/` (`btech.js`, `mba.js`, `lib.js`, figures). Rebuild: `npm i docx@9` there, `node btech.js && node mba.js`, then `topdf.ps1` (Windows + Word fills the contents page and exports PDFs). Figures come from `video/tools/docfigs.mjs` (diagrams in `video/src/doc/Diagrams.tsx`).

**5. Final presentation deck (done, committed).**
- `docs/team/Refill-Final-Deck.pptx` (+ `.pdf` preview): the MBA team's `REFILL_Deck.pptx` (from Dhruv's Downloads) rebuilt in Refill's dark chronograph theme, 7 slides. `Refill-Final-Deck-Light.pptx/.pdf` is the same deck in the app's light theme (paper #f4f2ed, ink #121214, act #3f6b00).
- Slide 1 is new: a splash-style cover ("Every cancelled appointment, filled again.", the Day Dial) with the team: **Team C29** (placeholder name, Dhruv to confirm); B.Tech led by **Vedanth Raj (team lead)**, with Dhruv Sonar, Parth Kachhara, Chirag Seervi; MBA **Parth Srivastava, Tushar Walia**.
- Changes Dhruv asked for: slide 3 (STP) keeps the psychographic insight, STP and beachhead but has **two** versatile personas (business side, client side) instead of three salon ones, each with an icon badge top right (business: person in suit and tie; client: person with a tick, the opted-in yes); slide 4 has five concrete, built features with proof chips; slide 5 (onboarding + a day) matches the real app flow, with real screens; slide 6 (pricing) uses the WHY text from Dhruv's screenshot and general-terms unit economics; slide 7 keeps GTM weeks 1–4 and the projections table, shortens the north-star KPIs, and adds **risk mitigation on the three star features**; the projections label is plain "Financial projections" (Dhruv asked to drop "illustrative — revised model"). All other content is the MBA team's, unchanged. Speaker notes on every slide; slide 7's notes carry the projection reasoning.
- `docs/team/Refill-Financial-Projections-Brief.pdf/.docx` (11 pages): how every number on the projections slide is built (₹699 × average locations × 12; COGS ₹100; break-even 209 / 682 locations), why the location counts and OpEx, value to the owner, sensitivities (₹499 / ₹999 / slower adoption) and sourced market facts. For the MBA presenter.
- Sources: `docs/team/source/deck/` (`build.js` with pptxgenjs, `finalize.ps1`, `art/`) and `docs/team/source/fin.js`. Rebuild the deck: `npm i pptxgenjs@3.12.0` in that folder, `node build.js` (dark) and `node build.js --light`, then `finalize.ps1` for dark and `finalize.ps1 -Raw refill-deck-light-raw.pptx -Out <...>\Refill-Final-Deck-Light.pptx -Png png-light` for light (PowerPoint embeds the fonts, exports PNGs and the PDF). Art (both themes) comes from `video/tools/deckart.mjs`.
- **Fonts:** the deck uses Clash Display, Satoshi and JetBrains Mono. They were installed for Dhruv's Windows user only (`%LOCALAPPDATA%\Microsoft\Windows\Fonts` + HKCU registry) and are embedded in the .pptx for the characters already used. If someone types new text on a laptop without them, PowerPoint substitutes; fix in PowerPoint with File → Options → Save → "Embed all characters", then save.

**Open items:** confirm the team name on the cover; Dhruv may ask for more slide changes (keep content edits to what he names); the market-shock rehearsal in `docs/SHOCKS.md` is still not timed on live.

### 0.6 Tools on the new account
- **Same PC, Claude Code:** open `Z:\claude\refill`. `CLAUDE.md` and `.claude/skills/` load by themselves.
  - Git push works through the PC's credential manager.
  - `gh` CLI is logged in as `sirgreaseball`. In bash it may not be on PATH; use PowerShell `& "C:\Program Files\GitHub CLI\gh.exe"`.
  - Vercel deploys on push; no connector needed.
- **Supabase connector:** needed only to change the database (new migrations). Without it, give Dhruv the SQL to paste into the Supabase dashboard's SQL editor.
- **Vercel connector:** optional, for deploy logs.
- **Merging PRs:** auto-mode refuses admin merges without review. Ask Dhruv to click Merge, then `git pull --rebase` before pushing.

---

## 1. Where things are (reference; section 0 wins if anything disagrees)

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
