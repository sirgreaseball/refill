# Rules for AI agents and assistants in this repository

You are probably helping one teammate with one task. Read this whole file before doing anything. If a rule blocks the task, stop and tell your human instead of working around it.

## What this repository is

Refill is a hackathon product (Fynd × NMIMS Hyderabad, case C29, Appointment Recovery Desk). A salon owner's desk that offers a cancelled slot to waitlisted customers who fit it and gave consent, books the first to accept, and never double-books. The app is finished and deployed; your teammate's task is a small, separate piece around it.

## Hard rules

1. **Only touch the files your task names.** The ownership table below lists them. Never create, edit, delete, move, rename or reformat anything else, not even whitespace.
2. **Never touch** `src/`, `supabase/`, `scripts/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `vercel.json`, `.github/`, `AGENTS.md`, `CLAUDE.md` or `README.md`, unless your human is the repo owner (sirgreaseball).
3. **Never install, remove or upgrade packages.** Never run database, migration or deploy commands. Never call the Supabase or Vercel APIs.
4. **Never push to `main`.** Never force-push, rebase or merge `main`. Work on the branch your task names and open exactly one pull request. `main` is protected; the owner reviews and merges.
5. **If a test fails, report it. Never change application code or expected results to make it pass.** Write the failure into the pull request description.
6. **All data is synthetic.** No real names, phone numbers or personal data.
7. Run `npm test` before opening the pull request and paste the summary into the description.

## Who owns what

| Person | Branch | Files they may create or edit |
|---|---|---|
| Vedanth Raj (vedanth-raj) | `vedanth/handoff` | `docs/SETUP_CHECK.md`, `docs/KNOWN_LIMITS.md`, `docs/DEMO_SCRIPT.md`, `docs/contributions/vedanth.md` |
| Parth Kachhara (parthkachhara) | `parth/scenarios` | `tests/scenarios.json`, `docs/contributions/parth.md` |
| Chirag Seervi (ChiragSeervi123) | `chirag/data` | `data/salon/staff.csv`, `data/salon/services.csv`, `data/salon/customers.csv`, `data/salon/README.md`, `docs/SHOCKS.md`, `docs/ROLEPLAY_LOG.md`, `docs/contributions/chirag.md` |
| MBA teammates | none | Nothing in the repo. They open and reply to issues labelled `mba-request`. |
| Dhruv Sonar (sirgreaseball) | any | Everything. Owner of the app code. |

## Formats you must keep exactly

- `tests/scenarios.json` is a JSON array of scenarios in the format of `tests/core-scenarios.json`. Reasons are checked in this order: `NO_CONSENT`, `SKILL_MISMATCH`, `DURATION_TOO_LONG`, `NOT_AVAILABLE`. Input errors are `DUPLICATE_ID`, `MISSING_FIELD`, `INVALID_VALUE`. The test runner (`npm test`) runs every entry.
- `data/salon/*.csv` keep their header rows exactly. Times are 24-hour `HH:MM`. Consent is `true`, `false` or empty for unknown. `customers.csv` and `schedule.csv` refer to `services.csv` by id; an unknown id fails the tests on purpose.

## How the app works (read-only context)

- `src/engine.ts`: the matching rules. Pure functions. `npm test` runs them.
- `supabase/migrations/001_refill.sql`: the database. Every write goes through a function that re-checks the rules; `accept_offer` locks the slot row so two simultaneous taps produce one booking.
- `npm run race`: fires simultaneous taps at the live database and checks the outcome.
