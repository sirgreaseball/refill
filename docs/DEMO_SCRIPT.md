# Refill: 4-minute demo script

**Event:** Fynd × NMIMS Hyderabad · Case C29, *Appointment Recovery Desk*
**Live app:** <https://fillthechair.vercel.app> · **Proof page:** <https://fillthechair.vercel.app/#/lab>
**Target:** 4:00 demo, then 3:00 Q&A. First draft by Vedanth Raj; rewritten 18 Oct for the current product (accounts, Try the demo, the Day Dial). Every click below is from the rehearsed paths in `docs/SHOCKS.md`.

---

## Before you start (5 minutes before)

1. **Laptop, main window:** open the live app and sign in as the owner account you made for the demo (any email works; email confirmation is off). You should land on that business's desk.
2. **Laptop, private window:** open the live app, tap **Try the demo** in the top bar, wait for **Demo · Exit** and the Day Dial at **11:15**. If this demo day was used in rehearsal, reset it: role pill → **Owner** → the round profile button (top right) → **Reset demo day** → **Tap again to reset the day**. The **Now** button beside the demo clock must be off (not lit), or the clock follows the real time.
3. **Two phones** with their cameras ready (for the race in 1:25). A third person can hold the second phone.
4. Close every other tab. Turn off notifications.

---

## Run sheet

| Time | On screen | Say | Shows |
|---|---|---|---|
| **0:00–0:20** | The signed-out start page: **Every cancelled appointment, filled again.** | "When a client cancels at short notice, the slot sits empty and the money is gone. The front desk scrambles, calls people one by one, or messages a whole list that never agreed to it. Refill fixes that moment." | The problem |
| **0:20–0:40** | The main window: your real business's desk. Briefly the profile menu (round initial, top right): **Settings**, **Sign out**, and the Setup page heading **Your business, ready in a minute**. | "This is a real product, not a mock-up. A business signs up, says what it offers and who does it, and its desk is ready. A salon, a clinic, a tutor: the rules are the same. For the story, we'll use a busy salon day." Tap **Try the demo** (or switch to the private window). | Real product, any appointment business |
| **0:40–1:00** | Demo **Home**: the Day Dial. | "The day is a watch face. One ring per staff member, one arc per appointment. Amber is an open slot, money walking out. Green means refilled. Red means someone needs moving." Tap **Front desk**. | The centrepiece; the journey begins |
| **1:00–1:25** | **Today** opens on the **Calendar** (the Dial is the other toggle): tap Kabir's **12:00 Harsh** block → **Record a cancellation** → **Yes, Harsh cancelled**. | "Harsh cancels his 12:00 hair spa. 45 minutes' notice, so Refill flags it late. The slot turns amber, ₹1,600 at stake." Open **Not offered, and why**. "Refill already knows who fits. Arnav never agreed to messages, so he is never contacted. Leela needs more time than the gap. Every skip has a reason." | **Case check 1** (duration) and **case check 3** (no consent, no outreach) |
| **1:25–2:05** | **Send 3 offers** → **Two phones, one slot**. Two phones scan the two QR codes; on "three", both tap **Book**. (Or **Tap both at once** on the laptop.) | "Two people say yes at the same moment. Three, two, one. One phone says **You're booked**. The other is told someone got there first and keeps their place. The database allows exactly one booking per slot, whatever happens." Back on the desk: the slot is green, **Recovered today** counts up. | **Case check 2**: one confirmed, one waitlisted |
| **2:05–2:45** | **Team today** → tap **Arjun · In** (now **Out**). **Needs you now** turns red. Tap **Manav** → **Pick a new time** → **16:30 with Riya** → **Move**. Then **Kunal** → **Let Kunal choose** → **Open as Kunal** → pick a time. | "Arjun calls in sick. Nothing moves on its own; his clients are flagged. The desk moves Manav to Riya at the same time. Kunal isn't reachable, so we send him a link: he sees only times that truly work and picks one. Rescheduling is the change our business team asked for." | Staff absence; the post-feedback change |
| **2:45–3:15** | Role pill → **Owner**: Overview (money recovered, still open, passed unfilled), then **Rules** and **Who can do what**. | "The owner sees the money and sets the rules: how long an offer is held, how many messages a day, what counts as late. Each person has their own access: owner, front desk, staff, client. The database checks it on every action, not the page." | Business value; roles enforced |
| **3:15–3:45** | **Proof for judges** (`#/lab`): the pass count, then **Run live race**. | "Don't take our word for it. The three case checks run live here, against the organiser's fixture. This button fires eight bookings at one slot on the live database: one booking, seven keep their place, every time." | Reliability, reproducible by judges |
| **3:45–4:00** | Back to Home. | "51 automated tests, 28 live database checks and the race all pass. Everything is in the repository with a setup check. Refill: every cancelled appointment, filled again. Thank you." | Handoff and close |

**Heads-up on the race:** whoever wins books their own service, so *Recovered today* shows that client's price: ₹1,600 if Meera (hair spa) wins, ₹750 if Sameer (manicure) wins. Say "the money for the booking that came back", not a fixed number.

**Rehearsed on live, 18 Oct ~01:55:** every step above matched, word for word (late cancel toast, 11 not offered with reasons, 3 offers, one booking from the race, Arjun out with 4 clients, Manav to 16:30 with Riya, Kunal's link and move).

**If something misbehaves:** carry on from the next row. The private-window demo can be reset in ten seconds (Owner → profile button → Reset demo day). If the network drops, the Lab's three case checks still run in the browser.

---

## Q&A cheat sheet

**How do you guarantee two people never get the same slot?**
Booking happens inside the database, not the browser. The booking function locks the offer, then the slot, then the client's entry, in that order everywhere, so simultaneous taps queue up. The first sees the slot free and books it; the rest find it taken, keep their queue place and are told who won. As a final safety net, a unique index allows only one confirmed booking per slot. The live race on the Lab page proves it on demand.

**Why not check availability in the app before booking?**
Two phones can both read "free" at the same instant (time-of-check to time-of-use). The app only previews; the database is the single source of truth.

**What if a client taps Book twice?**
Nothing extra happens. A repeated tap returns the same booking number.

**How is consent handled?**
Consent is yes, no or not asked, and only yes may be messaged. It is checked before any offer and again at the moment of booking. STOP, or switching messages off on the client's page, withdraws every open offer at once. Sign-up never pre-ticks consent. At most 3 messages a day; the owner can lower that.

**What did you change after the business team's feedback?**
Rescheduling. The desk can move an appointment, or send the client a link to choose a new time, instead of only cancelling. While building it we found and fixed a real flaw: staff now have working hours, so nobody is ever moved onto someone who has gone home.

**Could someone change data by calling the database directly?**
No. Every table has row-level security with no policies for the public key, so direct reads and writes are refused. Everything goes through checked functions. Owners sign in with an account; staff and clients use private links. The database checks the role on every call, and rate limits stop floods.

**Is it only for salons?**
No. The engine knows staff, skills, working hours, services, a waitlist and consent. A business picks its own services at setup; a tuition centre and a spa are already running as test businesses.

**What can't it do yet?** (Say it plainly.)
A live business books one day at a time, with no future dates yet. Clients' "places" are kept per device unless they sign in. There is no admin console for the whole platform yet. Messages are simulated: no real SMS or WhatsApp is sent.

**Can anyone reproduce it?**
Yes. `npm ci`, `npm test`, `npm run dbtest`, `npm run race` and `npm run build` all run from a clean checkout; see `docs/SETUP_CHECK.md`.
