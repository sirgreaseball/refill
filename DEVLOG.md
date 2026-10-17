# Devlog

## 17 Oct 2026

- Read case C29, the organiser fixture and the judge notes. The three checks decide the core: duration, double booking, consent.
- Rules engine first (`src/engine.ts`), pure and tested: the organiser fixture reproduces W1 → S2; 18 core scenarios.
- Database: every table behind RLS with no policies; all access through functions that re-check the rules. `accept_offer` locks offer, then slot, then entry, in one order everywhere, so simultaneous taps queue and never deadlock. A partial unique index backs it.
- Race test against the live database: 8 and 12 simultaneous taps, 1 booking each time, every loser told which booking won.
- Dropped the Supabase client library for a 15-line fetch (`src/rpc.ts`): the bundle went from 140 kB to 85 kB gzipped.
- Desk, offer page and Lab built on the design system in `src/styles.css` (cotton paper, kohl ink, mehendi for actions, haldi for the open gap).
