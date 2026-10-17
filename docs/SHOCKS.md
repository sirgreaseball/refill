# Market shocks: rehearsal script for the live app

Four things that go wrong in a real salon day, and the exact clicks to handle each one on the live app, <https://fillthechair.vercel.app> (v3.0.0).

> **Status: not yet rehearsed.** The clicks and the "you should see" lines below were worked out from the v3 source code (commit `71b7cde`) and the demo data. Nobody has run them on the live app yet. The **Seconds** and **What it actually showed** cells stay empty until a person runs each shock with a stopwatch. Wherever the screen differs from the expected text, write down what it really showed.

## Before you start

1. Open a **private / incognito window** and go to <https://fillthechair.vercel.app>. A fresh browser opens **Set up your business** (the real product). Tap **Try the demo** in the top bar: you get your own new demo day, so you won't touch the day anyone else is using.
2. Wait until the top bar shows **Demo · Exit** and the home page shows the Day Dial at **11:15**.
3. Tap **Front desk**. The page header shows **Front desk · 11:15**. Leave the clock at 11:15; every expected result below assumes it.
4. **Reset between shocks** so each one starts from the same day: tap the role pill (top right) → **Owner** → the round profile button (top right) → **Reset demo day** → **Tap again to reset the day**, then role pill → **Front desk**.

**How to time:** start the stopwatch on step 1 of a shock and stop it at the line marked ⏱.

Rules the app uses (owner defaults): a cancellation with under 2 h notice is *late*; a gap must start at least 10 min from now to be offered; an offer is held for 15 min; nobody gets more than 3 messages a day.

Prices below are the live app's current prices. Once this PR merges they change to the new Hyderabad prices in `data/salon/services.csv` (e.g. hair spa ₹1,500 → ₹1,600, haircut ₹600 → ₹650). The three new waitlist rows in the same PR (W15–W17) will also add to the "Not offered, and why" counts.

---

## 1. Late cancellation

*Harsh calls at 11:15 to cancel his 12:00 hair spa with Kabir: 45 minutes' notice.*

