# Clean-Machine Setup & Handoff Verification

**Conducted by:** Vedanth Raj ([@vedanth-raj](https://github.com/vedanth-raj))  
**Date:** 17 October 2026  
**Environment:**
- **OS:** Windows 11 (x64)
- **Node.js:** `v23.9.0`
- **npm:** `11.2.0`
- **Vitest:** `5.0.5`
- **Vite:** `8.3.4`
- **Database:** Supabase Postgres (Mumbai region, shared demo instance)

---

## 1. Setup Steps & Results Table

Following strictly the setup steps defined in `README.md` on a fresh repository clone:

| Step | Exact Command | What Happened | Pass / Fail | Time Taken |
|---|---|---|:---:|:---:|
| 1. Install dependencies | `npm install` | Resolved dependencies and installed packages. Emitted an engine warning for `vitest@5.0.5` with Node `v23.9.0` (`package requires ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`), but all packages installed cleanly with exit code 0. | **PASS** | 17.09s |
| 2. Development server | `npm run dev` | Vite started dev server locally in 294 ms at `http://localhost:5173/`. Verified HTTP GET 200 response, page loaded and rendered desk interface with valid markup. | **PASS** | ~3.0s |
| 3. Test suite | `npm test` | Vitest executed unit, fixture, time policy, and salon data tests (`src/engine.test.ts`). 30 tests passed, 1 test skipped (`team (tests/scenarios.json) > file is not empty` skipped as expected until teammate Parth populates team scenarios). Zero failures. | **PASS** | 1.12s (Vitest internal: 297ms) |
| 4. Live database race test | `npm run race` | Executed `node scripts/race-test.ts` firing 8 simultaneous taps across 3 consecutive runs against the live Supabase database. Exactly 1 booking was confirmed and 7 waitlisted in every run. All concurrency and consent checks passed. | **PASS** | 38.2s (Network RPCs included) |
| 5. Production build | `npm run build` | TypeScript type-check (`tsc -b`) and production bundle build (`vite build`). 62 modules transformed, producing 6 bundle assets in `dist/` (total gzipped JS: ~85.26 kB). Exited with code 0. | **PASS** | 3.05s |

### Failure Report
- **Failures encountered:** 0
- **GitHub Issues opened:** None required (no setup failures occurred).

---

## 2. Summary of `npm test`

Vitest console output:

```text
> refill@1.0.0 test
> vitest run

 RUN  v5.0.5 C:/Users/Vedanth Raj/Downloads/refill

 ✓ src/engine.test.ts (31 tests | 1 skipped) 12ms

 Test Files  1 passed (1)
      Tests  30 passed | 1 skipped (31)
   Start at  17:34:55
   Duration  297ms (transform 64%, import 23%, tests 9%, worker 4%)
```

### Test Breakdown
- **Organiser fixture C29 (`data/fixture/C29.fixture.json`):**
  - Reproduces the expected match `W1 -> S2` byte-for-byte.
- **The three public case checks:**
  1. *Duration check:* 60-minute request cannot occupy a 30-minute slot (`DURATION_TOO_LONG`).
  2. *Concurrency check:* Two requests for one slot yield 1 confirmed booking and 1 waitlisted entry.
  3. *Consent check:* Customer with `consent: false` or `null` is excluded from outreach (`NO_CONSENT`).
- **Core scenarios (`tests/core-scenarios.json`):**
  - All 18 core scenarios pass validation and matching logic.
- **Team scenarios (`tests/scenarios.json`):**
  - Initialized cleanly; `file is not empty` check conditionally skipped until Parth's team scenarios branch lands.
- **Time policy:**
  - 20-minute notice flagged as `LATE` cancellation (< 120 min).
  - 3-hour notice flagged as `NORMAL` cancellation.
  - Slot starting within lead time (< 10 min) is suppressed from offers (`tooSoon: true`).
- **Salon data validation (`data/salon/*.csv`):**
  - Verified demo salon (Kesar Salon) staff, services, schedule, and waitlist CSVs load properly.
  - Verified no staff member is double-booked in base schedule.
  - Verified broken foreign key references (unknown `service_id`) throw clear errors rather than producing silent gaps.

---

## 3. Concurrency Race Test (`npm run race`)

The race script (`scripts/race-test.ts` & `src/liveRace.ts`) tests concurrent transactions against the live Supabase PostgreSQL database. In each run, a throwaway workspace is created, a slot is offered to 8 waitlist customers (`W1`..`W8`), and all 8 customers fire `accept_offer` simultaneously via `Promise.all()`.

### Execution Output

```text
> refill@1.0.0 race
> node scripts/race-test.ts

(node:31048) ExperimentalWarning: Type Stripping is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

run 1: 8 taps resolved in 937 ms
  PASS  8 simultaneous taps, exactly 1 confirmed (#112)
  PASS  7 kept their waitlist place, each told it lost to #112
  PASS  the database holds one confirmed booking for the slot
  PASS  a repeated tap returns the same booking
  PASS  STOP after the offer: booking refused, slot stays free

run 2: 8 taps resolved in 297 ms
  PASS  8 simultaneous taps, exactly 1 confirmed (#113)
  PASS  7 kept their waitlist place, each told it lost to #113
  PASS  the database holds one confirmed booking for the slot
  PASS  a repeated tap returns the same booking
  PASS  STOP after the offer: booking refused, slot stays free

run 3: 8 taps resolved in 69 ms
  PASS  8 simultaneous taps, exactly 1 confirmed (#114)
  PASS  7 kept their waitlist place, each told it lost to #114
  PASS  the database holds one confirmed booking for the slot
  PASS  a repeated tap returns the same booking
  PASS  STOP after the offer: booking refused, slot stays free

All 3 runs passed.
```

### Run Breakdown Table

| Run | Racers | Resolution Time | Confirmed Count | Waitlisted Count | Winning Booking ID | Idempotent Re-tap | Consent STOP Revocation | Status |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | 8 | 937 ms | **1** | **7** | `#112` | `ALREADY_CONFIRMED` | Revoked & Slot Free | **PASS** |
| **2** | 8 | 297 ms | **1** | **7** | `#113` | `ALREADY_CONFIRMED` | Revoked & Slot Free | **PASS** |
| **3** | 8 | 69 ms | **1** | **7** | `#114` | `ALREADY_CONFIRMED` | Revoked & Slot Free | **PASS** |

### Verified Guarantees
1. **Zero Double-Bookings:** In 100% of runs, exactly 1 customer won the booking, and remaining competitors retained their waitlist queue position.
2. **Lock Order Consistency:** Row locking order in `accept_offer` (`offer` -> `slot` -> `waitlist`) eliminated deadlock conditions under concurrency.
3. **Database Integrity:** A partial unique index (`bookings_one_per_slot`) on `public.bookings` enforces single-winner isolation at the storage layer.
4. **Idempotency:** A customer re-tapping `accept_offer` receives `ALREADY_CONFIRMED` with their existing booking ID without creating a duplicate record.
5. **Immediate Consent Revocation:** Customer sending STOP revokes open offers immediately; subsequent accept attempts are refused with `REVOKED`.
