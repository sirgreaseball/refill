# Changelog

## v3.0.0 · 17 Oct 2026 · one clear dashboard per role

- Home asks who is using Refill: front desk, owner, staff member, client; proof for judges one tap away. A role pill switches views; a dock moves between a role's pages.
- Front desk: Today (what needs you now, team in/out with shift hours, schedule), Waitlist, Activity. Every action on an appointment lives in one sheet; on phones it is a bottom sheet.
- Owner: Overview, Team and links, Rules with the who-can-do-what matrix.
- Business-neutral wording (staff, clients) so any appointment business fits; the demo business stays a salon.
- New design system: grey canvas, white groups, glass bar and dock; Hanken Grotesk and JetBrains Mono. Phone-first, no horizontal scroll.
- Fixed: dialogs stole focus on every poll; polls re-rendered when nothing changed (now skipped, every 2 s). Main bundle 90.9 kB to 84.7 kB gzipped.

## v2.0.0 · 17 Oct 2026 · roles, stylists, rescheduling

- Four roles, each proven by a key the database checks on every call: owner, front desk, stylist, customer. Owner-only: the rules, stylist and front-desk links, reset. "View as front desk" uses the real front-desk key.
- Staff-aware matching: a freed slot goes to anyone whose service that stylist can do. Plain-language reasons for every skip.
- Stylist absence: their open offers are revoked, their gaps held, their customers flagged; nothing moves until the desk or the customer chooses.
- Working hours per stylist: no move, reassignment or option ever lands outside a shift.
- Reschedule: the desk picks a new time (same time with another stylist first), or sends the customer a private link listing only times that work; the customer can also cancel there. The time they leave opens for the waitlist.
- Customer self sign-up with an explicit yes or no to messages (never pre-ticked), a private page with place in queue, booking, consent and leave.
- Owner page: recovered revenue, offers, consent, reschedules, stylist load, the rules, the who-can-do-what matrix.
- `npm run dbtest`: 20 live database checks.

## v1.1.0 · 17 Oct 2026 · engineering hardening (not a business-team change)

- Offers hold for 15 demo-minutes, then lapse (`OFFER_EXPIRED`), are logged, and the next people in the queue are suggested; a lapsed offer cannot be booked.
- At most 3 offers per customer per day (`FREQUENCY_CAP`).
- Undo a mistaken cancellation while the gap is still empty.
- Rate limits per IP, per demo day and per offer; payload, id and text limits; capacity cap and 3-day retention; table privileges revoked from the public key; append-only evidence log; CSV formula-injection guard.
- `npm run dbtest`: 10 live database checks.

## v1.0.0 · `v1-mba-handover` · 17 Oct 2026

The version the MBA team inherits.

- Desk: today's book per stylist, demo clock, cancellations with notice (late under 2 hours), open gaps with value at risk.
- Recovery panel: who fits each gap, who is skipped with a rule code, owner-approved offers, live offer states, QR codes per offer, two-phone race.
- Customer offer page: book, decline, stop messages; live states (booked, someone got there first, messages stopped).
- Waitlist with explicit consent (yes, no, not asked) and an add form with validation.
- Evidence log with filters and JSON/CSV export.
- Lab: live checks for all three case checks and the organiser fixture, scenario files, editable input, edge-case toggles with before/after export, live database race.
- Database: functions only (RLS on, no policies), one confirmed booking per slot, consent re-checked at outreach and at booking.
- Installable app (manifest, icons, service worker), light and dark themes, phone layout.
