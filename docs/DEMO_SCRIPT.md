# Refill: 4-Minute Engineering Demo Script

**Event:** Fynd × NMIMS Hyderabad · Case C29: *Appointment Recovery Desk*  
**Presenter:** Vedanth Raj ([@vedanth-raj](https://github.com/vedanth-raj)) & Team  
**Live Application:** [https://fillthechair.vercel.app](https://fillthechair.vercel.app)  
**Lab / Test Benchmark:** [https://fillthechair.vercel.app/#/lab](https://fillthechair.vercel.app/#/lab)  
**Total Target Time:** Exactly 4 minutes (240 seconds)

---

## Stage & Screen Setup Before 0:00
1. **Primary Screen (Projector/Laptop):** Clean browser window open to `https://fillthechair.vercel.app` (fresh workspace generated).
2. **Mobile Device 1:** Phone camera ready to scan desk QR code (or browser open to offer URL).
3. **Mobile Device 2:** Second phone ready to scan desk QR code for the concurrent race demonstration.
4. **Second Tab:** Open to `https://fillthechair.vercel.app/#/lab` for instant proof of the three case checks and live database race.

---

## 4-Minute Minute-by-Minute Run Sheet

| Timestamp | Visual / Action on Screen | Speaker Script (What to Say) | Technical & Rubric Anchor |
|---|---|---|---|
| **0:00 – 0:20**<br>*(20 sec)* | **Entry Screen / Desk Overview**<br><br>Display Kesar Salon's live appointment book. Point to 4 stylists, 26 scheduled appointments, 14 waitlisted customers. | "Good morning, judges. In the salon business, an empty chair is revenue that walks out the door and never comes back. When a client cancels at the last minute, the front desk usually panics or bombards an old contact list.<br><br>We built **Refill**—an appointment recovery desk that fills cancelled slots with eligible waitlisted customers, enforces explicit consent before every outreach, and mathematically guarantees zero double-bookings." | **Core Problem & Value Proposition**<br>Establishes the commercial stakes and sets up the live demo. |
| **0:20 – 0:45**<br>*(25 sec)* | **Trigger Cancellation**<br><br>Click appointment for *Simran at 12:30* (Haircut with Priya). Select **Customer cancelled**.<br><br>The slot turns into an amber glowing gap. Notice indicator shows `LATE` (75 min notice). | "Watch what happens when Simran calls to cancel 75 minutes before her appointment. With one tap, the desk marks it cancelled.<br><br>Notice two things: because notice is under 2 hours, Refill flags it as a `LATE` cancellation for policy enforcement. The empty chair turns into a live recovery gap that immediately calculates matching candidates." | **Working User Journey (Step 1 & 2)**<br>Demonstrates cancellation handling, notice policy (< 2 hrs = late), and visual desk feedback. |
| **0:45 – 1:15**<br>*(30 sec)* | **Recovery Panel & Rule Breakdown**<br><br>Inspect the recovery candidate drawer. Point to eligible candidates in queue order, followed by skipped candidates with explicit reason codes (`NO_CONSENT`, `SKILL_MISMATCH`, `DURATION_TOO_LONG`). | "Here is the heart of the matching engine. Refill doesn't just guess who fits—it evaluates every waitlisted client in queue order against four strict criteria: consent, skill, duration, and time availability.<br><br>Look at the exclusions: customer Arnav is skipped immediately with `NO_CONSENT` because his consent status is unknown—in Refill, unknown always means no. Neha requires a 60-minute service, so she is excluded from this 30-minute slot with `DURATION_TOO_LONG`. The engine only surfaces candidates who can honestly sit in this chair." | **Case Check 1 (10 pts)** & **Case Check 3 (5 pts)**<br>Proves 60m request cannot take 30m slot, and proves zero outreach without explicit consent. |
| **1:15 – 1:40**<br>*(25 sec)* | **Send Offers & QR Inspection**<br><br>Click **Send Offers** to top eligible matches. Show generated offer modal and display QR code on screen. | "We review the filtered list and tap **Send Offers**.<br><br>Crucially, our database never trusts the browser. Before any offer record is created, the PostgreSQL engine re-validates consent and slot availability. Each customer receives a secure, simulated offer page. Let's scan this on two real phones right now." | **Database Integrity & Security**<br>Directs attention to server-side re-checks in Postgres RPC functions (`send_offers`). |
| **1:40 – 2:20**<br>*(40 sec)* | **The Concurrency Race: Two Phones, One Slot**<br><br>Two team members hold up phones showing the offer screen. On count of 3, both tap **Book** simultaneously.<br><br>Phone 1 displays green confirmation with Booking ID. Phone 2 displays amber waitlist notification with lost-to ID. Desk updates live. | "This is the hardest engineering problem in appointment recovery: two customers tapping 'Accept' at the exact same millisecond.<br><br>Three, two, one—tap!<br><br>Look at the screens: Phone 1 is confirmed with Booking #112. Phone 2 was beaten by milliseconds—it informs the customer that the chair was claimed, but preserves their priority spot on the waitlist. Look at the desk: exactly one booking recorded. Double-booking is physically impossible in Refill because our `accept_offer` function acquires an exclusive row lock on the slot and is backed by a partial unique database index." | **Case Check 2 (10 pts)**<br>Proven live with real hardware concurrency: one confirmed booking, one waitlist preservation. |
| **2:20 – 2:45**<br>*(25 sec)* | **Consent Revocation (STOP Command)**<br><br>On Phone 2, tap **Stop messages** (or toggle consent on desk).<br><br>Observe desk status change and inspect the Evidence Log. | "Customer trust requires real control. If a customer changes their mind and taps 'Stop messages' or requests removal, Refill immediately sets their consent to `false` and revokes every active offer associated with them.<br><br>If they try to book afterwards, the transaction is rejected. Every action is recorded in our tamper-evident **Evidence Log**, complete with timestamps, reason codes, and exportable as JSON or CSV for audit." | **Case Check 3 & Reliability (15 pts)**<br>Proves dynamic consent withdrawal, immediate offer revocation, and auditable logging. |
| **2:45 – 3:15**<br>*(30 sec)* | **The Lab: Verification & Live 8-Tap Race**<br><br>Switch tab to `/#/lab`. Click **Run live race** button.<br><br>Watch 8 concurrent requests resolve against live Supabase database with 5 green PASS checks. | "Judges don't have to take our word for it. We built **The Lab** directly into the application.<br><br>Right here, we run all three official case checks live against the organiser's fixture byte-for-byte. Let's fire the live race: 8 simulated customers firing simultaneous bookings at our live Supabase database in Mumbai.<br><br>In under 300 milliseconds, all 8 resolve: exactly 1 booking confirmed, 7 kept their place, repeated taps return idempotent responses, and STOP requests hold. All 5 checks pass." | **Handoff & Verification (10 pts)**<br>Live benchmark reproducible by any evaluator in real-time. |
| **3:15 – 3:45**<br>*(30 sec)* | **Business Feedback & Iteration**<br><br>Show Git tag `v1-mba-handover` and demonstrate staff-aware matching change requested by MBA teammates. | "Refill was built through close collaboration with our business teammates. Our baseline release—tagged `v1-mba-handover`—handled generic salon capacity.<br><br>Our MBA partners pointed out that salon clients are loyal to specific stylists. They raised an `mba-request` issue for staff-aware scheduling. We negotiated and shipped staff-level skill filtering and absence blocking, allowing the desk to reassign or protect preferred stylist bookings without violating customer consent." | **Business Feedback & Adaptation (15 pts)**<br>Demonstrates clear engineering-business alignment tracked through git tags and issues. |
| **3:45 – 4:00**<br>*(15 sec)* | **Handoff & Closing**<br><br>Show clean-machine setup summary in `docs/SETUP_CHECK.md` and GitHub repository. | "Refill is completely reproducible. On a clean machine, `npm install`, `npm test`, `npm run race`, and `npm run build` all pass with zero configuration or API keys needed. Our entire architecture, test suite, and known limits are documented in the repository.<br><br>Thank you, and we welcome your questions!" | **Handoff, Team Contributions (10 pts)**<br>Strong closing emphasizing reliability, testing rigor, and clean engineering. |

---

## Defensive Q&A Cheat Sheet (What Judges Will Ask & How to Answer)

### Q1: "How do you mathematically guarantee that two people never get booked into the same chair?"
> **Vedanth / Dhruv:**  
> "We enforce isolation at the database engine level, not in browser memory. When `accept_offer` executes in Supabase Postgres, it initiates a single transaction that acquires an explicit row lock (`FOR UPDATE`) on the target slot row following a strict global hierarchy: `offer -> slot -> waitlist`.  
> Any concurrent request arriving in the same millisecond is forced to queue on the lock. The first transaction sees the slot in `'free'` status and transitions it to `'booked'`. When subsequent transactions acquire the lock, they inspect the slot, discover it is already `'booked'`, mark the offer `'waitlisted'`, and return the winner's booking ID.  
> As an absolute safety net, PostgreSQL enforces a partial unique index:  
> `create unique index bookings_one_per_slot on public.bookings (ws, slot_id) where status = 'confirmed';`  
> Even if application code failed, the database storage engine physically rejects a second confirmed booking."

---

### Q2: "Why not check whether the slot is free in React before sending the booking request?"
> **Vedanth:**  
> "Checking in the client introduces a classic Time-of-Check to Time-of-Use (TOCTOU) race condition. Two phones can easily read 'slot is free' at timestamp $T_0$. If both send an accept payload at $T_1$, client-side checking fails. In Refill, the front-end provides optimistic previews, but the PostgreSQL database is the single source of truth that serializes concurrent writes."

---

### Q3: "What happens if a customer experiences network lag and taps 'Accept' multiple times?"
> **Vedanth:**  
> "The operation is strictly idempotent. When `accept_offer` executes for an offer that has already been confirmed, the function detects `o.status = 'accepted'` and returns `outcome: 'ALREADY_CONFIRMED'` along with the original booking number. No second booking is created, and no error is thrown to the user."

---

### Q4: "How does Refill handle customer consent under privacy regulations like the DPDP Act?"
> **Vedanth:**  
> "Refill treats consent as a first-class state machine: `true`, `false`, or `null` (unknown). We enforce an absolute rule: unknown consent is never treated as permission. Consent is validated at two distinct gates: first, when the candidate list is evaluated for outreach, and second, right before the booking is committed. If a customer replies STOP or revokes consent via the desk, all pending offers are revoked instantly, and subsequent acceptance attempts fail with `NO_CONSENT`."

---

### Q5: "Could an attacker call your Supabase database directly and alter appointments?"
> **Vedanth:**  
> "No. Every database table has PostgreSQL Row Level Security (RLS) enabled with **zero policies** granted to public or anonymous roles. Direct `SELECT`, `INSERT`, `UPDATE`, or `DELETE` queries from the client key are rejected by the database. The client can only invoke 12 dedicated `SECURITY DEFINER` stored procedures that strictly validate UUIDs, enforce input constraints, and run through the rules engine."

---

### Q6: "Could someone else clone your repository and verify it without setup headaches?"
> **Vedanth:**  
> "Yes. That was my primary responsibility as reliability lead. I verified the entire repository on a clean machine: `npm install`, `npm run dev`, `npm test`, `npm run race`, and `npm run build` all pass out of the box with zero environment variables or paid API keys required. The entire setup check is recorded in `docs/SETUP_CHECK.md`."
