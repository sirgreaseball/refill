# Devlog

## 17 Oct 2026, evening: v2.0.0 (roles, stylists, rescheduling)

- MBA feedback: "keep an option to reschedule". Shipped as moving an appointment: the desk picks a new time with the customer on the phone, or sends a private link where the customer picks a time that truly works or cancels. The time they leave opens for the waitlist. This is the post-feedback change.
- Flaw found while building it: a move only checked that the target stylist had nothing booked, not that they were at work. Stylists now have working hours, and the database refuses any move, reassignment or option outside them (`TARGET_OFF_SHIFT`).
- Stylist absence never moves anyone silently: offers on their time are withdrawn, their gaps held, their customers flagged until the desk or the customer chooses.
- Four roles proven by keys the database checks: owner, front desk, stylist, customer. "View as front desk" uses the real front-desk key, so owner-only actions are refused for real.
- Owner page with live numbers; `npm run dbtest` grew from 10 to 20 checks.

## 17 Oct 2026, day

- Read case C29, the organiser fixture and the judge notes. The three checks decide the core: duration, double booking, consent.
- Rules engine first (`src/engine.ts`), pure and tested: the organiser fixture reproduces W1 → S2; 18 core scenarios.
- Database: every table behind RLS with no policies; all access through functions that re-check the rules. `accept_offer` locks offer, then slot, then entry, in one order everywhere, so simultaneous taps queue and never deadlock. A partial unique index backs it.
- Race test against the live database: 8 and 12 simultaneous taps, 1 booking each time, every loser told which booking won.
- Dropped the Supabase client library for a 15-line fetch (`src/rpc.ts`): the bundle went from 140 kB to 85 kB gzipped.
- Desk, offer page and Lab built on the design system in `src/styles.css` (cotton paper, kohl ink, mehendi for actions, haldi for the open gap).
