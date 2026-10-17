# Vedanth Raj (vedanth-raj)

Fourth year, reliability, handoff check, and engineering presentation.

## Responsibilities & What I Did

- **Clean-Machine Setup & Handoff Verification (`docs/SETUP_CHECK.md`):**
  - Performed a clean-machine setup following strictly `README.md` (`npm install`, `npm run dev`, `npm test`, `npm run race`, `npm run build`).
  - Recorded every command, output, execution duration, and pass/fail status in a structured verification table. Zero failures encountered; verified zero friction for external evaluators.
  - Benchmarked `npm test` (30 passed, 1 skipped) covering organiser fixture C29, core scenarios, time policy, and salon CSV data validation.
- **Live Concurrency & Race Verification:**
  - Ran the live database race test (`npm run race`) executing 8 simultaneous taps across 3 consecutive runs against the live Supabase database.
  - Verified that exactly 1 booking was confirmed and 7 waitlisted in every run, confirming row-locking order and database partial unique index constraints.
- **Known Limitations & Pilot Roadmap (`docs/KNOWN_LIMITS.md`):**
  - Documented what the application does not do (unauthenticated workspaces, simulated web messaging, 1.2s client polling, synthetic salon datasets, single-day calendar scope, single-service models, 15m static offer hold windows, 3-day workspace pruning).
  - Justified why each limit is acceptable and appropriate for the prototype, and detailed exact technical requirements for an operational salon pilot.
- **Final 4-Minute Presentation Script & Q&A (`docs/DEMO_SCRIPT.md`):**
  - Author of the final 4-minute stage presentation script for Fynd × NMIMS Hyderabad (Case C29).
  - Structured the second-by-second walkthrough, on-screen actions, spoken dialogue, and alignment with rubric scoring rows (user journey, case checks, reliability, business iteration, and reproducibility).
  - Prepared the defensive Q&A cheat sheet for tough judging questions around row-level locking, TOCTOU prevention, idempotency, DPDP consent enforcement, and RLS security.

## Links

- **Assigned Issue:** [Issue #2: Vedanth: handoff check, reliability, demo script](https://github.com/sirgreaseball/refill/issues/2)
- **Pull Request:** [Pull Request: Vedanth Handoff Check, Reliability, Known Limits & Demo Script](https://github.com/sirgreaseball/refill/pull/5) (Branch: [`vedanth/handoff`](https://github.com/sirgreaseball/refill/tree/vedanth/handoff))
