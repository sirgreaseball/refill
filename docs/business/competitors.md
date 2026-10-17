# MBA research received 2026-10-17 (source: MBA teammates; not yet verified)

## Competitor table (screenshot)
| Platform | Target market | How it handles scheduling & waitlists | Typical pricing (as given, USD, unverified) |
|---|---|---|---|
| Mangomint | Mid-to-large salons & spas (2–20+ staff) | High-speed UI, Express Booking, virtual waiting rooms, automated client flows | $165–$375/month tiered by team size |
| Vagaro | Multi-staff salons, barbers, fitness | Booking calendar, POS, waitlist tracking, automated email/SMS marketing add-ons | From $30/month for 1 bookable calendar; scales per staff calendar + paid add-ons |
| Fresha | Independent stylists, salons, wellness | 24/7 online self-booking, automated reminders, consumer marketplace discovery | Low base entry with transaction, marketplace new-client and automated message usage fees |
| TutorBird | Private tutors & tutoring centres | Student waitlists, teacher substitutions, cancelled lessons become "make-up lesson slots" on a student portal | $16.95/month solo tutor + $4.95/month per extra tutor/admin |
| Calendly / Acuity | General appointments & solo tutors | Good link-based booking and reminders; weak or no native automated waitlist backfill | Per-seat monthly subscription ($10–$30+/seat) |

Missing India players to add: Zenoti (Hyderabad HQ), Dingg, Zylu, Salonist, Wellnessta.

## Gaps doc — "Key Gaps in Existing Apps - Product Opportunity" (Google Doc 17iw3vcB4V98EHGlFVA2b8k8OfEYyt54NRaLRCUlMqK8)
1. Passive portals / blind broadcasts → our pre-outreach constraint validation (consent, duration, staff skill) before any message.
2. Black-box rejections → Explainable Decision Log (Evidence View) with rule codes, e.g. SKIPPED: Consent=False; SKIPPED: Needs 60m > 30m slot; WAITLIST_RETAINED: lost race to Booking #104. Maps to "readable evidence and a saved result".
3. Fragile edge cases (static roster, one-time consent) → Edge-Case Simulation Toggle (late cancellation, staff absence, duration change, withdraw consent) that recalculates live and exports before/after JSON/CSV proof.
4. Per-seat pricing hurts part-time-heavy businesses (Vagaro per calendar, Mangomint from $165/month) → flat per-location price anchored to recovered revenue (filling 2–3 cancelled slots a month pays for it). Note: the doc's "₹800 / $40" equivalence is wrong (₹800 ≈ $9–10); use INR only.
Claims about competitor behaviour are hypotheses to confirm in owner interviews, not facts.
