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

- **AWS Cloud Architecture & S3 Production Deployment:**
  - Deployed the complete Refill production application over secure HTTPS on AWS S3 (`https://refill-app-422661067831.s3.us-east-1.amazonaws.com/index.html`).
  - Configured Amazon Trust Services TLS/SSL encryption and web asset delivery.
- **AWS Cognito Authentication with Custom Gmail OTP Verification:**
  - Architected and configured AWS Cognito User Pool (`us-east-1_GXcemXtkQ`) and Web Client (`6idmbpa85onbohp4gr3qc06v1e`) with zero-bypass email verification.
  - Customised email verification template to place the 6-digit OTP code directly in the email subject and bold in the email body.
  - Implemented native browser integration in `src/cognito.ts` and 2-step onboarding OTP flow in `src/SignIn.tsx`.
- **Owner Financial Analytics & Profit / Money Saved Ledger:**
  - Integrated real-time financial tracking in the Owner Dashboard (`src/Owner.tsx`).
  - Implemented live calculations for Gross Money Earned, Money Saved by Refill, Revenue at Risk, Passed Unfilled, Cancellation Recovery Rate %, and Refill Bottom-Line Profit Share %.

## Links

- **Assigned Issue:** [Issue #2: Vedanth: handoff check, reliability, demo script](https://github.com/sirgreaseball/refill/issues/2)
- **Pull Request:** [Pull Request: Vedanth Handoff Check, Reliability, Known Limits & Demo Script](https://github.com/sirgreaseball/refill/pull/5) (Branch: [`vedanth_Raj`](https://github.com/sirgreaseball/refill/tree/vedanth_Raj))

