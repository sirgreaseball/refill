# Parth Kachhara — scenario tests and UI review

## Scenario contribution

- Added the 12 Phase 1 scenarios, P01–P12, to `tests/scenarios.json` using the original array and expected results.
- Covered the organiser reference case, duration fit, two-client races, false and unknown consent, skill precedence, booked slots, repeated acceptance, duplicate IDs, missing minutes, and preventing one client from taking two slots.
- Preserved the required scenario format and used 2-space JSON indentation.
- Kept repository changes within `tests/scenarios.json` and this contribution record.

## Validation

- Ran `npm ci`, then `npm test` on the scenario branch.
- `npm ci`: 77 packages added, 78 audited, 0 vulnerabilities; the lockfile was unchanged.
- `npm test`: 1 test file passed; 51 tests passed; 0 failures and 0 skipped (553ms).

## UI review

- Used the live site in a desktop browser with synthetic data, including mobile-size views for Owner Team and Rules.
- Front desk: sent three offers for the 14:30 Hair spa gap, cancelled a 14:00 booking to open a gap, moved a 15:00 booking to 13:00 with Arjun, and marked Meher out, flagging four affected bookings.
- Owner: visited Overview, Team, and Rules. Staff: inspected Riya's view and confirmed marking her out. Client: signed up as “Refill QA” for a Haircut with “No messages” and opened the resulting private page at queue position 15.
- Reviewed the Client sign-up and own-page consent wording against the matching engine and checked-in offer functions.
- Found misleading wording: choosing “No messages” promises that clients can check their page for offers, but clients without affirmative consent are excluded from new offers. Withdrawing consent also revokes open offers.
- No overlapping controls were confirmed in the inspected screenshots. The Owner Rules role table requires horizontal scrolling to reveal its Client column, a discoverability recommendation rather than a confirmed broken layout.
- Actual browser observations and screenshots are documented separately. This was not real Android Chrome or Firefox testing, and this record does not claim those device checks passed.
- Filed [issue #7](https://github.com/sirgreaseball/refill/issues/7) for the consent-copy mismatch, with sign-up and private-page screenshots.

## Pull request

- Published branch: [parth/scenarios](https://github.com/sirgreaseball/refill/tree/parth/scenarios).
- Pull request: [#8 — test: add Parth's 12 matching and booking scenarios](https://github.com/sirgreaseball/refill/pull/8).

## Lab and guide fixes — 18 October 2026

- Rechecked the reported Lab failures against the current live site. C20 still matched an absent stylist, and an invalid clock still replaced the editor with the page error screen.
- Followed `docs/agents/parth-lab-fixes.md` on `parth/lab-fixes`. Reviewed the owner's existing fixes for #9–14 and #19 in source; those changes were already on main and were not duplicated here.
- #16: added pure parsing/evaluation helpers that validate clock and race inputs and return editable `INVALID_VALUE` results. Checked both reported crash inputs in the browser and regression tests.
- #15: preserved complete preset and imported documents, including staff, clock and race context. Verified C19, C20, C22 and C23, plus the original absent-staff/14:25 import, through the browser and tests.
- #17: separated waiting candidates from earlier-slot matches, explained unavailable slots, and made before/after comparisons report slot-state changes. Checked C04, staff absence and blocked-slot output, with regression coverage for all states.
- #18: restored the input from exported result files without discarding metadata. Downloaded a result and imported that exact file through the browser; the input and result matched. Added roundtrip tests including nested context and `records: null` metadata.
- #20: updated both guides to the current demo, role names, cancellation confirmation, counted Send offers button, Owner Overview and Proof controls. Kept the existing styling and marked the original v1 business description as historical.
- Added 38 regression tests; left the shared engine and existing scenario expectations unchanged. Independent review exercised 279 malformed-input and presentation probes without crashes.
- Browser verification used desktop Chromium and a measured 375 × 812 CSS-pixel viewport. The tested Lab states had no horizontal overflow. This was not physical Android Chrome or Firefox testing.
- Merged the latest main (`f116f37`) without conflicts before final verification. No database, migration or deployment commands were run.
- Validation: `npm ci` completed with 0 vulnerabilities; final `npm test` reported **2 test files passed, 89 tests passed**, with no failures. `npx tsc -b`, `npx vite build` and `git diff --check` passed.
