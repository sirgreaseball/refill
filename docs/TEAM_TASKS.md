# Teammate tasks (current)

Paste-ready. Dhruv sends these; no deadlines in the messages. Update this file when tasks change.
Live app: https://fillthechair.vercel.app

## Parth (real-phone testing + scenarios)
Status 18 Oct 00:55: issue #7 fixed (b73e056); PR #8 merged, 51 tests pass. Next ask: thanks; please retest the client sign-up and your page on the live site after the next deploy, then test on a real Android phone in Chrome and Firefox.

Refill v3.1 is live: https://fillthechair.vercel.app. Your job is real-phone testing. On an Android phone, open it in Chrome and in Firefox. From the home screen, try every view: Front desk (open an amber gap, send offers, reschedule someone, mark a staff member out, pull the sheet down to close it), Owner (Overview, Team, Rules), a staff member's view, and Client (sign up, then your own page). For anything broken, overlapping or slow, open a GitHub issue with a screenshot, the browser and the phone model. Then finish your `tests/scenarios.json` PR (`npm ci`, then `npm test`).

## Chirag (market-shock rehearsal)
Refill v3.1 is live: https://fillthechair.vercel.app. Rehearse the four market shocks on the live app and write the exact clicks for each in `SHOCKS.md`: (1) a late cancellation, (2) a staff member calls in sick (mark them out on Front desk > Today, then rebook their clients), (3) a client needs a longer service than the free gap, (4) a client withdraws consent. For each, note what the screen shows and how many seconds it took. Open a PR from your branch.

## Vedanth (demo script + Q&A)
Status 18 Oct 01:40: `docs/DEMO_SCRIPT.md` rewritten for the current product (accounts, Try the demo, Day Dial); his Q&A kept and updated. Next ask: rehearse it end to end twice on the live app with a stopwatch and note any step that runs long.

Refill v3.1 is live: https://fillthechair.vercel.app. Write `DEMO_SCRIPT.md` for a 4-minute demo plus 3 minutes of Q&A, starting from the home screen (the day ribbon) and following the path in `HANDOFF.md` section 5. Draft short answers to: how double booking is impossible, what happens when a staff member is out, how consent is enforced, and what changed after MBA feedback (rescheduling). Also write `docs/contributions/vedanth.md`. Open a PR.

## MBA pair (feedback + business slides)
Attach `docs/business/Refill-explained-simply.pdf` (plain-language: problem, idea, how it works, a full salon scenario, features, pitch lines, likely judge questions).

The redesigned app is live: https://fillthechair.vercel.app. Each role has its own view; the home screen shows the whole day at a glance. Try Front desk and Owner and tell us anything confusing (WhatsApp, or a GitHub issue labelled `mba-request`). For the pitch, prepare the business slides: who pays, pricing, and the money a business gets back from refilled cancellations. The Owner page shows live figures you can quote.