| # | Click | You should see |
|---|---|---|
| 1 | On the **Today** card, switch **Dial** to **Calendar**, then tap Kabir's **12:00 Harsh** block (on a phone: the list row **12:00 Harsh · Hair spa · 60 min · Kabir**). On the dial you can also tap Harsh's arc on Kabir's ring. | A sheet tagged **Booked**, heading **12:00–13:00**, line **Hair spa · 60 min · Kabir · Harsh** |
| 2 | Under **Cancelled?** → **Record a cancellation** | Two buttons: **Yes, Harsh cancelled** and **Keep it** |
| 3 | **Yes, Harsh cancelled** | Message **Late cancellation (45 min notice). The gap is open to fill.** The tag changes to **Open gap · late cancellation** and the line gains **· ₹1,500**. **Offer it to the waitlist — 6 fit**: Meera, Sameer, Omar, Tanvi, Vikram, Ira (the first three are ticked). **Not offered, and why — 8**. An **Undo the cancellation (Harsh)** button appears. |
| 4 | **Send 3 offers** | **3 offers sent. First to book gets it.** **Offers out — 3**: Meera, Sameer, Omar, each **Waiting for reply · reply by 11:30** |
| 5 | The arrow next to **Meera** (*Open Meera's offer here*) | Meera's phone view: **Hi Meera, a 60-minute hair slot just opened today at 12:00 with Kabir. It fits your Hair spa (60 min, ₹1,500). Want it?** Buttons **Book 12:00**, **Not today**, link **Stop messages from Kesar Salon**, and **Held for you until 11:30.** |
| 6 | **Book 12:00** | ⏱ **You're booked**, **12:00–13:00 with Kabir · booking #…** |
| 7 | Browser **Back** to the desk | Top figure **₹1,500 — Recovered today · 1 gap refilled**. Kabir's 12:00 block is green. |

**Why the other 8 weren't offered** (step 3, open *Not offered, and why*): Zoya and Kiran are *not free then*; Arnav, Nisha and Fatima have *no permission to message*; Leela and Aarav *need more time*; Rhea wants a facial and Kabir doesn't do skin (*different service*).

| Rehearsed on | By | Seconds (step 1 → ⏱) | What it actually showed (only where it differs) |
|---|---|---|---|
| 18 Oct 00:55 | Claude (live database, local build of main) | — | As written. Prices are now ₹1,600; booking #135. |

---

## 2. A staff member calls in sick

*Arjun phones at 11:15: he can't come in. Mark him out, then rebook his clients.*

| # | Click | You should see |
|---|---|---|
| 1 | **Team today** → the **Arjun 10:30–19:00 · In** chip | Message **Arjun is out. 4 booked clients to move.** The chip now says **Out**; the figure **Clients whose staff member is out** shows **4**. **Needs you now** lists **Kunal: Arjun is out** (14:00), **Tara** (15:00), **Manav** (16:30) and **Neha** (17:30), each marked **Move**, next to the 14:30 open gap that was already there. |
| 2 | **Manav: Arjun is out** | Sheet tagged **Needs a new time or staff member** with the note **Arjun is out today. Manav's Haircut needs someone who does hair, or a new time. Nothing moves until you or Manav choose.** |
| 3 | **Pick a new time** | Under **Same time, someone else**: **16:30 with Riya** (Riya is free 16:30–17:00), then any later times grouped by staff member |
| 4 | **16:30 with Riya** → **Move Manav to 16:30 with Riya** | ⏱ **Manav moved to 16:30 with Riya. 16:30 is held: Arjun is out.** Manav leaves the list and **Held gap: Arjun is out** appears at 16:30. |
| 5 | **Kunal: Arjun is out** → **Let Kunal choose** | A **Kunal's link** box with a QR code and the message **Hi Kunal, Arjun can't come in today, so your 14:00 Blow-dry needs a new time. Pick one that suits you here: …**, plus **Copy message** and **Open as Kunal** |
| 6 | **Open as Kunal** | Kunal's phone view: **Your appointment needs a new time**, **Booked now: 14:00–14:30 · Blow-dry · Arjun (out today)**, a list of times, and **Cancel my appointment instead** |
| 7 | Tap any time → **Move to … with …** | ⏱ **You're moved**, **Blow-dry at … with …. See you then.** |
| 8 | Back to the desk; do the same for **Tara** (step 2–4 with any time the list offers) | Tara moves; **Clients whose staff member is out** drops by one |
| 9 | **Neha: Arjun is out** → **Pick a new time** | **Nobody who does this service is free later today.** This is correct: her root colour needs 90 minutes and no hair stylist has a free 90-minute window left. Show **Let Neha choose** (she sees the same honest answer and can cancel), or **Record a cancellation**. The count only reaches **0** once Neha is cancelled. |

Nobody else is free at Kunal's, Tara's or Neha's exact time, so expect only later times for them. One question for the MBA team: **Lakshmi** (Arjun, 11:00–13:00, already started at 11:15) is *not* flagged, because the app treats an appointment in progress as already happening. Ask an owner what really happens when a stylist leaves in the middle of one.

| Rehearsed on | By | Seconds: mark out (1) | Seconds: desk move (2 → 4) | Seconds: client's own link (5 → 7) | What it actually showed |
|---|---|---|---|---|---|
| 18 Oct 00:55 | Claude | — | — | — | As written up to Tara. Neha has no 90-minute window anywhere, so step 9 replaced the old "reaches 0" line. |

---

## 3. A client needs a longer service than the free gap

*There is a 60-minute gap at 14:30 with Riya. Leela wants a 90-minute root colour and Aarav a 120-minute global colour. Neither fits.*

| # | Click | You should see |
|---|---|---|
| 1 | **Needs you now** → **Open gap · Hair spa** at 14:30 | Sheet tagged **Open gap**, **14:30–15:30**, **Hair spa · 60 min · Riya · ₹1,600**. **Offer it to the waitlist — 5 fit**: Meera, Zoya, Rhea, Omar, Naina |
| 2 | **Not offered, and why — 12** | ⏱ Leela: **Needs more time · Needs 90 min; the gap is 60 min** `DURATION_TOO_LONG`. Aarav: **Needs more time · Needs 120 min; the gap is 60 min**. The other 8 have other reasons (no permission, different service, not free then). |
| 3 | *(optional, shows it with a new client)* Dock → **Waitlist** → **Add someone** → Name **Test Long**, Service **Global colour · 120 min · ₹4,500**, **Yes** → **Add to waitlist** | **Test Long added to the waitlist.** |
| 4 | Dock → **Today** → the 14:30 gap → **Not offered, and why — 11** | **Test Long · Needs more time · Needs 120 min; the gap is 60 min**. Test Long never appears in the tick list, so they can't be offered the slot by mistake. |

The rules are checked in a fixed order (permission first, then service, then length, then time), so a client who said no to messages shows *No permission to message* even if their service is also too long.

| Rehearsed on | By | Seconds (step 1 → ⏱) | Seconds: add + check (3 → 4) | What it actually showed |
|---|---|---|---|---|
| 18 Oct 00:55 | Claude | — | — | 5 fit, 12 not offered (three waitlist clients were added since). Leela and Aarav: DURATION_TOO_LONG as written. |

---

## 4. A client withdraws consent

*Zoya gets an offer for the 14:30 gap and replies "stop".*

| # | Click | You should see |
|---|---|---|
| 1 | **Needs you now** → **Open gap · Hair spa** at 14:30 → **Send 3 offers** (Meera, Zoya, Rhea are ticked) | **3 offers sent. First to book gets it.** **Offers out — 3**, each **Waiting for reply · reply by 11:30** |
| 2 | The arrow next to **Zoya** | Zoya's phone view: **Hi Zoya, a 60-minute hair slot just opened today at 14:30 with Riya. It fits your Haircut (30 min, ₹600). Want it?** |
| 3 | **Stop messages from Kesar Salon** | ⏱ **Messages stopped. Kesar Salon will not message you again. This offer is closed.** The **Book** button is gone. |
| 4 | Browser **Back** → the 14:30 gap | Zoya's offer no longer says *Waiting for reply* (expected: **Withdrawn**). Zoya is now under **Not offered, and why**: **No permission to message · Said no to messages**. |
| 5 | Dock → **Waitlist** | Zoya's consent switch is on **No** |
| 6 | Dock → **Activity** | A line like **Zoya withdrew consent (customer replied STOP), 1 open offer withdrawn** |
| 7 | *(desk version: the client phones instead)* **Waitlist** → **Rhea** → **No** | ⏱ **Rhea will not be messaged; 1 open offer withdrawn.** |

Even if Zoya opens her old link again, it can't be booked: the database checks consent again at the moment of booking, not just when the offer was sent.

| Rehearsed on | By | Seconds: client stop (2 → 3) | Seconds: desk version (7) | What it actually showed |
|---|---|---|---|---|
| 18 Oct 00:55 | Claude | — | — | As written: Zoya's offer shows Withdrawn, she moves to No permission to message, the Activity log has both lines. | |
