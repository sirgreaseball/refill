# Brief: the Refill splash (the story page)

You are a Claude working for Dhruv on a **different account** from the Claude that builds the Refill app. That session is still active in this repo. Your job is one thing: **build the splash at `/splash`** (live: https://fillthechair.vercel.app/splash). It is a cinematic, scroll-driven story page that sells Refill in under a minute and hands the visitor into the product. Read this whole file before writing code. Do not ask Dhruv to re-explain anything that is in this brief.

---

## 0. Master prompt (what Dhruv pastes to start you)

```
You're building the splash page for Refill, Dhruv's hackathon app. It lives at its own address: https://fillthechair.vercel.app/splash (a real path, not a hash route). Repo: Z:\claude\refill (github.com/sirgreaseball/refill).

Read docs/agents/splash-brief.md first, all of it. Then read HANDOFF.md section 0.3 (the locked design language) and .claude/skills/flagship-feel/SKILL.md (the build spec). Ignore HANDOFF's task list: another Claude session owns the app and is working in that folder right now.

The job: a cinematic, scroll-scrubbed story page at /splash, built with GSAP + ScrollTrigger + Lenis. The Day Dial (src/Dial.tsx) is the hero, rendered as art, and everything reacts to the cursor. Use the app's chronograph theme: its tokens, its three fonts, and colour only where it means something. Study Dhruv's own splash pages for technique: Threshold, Sandbox and Cascade (paths and live links are in the brief). Use lusion.co and Awwwards Sites of the Day for feel. Show only true numbers from the repo's sample data.

Plumbing (the brief has exact code):
- App.tsx switches on location.pathname === '/splash' to a lazy src/story/Story.tsx.
- vercel.json gets a rewrite for /splash and leaves the CSP untouched.
- SignIn.tsx gets a "See how Refill works" link to /splash.
- GSAP and Lenis are imported only inside src/story/, so the app bundle does not grow.

Work rules:
- Work only in your own worktree: git worktree add ..\refill-splash -b splash origin/main.
- Touch only the files the brief lists.
- Push the branch often and share its Vercel preview URL with /splash on the end.
- Open a pull request when the checks in section 7 pass. Dhruv merges it; never push to main.
- No AI co-author trailers in commits.
- Never create accounts or run npm run dbtest.

How to work:
- Build the plain working version first with real content, then polish in passes.
- Screenshot at 1440, 1280, 820 and 390 px, in dark and light, with reduced motion; check frame times while scrolling.
- Keep the brief's Progress section current after each milestone.
- Talk tersely and show screenshots.
```

## 1. What Refill is (the story you are telling)

**Refill** is an appointment-recovery desk, built for the Fynd × NMIMS Hyderabad hackathon (case **C29, Appointment Recovery Desk**).

- When a client cancels, Refill offers the freed time to the next person on the waitlist who fits it (service length, staff skill, their free window) **and** said yes to messages. The first to accept gets it.
- It never double-books, because the database decides who got the slot, once.
- Every decision is explained: who was offered, who was not, and why.
- It handles the messy day too:
  - A staff member who can't come in turns their clients coral ("needs moving").
  - Clients pick a new time from a link.
  - The owner sees what was recovered.
- Clients scan a code at the counter and **book an open time first**. When nothing fits, they join the waitlist.
- **Places:**
  - Live: https://fillthechair.vercel.app. A push to `main` deploys in about a minute.
  - Repo: https://github.com/sirgreaseball/refill (public). Local copy: `Z:\claude\refill`.
- **The hackathon ends at 12:00 IST on 18 Oct 2026.** The final pitch is a 4-minute demo plus 3 minutes of Q&A. The splash is the first thing judges will see.

**Get the facts right.** Read `docs/DEMO_SCRIPT.md` for the verified story beats and numbers:
- Harsh's 12:00 hair spa is cancelled late, so ₹1,600 is at stake.
- Arnav is never contacted because he never agreed to messages.
- Two phones tap at once and one wins.
- Arjun is out, so Manav is moved to 16:30 with Riya.

Use the sample day's real data, not invented numbers. Both of these are real:
- `demoDay()` in `src/day.ts` reads `data/salon/*.csv`.
- The rules engine is `src/engine.ts`.

## 2. The look: the chronograph (LOCKED)

Dhruv's standing rule: **do not stray from this design language.** You have full creative freedom *inside* it. Read `HANDOFF.md` section **0.3** for the full spec. The essentials:

- **Concept.** The day is a watch face: a precision instrument with a night-shift calm. Dark-first. The light theme (`:root[data-theme='light']`) is tuned by hand, never inverted.
- **Tokens.** These live in `src/styles.css` `:root`; use the variables, never raw hex.
  - Canvas `#0a0a0c`, surfaces `#131316` / `#18181c` / `#222228`.
  - Ink `#f4f1ea`, `--ink-2`, `--ink-3`.
  - Hairlines are warm white at 8% and 14%.
- **Colour has meaning; never use it as decoration.**
  - `--act` lime `#c6f24e` means "you can act" and "refilled".
  - `--beat` amber `#ffb547` means "an open gap" and it pulses.
  - `--danger` coral `#ff5d4d` means "needs moving" or "staff out".
  - No new accent colours.
- **Type.**
  - **Clash Display** for display type and big numbers.
  - **Satoshi** for UI and body.
  - **JetBrains Mono** for overlines, times and codes.
  - These fonts are already loaded in `index.html`. No other fonts.
- **Shape.** Radii are 20 / 12 / 8. Film grain at about 4% is already on `body::after`. Glass appears only on things that float.
- **v6 rule: no boxes.** Content sits on the canvas, grouped by space and hairlines, with one tonal stage at most per section. No card grids. No three equal feature cards.
- **The centrepiece is the Day Dial** (`src/Dial.tsx`).
  - 10:00 to 20:00 runs clockwise over 300 degrees, with one ring per staff member and an arc per appointment.
  - Amber gaps pulse, lime refills draw themselves in, coral needs moving, and a hand marks the clock.
  - Each person's name runs along their ring in the gap at the bottom, and the brighter band is their working hours.
  - **The splash's hero should be this dial, rendered as art.** It can be SVG, canvas or WebGL, as long as it holds 60 fps.
  - Simplified, the dial is the logo: `Mark` in `src/ui.tsx`. The loader can assemble the mark.
- **Never:**
  - Gradient-mesh heroes, purple glows, emoji icons or stock illustration.
  - Tailwind or component kits.
  - Fake metrics.
  - Glass on everything.
  - Bouncy chrome.
  - Scroll-jacking or snapping.

**Read `.claude/skills/flagship-feel/SKILL.md` in this repo and follow it as the build spec.** It holds:
- the feeling: calm, physical, certain, alive, honest;
- scroll as a scrubber, never a trigger;
- the cursor-reactive rules;
- the starting numbers (Lenis `lerp: 0.085`, `wheelMultiplier: 0.9`, ScrollTrigger `scrub: 0.5–0.8`, `expo.out` for rare reveals);
- the "never" list.

When you ship, add Refill's splash fingerprint to its appendix.

## 3. References (study them; don't copy their colours)

Dhruv built three splash pages in this style. Open them live, read their code, and take the techniques. **The palette, type and metaphor must be Refill's.**

| Project | Live | Code to read | Take from it |
|---|---|---|---|
| **Threshold** | https://stayabove.vercel.app | `Z:\claude\playing-with-ai\threshold\src\landing.js` (the scroll story), `liquid.js` (waves that cut and invert the text at the boundary), `magnet.js` (magnetic buttons), `story.js`, `wheel.js` | A liquid level against one line, with text inverting where the line passes behind it. Held beats: the visual holds still while you read, then moves between beats. A HUD whose progress bar is the scroll. On phones, the copy holds in place instead of sliding. A theme switch that floods out from the button. |
| **Sandbox** | https://sandbox-os.vercel.app | `Z:\claude\os proj\team15_dashboard\landing\landing.js`, plus `landing/gl/` (WebGL) and `vendor/` (gsap, ScrollTrigger, SplitText, lenis) | One WebGL object that changes formation each chapter, with clean sweeps and no chaos. A loader that boots the logo, one dot per share of real progress. SplitText line reveals. |
| **Cascade** | https://trycascade.vercel.app | `Z:\cascade\frontend\src\components\` (`Preloader.tsx`, `SmoothScroll.tsx`, `sections/Hero.tsx`, `Manifesto.tsx`, `Metrics.tsx`, `Features.tsx`, `FinalCTA.tsx`, `canvas/LiquidBlob.tsx`, `canvas/TerrainInundation.tsx`) | A React structure for a GSAP + Lenis story: the smooth-scroll provider, the preloader, a metrics row that counts up, and the final CTA. Closest in stack to Refill, so it is the best code to borrow. |
| **Outside** | https://lusion.co, Apple product pages, Awwwards Sites of the Day | | The feel: a cursor that visibly drives the scene, scrubbed scroll, one loud moment, film-quality restraint. |

## 4. What to build

**The splash lives at its own address: `https://fillthechair.vercel.app/splash`** (locally `http://localhost:<port>/splash`). It is a real path, not a hash route. It is linked from the sign-in page ("See how Refill works") and is the pitch opener.
- Do **not** replace `/` or `#/`. Dhruv asked that the first thing on the app is sign-in, especially on phones.
- Whether the splash later becomes the root is his call, so ask before changing it.

**Suggested chapters.** Each holds while you read and morphs between beats. The dial carries every beat.

1. **Loader.** The `Mark` assembles while fonts and first frames really load, never on a timer. It shows once per session and leaves with a decisive wipe.
2. **Hero.** "Every cancelled appointment, filled again." Then a small line: Refill, appointment recovery desk.
   - The Day Dial fills the stage and its hand sweeps slowly; that is the breath.
   - The pointer gently disturbs the rings, and dragging turns the dial with momentum.
   - Hovering the headline lights the matching arc.
3. **The gap.** One arc goes amber and pulses: Harsh cancels his 12:00 hair spa at late notice. The rupee figure at stake counts up to ₹1,600 as you scroll, scrubbed.
4. **Who fits.** The waitlist appears as marks around the dial. Each one that does not fit drops away with its reason in mono: no consent (Arnav), too long for the gap, outside their window. The ones that fit light lime.
5. **The race.** Two phones tap at the same instant and one booking lands. The line: "never double-booked: the database decides, once."
6. **Staff out.** A ring turns coral, then its appointment slides to a new time with someone else (Manav to 16:30 with Riya).
7. **Proof.** One row of three or four large, true numbers with small labels. For example: recovered today from the sample day (computed with the engine), 51 rule tests, 14 live cross-role checks, 0 double bookings in the race test. Every figure must be traceable to the repo.
8. **Ending.** Two buttons: **Open Refill** (`location.assign('/#/')`) and **Try the demo**. **Try the demo** must open the sample day the same way the app's "Try the demo" button does: `localStorage.setItem('refill.mode', 'demo')` inside try/catch, then `location.assign('/#/')`. Both leave `/splash` for the root path, so the app loads fresh.

**Everything reacts to the cursor, on fine pointers only:**
- magnetic primary buttons that lean 1.5–3 px;
- a soft spotlight;
- the dial responding to the pointer;
- a press that shrinks to 0.97;
- hovers that resolve in under 0.2 s.

On touch screens, none of this should get stuck.

## 5. How to build it (stack and plumbing)

- **Stack.** The app is Vite 8, React 19 and TypeScript, using hash routing (`#/desk`, `#/join/<code>` and so on). Routes are in the `Routes` function in `src/App.tsx`. Pages that render without the app bar (for example `#/places`) are lazy imports, matched before the `Shell`. The splash is the one page on a real path, `/splash`.
- **Add exactly this to the app:**
  - In `src/App.tsx`:
    - One lazy import: `const Story = lazy(fresh(() => import('./story/Story')))`.
    - Rename today's `App` body (the `useRoute` call and `<Routes>`) to `HashApp`, and make `App` choose by path. The path never changes without a full page load, so the hook order stays stable:
      ```tsx
      export default function App() {
        if (location.pathname.replace(/\/+$/, '') === '/splash') return <Boundary><Suspense fallback={phoneWait}><Story /></Suspense></Boundary>
        return <HashApp />
      }
      ```
  - In `vercel.json`, add a rewrite so a refresh or a shared link to `/splash` serves the app:
    - `"rewrites": [{ "source": "/splash", "destination": "/index.html" }, { "source": "/splash/", "destination": "/index.html" }]`
    - Keep the existing `headers` block, including the CSP, exactly as it is.
    - Vite's dev and preview servers already fall back to `index.html`, so `/splash` works locally without this.
    - The service worker (`public/sw.js`) fetches pages from the network first, so it needs no change.
  - In `src/SignIn.tsx`, one link: `<a className="link" href="/splash">See how Refill works</a>`.
  - Everything else goes in **new files under `src/story/`**, including the splash's own CSS file, imported from `Story.tsx`.
- **Links out of the splash** go to the root path with a hash (`/#/`, `/#/places`), never a bare `#/...`, because the splash is not on `/`.
- **Dependencies.** `npm i gsap@^3.15.0 lenis@^1.3.26`, the same versions Cascade and Threshold use. All GSAP plugins, including ScrollTrigger and SplitText, are free and in the npm package. **Import them only inside `src/story/`**, so they land in the story's lazy chunk and the app's main bundle does not grow. Check this after a build: `ls -la dist/assets`.
- **CSP.** `vercel.json` allows only `script-src 'self'`. Bundle everything; no CDN scripts and no inline scripts. WebGL and canvas are fine. Leave the CSP alone unless something truly needs it, and say why if it does.
- **Lenis + ScrollTrigger in a single-page app.** This is the classic bug.
  - Create Lenis on mount with `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add((t) => lenis.raf(t * 1000))` and `gsap.ticker.lagSmoothing(0)`.
  - On unmount, call `lenis.destroy()`, kill every ScrollTrigger and timeline you made (`gsap.context(...).revert()`), and remove the ticker callback.
  - Links out of `/splash` load the app fresh, so a leak there would mostly clear itself, but clean up anyway: hot reload and the back/forward cache keep the page alive. A leak shows as stuck scrolling and `lenis` classes left on `<html>`.
- **Route changes.** The app's route-change handler already scrolls to the top and cross-fades with a view transition (`useRoute` in `App.tsx`). Do not fight it.
- **Reduced motion.** Turn Lenis off, show still frames of the same scenes, and keep all the content. Honour `prefers-reduced-transparency`.
- **Phones.** Recompose for phones; don't shrink the desktop layout.
  - Use `svh`/`dvh` units and safe-area insets.
  - On phones the copy holds in place and dissolves, as in Threshold.
  - No horizontal scroll.
  - Inputs are 16 px or larger.
- **Performance.** Hold 60 fps while scrolling on a modest laptop:
  - animate only transform, opacity and clip-path;
  - stop rendering offscreen canvases;
  - if you use WebGL, lower the DPR on weak devices by measuring frame times;
  - aim for a mobile Lighthouse score of 90 or more.

## 6. Where to work (so you don't collide with the app session)

The app session edits `src/**`, `HANDOFF.md` and `docs/**` all the time. Never work in the same working tree as it.

```
cd Z:\claude\refill
git fetch
git worktree add ..\refill-splash -b splash origin/main
cd ..\refill-splash
npm ci
```

- Work only in `Z:\claude\refill-splash` on branch `splash`.
- Commit small and often, and **push the branch** (`git push -u origin splash`). Vercel gives every pushed branch a preview URL; share that with Dhruv.
- Touch only:
  - `src/story/**`;
  - the lazy import and the `/splash` check in `src/App.tsx`;
  - the one link in `src/SignIn.tsx`;
  - the `rewrites` entry in `vercel.json`;
  - `package.json` / `package-lock.json` for the two dependencies;
  - this brief's **Progress** section below.
- When it is ready:
  1. `git fetch && git rebase origin/main`.
  2. Run the checks in section 7.
  3. Open a pull request into `main` with `gh pr create`.
  4. Dhruv merges it. Do not push to `main` yourself.
- After it is merged, add one line to `HANDOFF.md` section 0.7 about the splash.

## 7. Checks before you call it done

- `npm test` shows 51 passing, and `npx tsc -b && npx vite build` is green.
- After the build, the main `index-*.js` is about the same size as on `main` (about 274 kB). GSAP and Lenis appear only in the story chunk.
- Browser screenshots, using the Playwright MCP or the browser pane:
  - widths 1440, 1280, 820 and 390;
  - dark and light themes;
  - reduced motion on.
- No console errors, and no horizontal scroll at any width.
- `/splash` and `/splash/` load on the branch's Vercel preview URL, including after a hard refresh. A refresh is the check that the rewrite works.
- `/` still opens the app as before, with sign-in first on phones.
- Go from `/splash` to sign-in to **Try the demo** to the front desk: the desk scrolls normally, and `<html>` keeps no `lenis` classes.
- Frame times while scrolling, sampled with `performance.now()` in a `requestAnimationFrame` loop. Report the 95th percentile.
- Every number on the page traces to the repo: name the file or script in a code comment.

## 8. How Dhruv works (follow this)

- **Chat.** Talk tersely: report results, decisions, blockers and which files changed. Show work with screenshots, not recordings. Verify yourself; never ask Dhruv to check something by hand.
- **Commits.**
  - Commit and push often.
  - **Never add AI co-author trailers** (`Co-Authored-By`).
  - Write clear commit messages in plain sentences.
- **Taste.** Premium, in the Lusion / Apple way: scroll-scrubbed motion and cursor-driven scenes, nothing snappy, nothing generic. When in doubt, ask whether a change makes the page calmer, more physical and more certain; if it doesn't, cut it.
- **Never:**
  - Create accounts or type passwords on the hosted Supabase Auth.
  - Run `npm run dbtest`; it signs up a throwaway account.
  - The splash needs no database at all.
- **Messages to teammates.** Never message teammates yourself. If something needs one, write the message in chat for Dhruv to send.

## 9. Progress (keep this section current; Dhruv may switch accounts at any time)

- **18 Oct ~04:30 IST, plain version working.** Branch `splash`, worktree `C:\Projectsefillefill-splash` (this session runs on a different PC from `Z:`; the branch on GitHub is the source of truth).
  - Files: `src/story/` (`Story.tsx` page, loader, proof, ending, still frames; `StoryDial.tsx` the dial as layered SVG; `scenes.ts` the scroll timeline and still states; `facts.ts` every number, computed from `dayPayload()`/`demoDay()` with the engine; `geo.ts`; `pointer.ts` cursor effects; `story.css`), the `/splash` switch in `src/App.tsx`, the link in `src/SignIn.tsx`, the `rewrites` in `vercel.json`, `gsap` 3.15.0 + `lenis` 1.3.27.
  - Checks: tests 51/51, `tsc -b` and `vite build` green; main `index-*.js` 274.5 kB (unchanged), GSAP and Lenis only in `Story-*.js` (167 kB, 61 kB gzip).
  - Next: light theme, 1280/820/390 and reduced-motion passes, the loader, frame times, then the pull request.
