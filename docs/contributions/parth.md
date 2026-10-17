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
- GitHub issue creation for the consent-copy finding was attempted but rejected with HTTP 403 (`Resource not accessible by integration`); no issue URL is available yet.

## Pull request

- Published branch: [parth/scenarios](https://github.com/sirgreaseball/refill/tree/parth/scenarios).
- Pull request creation was attempted but rejected with HTTP 403 (`Resource not accessible by integration`). No pull request has been opened.
- [Open the prepared pull request](https://github.com/sirgreaseball/refill/pull/new/parth/scenarios) once GitHub write access is available.
