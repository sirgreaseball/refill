# Task for Parth's coding agent: fix the Lab and guide bugs (#15, #16, #17, #18, #20)

You are a coding agent working for Parth Kachhara (`parthkachhara`) on the Refill repository
(https://github.com/sirgreaseball/refill). Another agent (Claude, working for the owner Dhruv) is
changing other parts of the app at the same time. You work in a separate lane: separate files and a
separate branch. That is what keeps the two of you from clashing. Stay inside your lane.

## 0. Before anything else

1. Read `AGENTS.md` in full. Your row in its ownership table is "Parth Kachhara (lab fixes)".
2. Clone or update the repository, then create your branch from the latest `main`:
   ```
   git fetch origin
   git switch -c parth/lab-fixes origin/main
   npm ci
   npm test
   ```
   `npm test` must pass before you change anything. If it fails, stop and report.

## 1. Your lane: the only files you may create or edit

- `src/Lab.tsx`
- `src/labLogic.ts` (new: move the Lab's pure parsing and evaluation helpers here)
- `src/labLogic.test.ts` (new: tests for those helpers)
- `src/lab.css` (new, only if you need styles; import it at the top of `src/Lab.tsx`)
- `public/guide/mba.html`, `public/guide/engineering.html`
- `tests/scenarios.json`, `docs/contributions/parth.md`

Everything else is read-only for you. In particular, never edit:

- `src/engine.ts`. The front desk uses it too. If a fix seems to need an engine change, write the
  logic in `src/labLogic.ts` instead. If that is impossible, stop and describe the change needed in
  the pull request.
- `src/styles.css`, `src/motion.css`, `src/App.tsx`, `src/ui.tsx`, anything in `src/desk/`,
  `supabase/`, `scripts/`, `package.json`, `package-lock.json`, `.github/`.

Never run database, migration or deploy commands. The Lab runs entirely in the browser.

## 2. The issues to fix

Each issue has exact reproduction steps and inputs. Read each one with
`gh issue view <n> --repo sirgreaseball/refill`.

- **#16 Invalid clock or race request type crashes the whole page.**
  `{"slots":[],"waitlist":[],"now":"99:99"}` and a `race.requests` that is a string must show
  `INVALID_VALUE` at `now` or at `race.requests` in the Result panel. The editor and the navigation
  must stay usable. No input may unmount the app.
- **#15 Presets and JSON imports drop staff and clock context.**
  Loading a preset or importing JSON must keep every field the engine understands (`staff`, `now`,
  `race`, and anything else `validate()` reads), not only `slots` and `waitlist`.
  Expected after the fix: C19 matches W1 to S1. C20 matches nobody. C22 confirms nobody and keeps W1
  and W2. C23 shows `INVALID_VALUE`. The import from the issue (absent staff, `now` 14:25 for a 14:30
  slot) must keep both constraints.
- **#17 Result and before/after explanations report false matches.**
  Explain a candidate who waits behind the chosen person separately from one already matched to an
  earlier slot. When a slot's staff member is absent or the slot is blocked, say so instead of
  listing candidates as "fits". The before/after diff must not describe a slot leaving consideration
  as a consent or duration change.
- **#18 Lab cannot re-import its own JSON export.**
  Importing `refill-lab-result.json` (which wraps the document under `input`) must restore that
  input and reproduce the same result.
- **#20 The business guide points to controls that no longer exist.**
  Rewrite "Try it in two minutes" in `public/guide/mba.html` and the demo steps in
  `public/guide/engineering.html` for the current interface. Use the role names and button labels
  as they appear on https://fillthechair.vercel.app: Front desk, an appointment, "Record a
  cancellation" then confirm, an amber open gap, "Send offers", Owner, Proof (`#/lab`). Keep the
  existing page style. Describe the flow by role and button name, not by screen position, because
  the layout is still being polished.

## 3. How to work

- Fix one issue per commit. Commit message format: `fix(lab): <what changed> (#16)`.
- Put pure logic in `src/labLogic.ts` and cover each fixed case with a test in
  `src/labLogic.test.ts`, using the exact reproduction inputs from the issues.
- Check it by hand: `npm run dev`, open `http://localhost:5173/#/lab`, paste each reproduction
  input, and confirm the expected result. Check at a phone width (375 px) as well.
- Design: reuse the classes the Lab already uses (`verdict-card`, `slot-card`, `code`, `skip`,
  `check`). Do not add colours, fonts or border radii. Colour has meaning: lime means pass or act,
  amber means an open gap, coral means a problem.
- Before every push, run all of these and make sure they pass:
  ```
  npm test
  npx tsc -b
  npx vite build
  ```
- Push your branch and open **one** pull request into `main`, titled
  `Lab and guide fixes (#15 #16 #17 #18 #20)`. In the description:
  - list `Fixes #15`, `Fixes #16`, `Fixes #17`, `Fixes #18`, `Fixes #20` on separate lines;
  - for each issue, one line on what you changed and how you checked it;
  - paste the `npm test` summary.
- If new commits land on `main` while you work, update your branch with
  `git fetch origin && git merge origin/main`. Never rebase or force-push, and never push to `main`.
- If anything is unclear, or a rule blocks a fix, stop and write it in the pull request description.
  Do not work around the rules.

## 4. Done means

All five issues behave as "Expected" in their reports. `npm test`, `npx tsc -b` and `npx vite build`
pass. Only files from section 1 changed (`git diff --stat origin/main` shows nothing else). One pull
request is open, and the owner reviews and merges it.
