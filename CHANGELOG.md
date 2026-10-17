# Changelog

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
