const path = require('path')
const { P, Small, H1, H2, H3, Bullets, Steps, Tbl, Callout, Fig, Cover, Toc, build } = require('./lib')
const F = (n) => path.join(__dirname, 'figs', n)
const OUT = 'Z:/claude/refill/docs/team/Refill-MBA-Master.docx'
const x = (p, t) => (p / t).toFixed(1)

const body = [
  Cover({
    kicker: 'Business master document · MBA team',
    title: 'Refill, the business',
    subtitle: 'Everything the business side needs: the problem, the product in plain words, who pays and why, pricing and cost hypotheses, the growth experiment, the pilot plan, and the pitch.',
    image: F('cover.jpg'),
    meta: [
      ['Case', 'C29 · Appointment Recovery Desk · Fynd × NMIMS Hyderabad, 17–18 October 2026'],
      ['Try it', '[fillthechair.vercel.app](https://fillthechair.vercel.app) → "Try the demo" (no account needed)'],
      ['See it', 'Story page [fillthechair.vercel.app/splash](https://fillthechair.vercel.app/splash) · Film [youtu.be/5BfsKofkIHw](https://youtu.be/5BfsKofkIHw) (3:29)'],
      ['Team', 'Dhruv Sonar · Vedanth Raj · Parth Kachhara · Chirag Seervi · two MBA teammates'],
      ['Honesty rule', 'All demo data is synthetic. Every number marked **assumption** must be tested before it is claimed.'],
    ],
  }),
  Toc(),

  // ------------------------------------------------------------------ 1
  H1('Start here', '01 · How to use this document'),
  P('This is the business side of Refill in one place. It is written without technical terms. Where a number is a guess, it says **assumption**; where it is proven, it says how.'),
  H2('Try Refill in two minutes'),
  ...Steps([
    'Open [fillthechair.vercel.app](https://fillthechair.vercel.app) and tap **Try the demo** in the top bar. You get your own sample salon day (Kesar Salon), so you cannot break anyone else\'s.',
    'You land on the Day Dial at 11:15: the day as a watch face, one ring per staff member, one arc per appointment.',
    'Tap **Front desk**. Tap Kabir\'s **12:00 Harsh** appointment, then **Record a cancellation**. The slot turns amber, with ₹1,600 at stake.',
    'See **who fits** and **who is skipped, and why**. Tap **Send 3 offers**.',
    'Open **Two phones, one slot**: scan the two QR codes with two phones and tap Book together. Only one gets it.',
    'Switch the role pill to **Owner** to see money recovered and the rules. Open **Proof** (the Lab) to see the three case checks pass live.',
  ], 'steps'),
  P('To try it as a real business: **Create account** → "I run a business" → name your business, add staff and services. To try it as a client: open a business\'s join link or QR, say yes or no to messages, and join the waiting list.'),
  H2('What the case asks of the MBA team'),
  ...Tbl(['The brief says', 'What it means', 'Where it is in this document'], [
    ['Start with salon or tutoring-centre owner', 'The buyer is the owner of an appointment business', 'Sections 3, 5, 7'],
    ['Test per-location subscription; establish a price', 'One monthly price per location, and evidence for the number', 'Section 8'],
    ['Cost-to-serve', 'What it costs us to run Refill for one location', 'Section 9'],
    ['First-customer path', 'Exactly how we get the first paying salon', 'Section 10'],
    ['Growth experiment: opt-in messages with five consenting role players', 'A small, honest test of whether waitlist offers work on people', 'Section 11'],
    ['Product change to negotiate: service-duration and staff constraints', 'What the business side asked engineering to change, and the evidence it was done', 'Section 12'],
    ['Path to a real pilot: one calendar; filled cancellations, no-show rate, staff correction effort', 'A 30-day plan with three measurements', 'Section 13'],
    ['Separate observed evidence from assumptions', 'Never present a guess as a fact', 'Section 14'],
    ['Customer value, willingness to pay, the negotiated change, next 30-day test', 'The business proof', 'Sections 7, 8, 12, 13'],
    ['No claim of live revenue or production readiness from synthetic data', 'Say "in the demo", never "we earned"', 'Throughout'],
  ], [34, 36, 30], { zebra: true }),

  // ------------------------------------------------------------------ 2
  H1('The problem', '02 · Why this matters'),
  P('Every business that runs on appointments (salons, clinics, spas, physiotherapists, tutors) loses money when a client cancels at short notice. The chair or the room sits empty, the staff member is paid anyway, and the money for that hour is gone.'),
  ...Fig(F('film-pain.jpg'), 'The manual scramble: the desk calls around, two people say yes, and the slot is overbooked.', 13.5),
  H2('Four pains, from the front desk\'s point of view'),
  ...Tbl(['Pain', 'What happens today'], [
    ['The slot goes to waste', 'A cancellation an hour or two before is rarely refilled. The desk is busy and there is no quick way to find someone.'],
    ['The desk has to guess', 'They scroll a list and call people one by one, often offering the slot to someone who wants a different service or is not free.'],
    ['People get messages they never wanted', 'Messaging everyone annoys clients who never agreed to it and damages trust.'],
    ['Two people turn up for one slot', 'If two say yes at the same moment, a manual system can book both. Someone is turned away at the door.'],
  ], [28, 72]),
  Callout('Assumption to measure', ['How often short-notice cancellations happen, and what share is refilled today, varies by business. We have **not** measured this yet. The pilot (Section 13) measures it before and after.'], 'beat'),

  // ------------------------------------------------------------------ 3
  H1('What Refill does', '03 · The product in plain words'),
  P('**When a client cancels, Refill fills the slot with the next person who wants it, agreed to be contacted, and actually fits it.** It never puts two people in one slot, and it can always say why it chose who it chose.'),
  P('Think of it as a smart waiting list attached to the appointment book. The business does not change how it books appointments; Refill steps in only when something goes wrong: a cancellation, or a staff member calling in sick.'),
  ...Fig(F('film-solution.jpg'), 'The loop in three steps: a client cancels, the slot is offered to those who fit and said yes, the first to accept gets it.', 13.5),
  H2('How it works, in five steps'),
  ...Steps([
    '**A client cancels.** The desk records it. The slot turns amber on screen, with the money at stake beside it. Under two hours\' notice is flagged as late.',
    '**Refill finds who fits.** From the waiting list it picks people who want a service this staff member does, whose service fits in the time, who are free then, and who said yes to messages. Everyone left out gets a one-line reason.',
    '**The desk sends offers.** One tap sends an offer to the best few. Each offer is held for 15 minutes; nobody gets more than 3 offers a day.',
    '**First to accept gets it.** If two people tap Book at the same moment, exactly one gets it; the other is told politely and keeps their place.',
    '**The slot turns green.** The money is recovered and every step is written down for the owner.',
  ], 'steps1'),
  H2('What makes Refill different'),
  ...Tbl(['Promise', 'In plain words', 'Why a buyer cares'], [
    ['Never double-booked', 'The booking is decided in one place, like a ticket counter with one window. Two taps at the same instant still give one booking.', 'No client turned away at the door; no awkward apology.'],
    ['Only people who said yes', 'Consent is yes, no or never asked. Only yes is ever messaged, checked when the offer is sent and again when it is accepted. STOP cancels every open offer.', 'Trust, and safety under India\'s consent rules for messaging and personal data.'],
    ['Every decision explained', 'Who was offered, who was not, and why, in one sentence each. Exportable as a spreadsheet.', 'The owner can check the desk\'s work; disputes are easy to settle.'],
    ['Fits the real day', 'It knows which staff member does which service, their working hours, and who is out today.', 'Offers that clients can actually take; fewer wasted messages.'],
  ], [20, 46, 34]),
  Callout('The one technical idea worth knowing', ['The rules live in the database, not in the app on the screen. Even if someone used a hacked app, the database would refuse a double booking or a message to someone who said no. Judges can watch this proven live on the Proof page.'], 'act'),

  // ------------------------------------------------------------------ 4
  H1('Who uses Refill', '04 · Four people, four views'),
  P('Each person gets their own view and sees only what they need. Each link is private, so nobody can see or change what is not theirs.'),
  ...Tbl(['Who', 'What they see', 'What they can do'], [
    ['**Front desk**', '"What needs you now": open slots, clients who need moving, who is in today, the schedule, the waiting list.', 'Record cancellations, offer open slots, move an appointment, send a client a link to choose a new time, mark a staff member as out.'],
    ['**Owner**', 'Money recovered today, money still at risk, how offers went, who agreed to messages, how busy each staff member is.', 'Set the rules (how long an offer is held, how many messages a day, what counts as late). Create links for staff and the desk.'],
    ['**Staff member**', 'Only their own day, with clients\' first names.', 'Tap "I can\'t come in today". The desk sees it immediately.'],
    ['**Client**', 'Their place in the queue, their booking, any offer.', 'Join the waiting list (yes or no to messages), book or decline an offer, pick a new time, cancel, book an open time.'],
  ], [16, 42, 42]),
  ...Fig(F('film-desk_fit.jpg'), 'Front desk: the day as a dial, who fits the open slot, and who is skipped with a reason.', 13.5),
  ...Fig(F('film-client.jpg'), 'Client: the offer arrives on the phone; one tap books it.', 13.5),
  ...Fig(F('film-staff.jpg'), 'Staff: "I can\'t come in today" turns their ring coral; their clients are flagged; nothing moves until a person decides.'),
  ...Fig(F('film-owner.jpg'), 'Owner: cancelled, recovered and still-open money for the day (demo data), and how busy each staff member is.', 13.5),

  // ------------------------------------------------------------------ 5
  H1('A day at Kesar Salon', '05 · The demo story, with numbers'),
  P('Kesar Salon in Jubilee Hills (a made-up salon) has four staff: Riya (hair and skin), Arjun (hair), Meher (nails and skin) and Kabir (hair and nails). It is 11:15. Seventeen people are on the waiting list.'),
  ...Tbl(['Time', 'What happens', 'What Refill shows'], [
    ['11:15', 'Harsh cancels his 12:00 hair spa with Kabir (45 minutes\' notice).', 'The slot turns amber: ₹1,600 at stake. Flagged **late** (under 2 hours).'],
    ['11:15', 'The desk taps the slot.', '**6 fit**: Meera, Sameer, Omar, Tanvi, Vikram, Ira. **11 skipped**, each with a reason: 4 never said yes to messages, 2 want a service Kabir does not do, 2 need more than 60 minutes, 3 are not free at 12:00.'],
    ['11:15', 'The desk taps "Send 3 offers".', 'Meera, Sameer and Omar get an offer, held for 15 minutes.'],
    ['11:16', 'Meera and Sameer tap Book at the same second.', 'Meera gets it. Sameer is told someone was quicker and keeps his place.'],
    ['11:16', 'The slot is filled.', 'It turns green. The owner sees ₹1,600 recovered (demo data).'],
    ['Later', 'Arjun calls in sick.', 'His 4 remaining clients are flagged to move; his open offers are cancelled. The desk moves Manav to 16:30 with Riya, and sends another client a link to pick a time.'],
  ], [10, 38, 52], { zebra: true }),
  ...Fig(F('film-race.jpg'), 'Two phones, one slot: one booking; the other client keeps their place.', 13.5),

  // ------------------------------------------------------------------ 6
  H1('Customer value', '06 · Who gets what'),
  ...Tbl(['Person', 'Job to be done', 'Pain removed', 'Gain'], [
    ['Owner (buyer)', 'Keep chairs full and staff productive', 'Lost revenue from late cancellations; no visibility', 'Recovered revenue shown daily; rules they control; a record of every decision'],
    ['Front desk (user)', 'Fill a gap fast without upsetting anyone', 'Phone scramble, guesswork, double bookings', 'One tap shows who fits; one tap sends offers; the system handles the race'],
    ['Client', 'Get an earlier or a wanted slot', 'Missing out because nobody called; spam', 'Offers only if they said yes; one-tap booking; keeps their place if they miss'],
    ['Staff member', 'A full, predictable day', 'Idle hours; chaos when someone is out', 'Gaps refilled; when they are out, clients are moved by the desk, not lost'],
  ], [16, 26, 28, 30], { zebra: true }),
  H2('Value statement (for slides)'),
  P('**For appointment businesses that lose money to short-notice cancellations, Refill is a recovery desk that refills an empty slot in minutes with a client who fits and agreed to be contacted, never double-books, and shows the owner every rupee recovered. Unlike booking apps that broadcast to everyone or leave the desk to phone around, Refill checks every rule before a single message goes out.**'),

  // ------------------------------------------------------------------ 7
  H1('Market and competition', '07 · Where Refill sits'),
  Callout('Source and status', ['The table below comes from the MBA team\'s research (17 October). Prices are as given, in US dollars, and **not yet verified**. Claims about how competitors behave are hypotheses to confirm in owner interviews.'], 'beat'),
  ...Tbl(['Platform', 'Who it is for', 'How it handles waitlists', 'Pricing (as given, unverified)'], [
    ['Mangomint', 'Mid-to-large salons and spas (2–20+ staff)', 'Express booking, virtual waiting rooms, automated client flows', '$165–$375 / month by team size'],
    ['Vagaro', 'Multi-staff salons, barbers, fitness', 'Calendar, POS, waitlist tracking, paid SMS/email add-ons', 'From $30 / month for 1 calendar, more per staff calendar'],
    ['Fresha', 'Independent stylists, salons, wellness', 'Online self-booking, reminders, marketplace', 'Low base, plus transaction and messaging fees'],
    ['TutorBird', 'Private tutors and tutoring centres', 'Student waitlists; cancelled lessons become make-up slots', '$16.95 / month solo + $4.95 per extra tutor'],
    ['Calendly / Acuity', 'General appointments, solo tutors', 'Link booking and reminders; weak or no automatic waitlist backfill', '$10–$30+ per seat per month'],
  ], [16, 24, 34, 26], { zebra: true }),
  P('**India players to add before the pitch:** Zenoti (Hyderabad headquarters), Dingg, Zylu, Salonist, Wellnessta. Record for each: target segment, waitlist handling, consent handling, price in INR.'),
  H2('Gaps we answer'),
  ...Tbl(['Gap in existing apps', 'Refill\'s answer'], [
    ['Passive portals or blind broadcasts to everyone', 'Checks consent, duration and staff skill **before** any message'],
    ['Black-box rejections', 'An evidence log with a reason for every skip ("Needs 60 min; the gap is 30")'],
    ['Fragile edge cases (static roster, one-time consent)', 'Handles late cancellations, staff absence, different durations and consent withdrawn; the Lab shows before and after'],
    ['Per-seat pricing hurts businesses with many part-time staff', 'A flat price per location, anchored to recovered revenue'],
  ], [40, 60]),

  // ------------------------------------------------------------------ 8
  H1('Business model and pricing', '08 · Per-location subscription'),
  P('**Model:** one monthly subscription per location, regardless of how many staff. The price is anchored to what Refill recovers: if it refills two or three cancelled slots a month, it pays for itself.'),
  H2('How many refills pay for Refill?'),
  P('Using the demo salon\'s prices. This counts the full price of each refilled service; once we know a salon\'s margin, use contribution instead (**assumption**).'),
  ...Tbl(['Service (demo price)', 'At ₹999 / month', 'At ₹1,499 / month', 'At ₹1,999 / month'], [
    ['Haircut · ₹650', x(999, 650), x(1499, 650), x(1999, 650)],
    ['Manicure · ₹750', x(999, 750), x(1499, 750), x(1999, 750)],
    ['Gel polish or clean-up facial · ₹1,200', x(999, 1200), x(1499, 1200), x(1999, 1200)],
    ['Hair spa · ₹1,600', x(999, 1600), x(1499, 1600), x(1999, 1600)],
    ['Root colour · ₹2,500', x(999, 2500), x(1499, 2500), x(1999, 2500)],
    ['Hydra facial · ₹2,800', x(999, 2800), x(1499, 2800), x(1999, 2800)],
  ].map((r) => [r[0], `${r[1]} refills`, `${r[2]} refills`, `${r[3]} refills`]), [34, 22, 22, 22], { zebra: true }),
  Callout('Pricing hypotheses (all to be tested)', [
    '**H1.** A salon with 3+ staff will pay **₹1,499 per location per month** once shown its own recovered revenue.',
    '**H2.** Below ₹999 the price signals "toy"; above ₹1,999 it needs proof from the salon\'s own numbers.',
    '**H3.** Owners prefer a flat per-location price to per-staff pricing (most salons have part-time staff).',
    'None of these is proven. Section 11 and the pilot test them.',
  ], 'beat'),
  H2('How to test the price'),
  ...Bullets([
    '**Four price questions** (the Van Westendorp method) to each owner you interview: at what monthly price would Refill be so cheap you would doubt it; a bargain; getting expensive; too expensive to consider? Plot the answers; the overlap gives an acceptable range.',
    '**Three-plan choice:** show Basic ₹999 (1 location, offers by link), Standard ₹1,499 (adds WhatsApp/SMS offers, history), Plus ₹1,999 (adds multiple desks, exports). Record which they pick and why.',
    '**Pilot offer:** first month free, then the chosen price, with a promise to show recovered revenue every week.',
  ]),

  // ------------------------------------------------------------------ 9
  H1('Cost to serve', '09 · What one location costs us'),
  P('**Today:** the prototype runs on free plans (Supabase free, Vercel hobby). Our running cost for the demo is effectively **₹0**. A paying product needs paid plans and real messaging.'),
  ...Tbl(['Cost item', 'Estimate per location per month', 'Basis (verify before quoting)'], [
    ['Database and hosting', '≈ ₹40–90', 'Supabase Pro ≈ US$25/month and Vercel Pro ≈ US$20/month, shared across locations (shown for 50 locations, ≈ ₹85 per US$)'],
    ['Messages to clients (when added)', '≈ ₹10–25', 'About 3 offers per cancellation × 30 cancellations a month = 90 messages; WhatsApp utility message ≈ ₹0.12–0.15 each, SMS ≈ ₹0.15–0.25 plus one-time DLT registration'],
    ['Payment collection', '≈ 2% of the price', 'Typical Indian payment gateway fee'],
    ['Onboarding and support', '≈ ₹100–200 (**assumption**)', '30–60 minutes to set up staff and services, plus light monthly support'],
    ['**Total**', '**≈ ₹180–350**', 'At ₹1,499 that leaves roughly 75–88% gross margin (**illustrative**)'],
  ], [26, 26, 48], { zebra: true }),
  Callout('Where the cost really sits', ['Infrastructure is cheap. The real costs are **sales and onboarding time** and, later, **messaging**. Keep offers to the people who fit (Refill already does) and the message bill stays small.'], 'ink'),

  // ------------------------------------------------------------------ 10
  H1('First-customer path', '10 · Getting the first salon'),
  H2('Who to approach first'),
  ...Bullets([
    'Multi-staff salons (3–10 staff) in Hyderabad with a front desk and a known waiting list or regulars who would come at short notice.',
    'High-ticket services (colour, spa, facials), where one refill is worth ₹1,500–₹3,000.',
    'Owners who already use WhatsApp to talk to clients (consent is easier to collect).',
    'Second segment: tutoring centres (cancelled lessons become make-up slots).',
  ]),
  H2('The route'),
  ...Steps([
    '**Walk-in demo** (10 minutes) on a phone: Try the demo, cancel a slot, show the race and the owner\'s recovered money.',
    '**Ask for one thing:** their own staff list and services. Set up their business with them (about 30 minutes): Create account → I run a business → staff, hours, services.',
    '**Collect consent properly:** put their join QR at the counter; clients choose yes or no to offers themselves.',
    '**Run the 30-day pilot** (Section 13) with a weekly recovered-revenue message to the owner.',
    '**Convert:** after 30 days, show filled cancellations and recovered rupees; offer the price chosen in Section 8.',
  ], 'steps2'),
  H2('Objections and answers'),
  ...Tbl(['Owner says', 'Answer'], [
    ['"We already use a booking app."', 'Refill sits on top of the booking you already do and only acts when a slot is cancelled. (Calendar sync is on the roadmap.)'],
    ['"My clients will be annoyed by messages."', 'Only clients who said yes are ever messaged, never more than 3 a day, and STOP stops everything.'],
    ['"What if two people turn up?"', 'Impossible by design: one slot, one booking, even if they tap at the same second.'],
    ['"Is it hard for my receptionist?"', 'Two taps: record the cancellation, send offers. The system does the rest.'],
    ['"What does it cost?"', 'One flat monthly price per location, and it shows every week how much it recovered.'],
  ], [36, 64]),

  // ------------------------------------------------------------------ 11
  H1('Growth experiment', '11 · Five consenting role players'),
  P('**Goal:** test whether people on a waiting list respond to an opt-in offer, quickly enough, and understand it, using five people who have agreed to take part.'),
  H2('Protocol'),
  ...Steps([
    'Recruit 5 role players. Explain the test; get their **written yes** to receive offers. Record their consent and the time.',
    'Each joins the demo salon\'s waiting list from the join QR on their own phone and chooses "yes" to offers.',
    'The desk (one teammate) records a cancellation and sends offers to the role players who fit.',
    'Each role player responds naturally: Book, No, or ignore. Run two rounds, including one where two of them tap at the same moment.',
    'Ask each three questions afterwards: Was the offer clear? Would you have taken a real slot like this? Would you want these offers from your salon?',
    'Export the evidence log (Activity → CSV) as the record.',
  ], 'steps3'),
  H2('What to record'),
  ...Tbl(['Role player', 'Approached (time, how)', 'Consent recorded', 'Response (Book / No / none)', 'Time to respond', 'Understood the offer? (1–5)', 'Would use for real? (Y/N, why)'], [
    ['1', '', '', '', '', '', ''], ['2', '', '', '', '', '', ''], ['3', '', '', '', '', '', ''], ['4', '', '', '', '', '', ''], ['5', '', '', '', '', '', ''],
  ], [10, 16, 12, 16, 12, 14, 20]),
  H2('What counts as a useful result'),
  ...Bullets([
    'At least 3 of 5 respond within the 15-minute hold.',
    'At least 4 of 5 rate the offer 4 or 5 for clarity.',
    'The simultaneous-tap round produces exactly one booking, and the other person understands they kept their place.',
    'Nobody who said no, or was never asked, received an offer (check the log).',
  ]),
  Callout('Ethics', ['Use only people who agreed in writing. Use the demo salon (synthetic data), never a real business\'s clients. Delete their phone numbers and notes after the pitch.'], 'ink'),

  // ------------------------------------------------------------------ 12
  H1('The negotiated product change', '12 · Duration and staff constraints'),
  P('The brief asks the business team to negotiate a product change ("add service-duration and staff constraints before outreach") and to save the starting state, the negotiated scope and the final evidence.'),
  ...Tbl(['', 'What it was'], [
    ['**Starting state (v1)**', 'A free slot was matched on the slot\'s own service type. It did not know who works the slot, their skills or their hours, and a cancellation could only be cancelled, not moved.'],
    ['**Business feedback**', 'A gap belongs to a staff member: anyone they can serve should be offered it. Durations must fit before anyone is messaged. Staff go home or call in sick, and clients then need moving, not losing.'],
    ['**Negotiated scope (v2)**', '1. Match on the staff member\'s skills, not the slot\'s label. 2. Check duration before outreach, and again at booking. 3. Working hours per staff member. 4. Staff absence: cancel their offers, hold their gaps, flag their clients. 5. Rescheduling: the desk picks a new time, or the client gets a link to choose.'],
    ['**Final evidence**', 'Built and live. Tested by 51 automated tests, 28 live database checks and 14 cross-role flow checks; visible on the Proof page. While building it we found and fixed a real flaw: without working hours, a client could have been moved onto someone who had already gone home.'],
  ], [24, 76]),
  P('**How to present it:** before (v1 screenshot or description), what you asked for and why (owner interviews), what was agreed and left out, and the proof (the Lab, the tests).'),

  // ------------------------------------------------------------------ 13
  H1('Path to a real pilot', '13 · One calendar, 30 days'),
  P('**Pilot one calendar at one salon for 30 days** and measure three things, before and during, with the owner\'s and clients\' consent.'),
  H2('The three measurements'),
  ...Tbl(['Measure', 'Definition', 'How we get it'], [
    ['**Filled cancellations**', 'Cancelled slots refilled ÷ all cancelled slots, per week', 'From Refill\'s own log and history (every refill is marked)'],
    ['**No-show rate**', 'Clients who did not turn up ÷ appointments, per week', 'A simple daily tally by the desk (Refill does not track no-shows automatically yet)'],
    ['**Staff correction effort**', 'Minutes per day the desk spends fixing the schedule, and the number of manual changes', 'A 1-minute end-of-day log, plus moves and undos counted from Refill\'s log'],
  ], [22, 40, 38]),
  H2('Week by week'),
  ...Tbl(['Week', 'What happens'], [
    ['0 (before)', 'One week of baseline: count cancellations, refills, no-shows and correction minutes the old way.'],
    ['1', 'Set up the business (staff, hours, services); QR at the counter for client sign-up with consent; train the desk (15 minutes).'],
    ['2', 'Refill in daily use. Weekly message to the owner: cancellations, refilled, recovered rupees.'],
    ['3', 'Adjust the owner\'s rules if needed (hold time, messages per day). Interview the desk and 3 clients.'],
    ['4', 'Final numbers versus baseline. Price conversation using the salon\'s own recovered revenue.'],
  ], [16, 84], { zebra: true }),
  Callout('Success thresholds (assumptions to agree with the owner first)', ['Filled cancellations clearly above baseline (for example, from under 20% to over 50%); no increase in no-shows; correction effort down. Agree the exact thresholds before the pilot starts, not after.'], 'beat'),

  // ------------------------------------------------------------------ 14
  H1('Evidence versus assumptions', '14 · What we know and what we guess'),
  ...Tbl(['Statement', 'Status', 'Source'], [
    ['Two clients tapping at the same moment get exactly one booking', '**Observed**', 'Live race test (8 phones, 3 runs), Proof page'],
    ['Clients who did not say yes are never messaged', '**Observed**', 'Automated tests and live database checks'],
    ['A 60-minute service never takes a 30-minute slot', '**Observed**', 'Automated tests, Proof page'],
    ['The desk can refill a slot in two taps', '**Observed (demo)**', 'Demo walkthrough, film'],
    ['The demo salon recovers ₹1,600 from Harsh\'s slot', '**Demo only**', 'Synthetic data; not revenue'],
    ['Salons lose meaningful revenue to late cancellations', '**Assumption**', 'To measure in pilot week 0'],
    ['Waitlisted clients accept short-notice offers', '**Assumption**', 'Growth experiment (Section 11), then the pilot'],
    ['Owners will pay ₹999–₹1,999 per location per month', '**Assumption**', 'Price questions and pilot (Section 8)'],
    ['Messaging costs ₹10–25 per location per month', '**Estimate**', 'Provider rate cards; verify'],
    ['The desk will use it on a busy day', '**Assumption**', 'Pilot weeks 2–3, desk interview'],
  ], [50, 18, 32], { zebra: true }),

  // ------------------------------------------------------------------ 15
  H1('Risks and how we handle them', '15 · What could go wrong'),
  ...Tbl(['Risk', 'Why it matters', 'Mitigation'], [
    ['Messaging rules in India', 'SMS needs DLT registration and approved templates; WhatsApp needs approved templates', 'Offers already work as links and QR codes; add a registered provider before scale'],
    ['Personal data and consent', 'India\'s Digital Personal Data Protection Act, 2023 requires clear consent', 'Consent-first design: yes/no/never asked, recorded with time and source; STOP; delete account'],
    ['Desk adoption', 'If the receptionist does not use it, nothing happens', 'Two-tap flow; 15-minute training; weekly owner report keeps it visible'],
    ['Existing booking apps', 'Salons may not want a second tool', 'Position as an add-on that acts only on cancellations; calendar sync on the roadmap'],
    ['Low waitlist volume', 'No one to offer the slot to', 'Join QR at the counter and on Instagram; clients book open times themselves too'],
    ['Over-claiming', 'Judges penalise claims from synthetic data', 'Say "in the demo"; use Section 14 on a slide'],
  ], [20, 40, 40], { zebra: true }),

  // ------------------------------------------------------------------ 16
  H1('Pitch kit', '16 · What to say'),
  H2('30-second pitch'),
  P('"Every salon loses money when a client cancels at the last minute: the chair sits empty and the desk phones around. **Refill** fills that slot in minutes. It offers it only to waiting clients who fit the service and agreed to be contacted, the first to tap Book gets it, and it is impossible to double-book. The owner sees every rupee recovered. We\'re testing a flat monthly price per location, and our next step is a 30-day pilot on one real salon calendar."'),
  H2('Numbers you can say (and how to say them)'),
  ...Bullets([
    '"In our demo day, one late cancellation put **₹1,600** at risk; Refill refilled it in two taps." (demo data)',
    '"Of 17 people waiting, **6 fit** and **11 were skipped**, each with a reason." (demo data)',
    '"Offers are held **15 minutes**; nobody gets more than **3 a day**; under **2 hours** is a late cancellation." (owner can change these)',
    '"**51** automated tests, **28** live database checks and a live race test all pass." (observed)',
  ]),
  H2('Questions the business judges may ask'),
  ...Tbl(['Question', 'Answer'], [
    ['Who pays?', 'The business owner, one flat monthly price per location.'],
    ['Why would a salon switch?', 'It does not switch; Refill sits beside its booking and only acts on cancellations. It pays for itself with two or three refills a month.'],
    ['How do you know clients want this?', 'We do not yet; that is the growth experiment and the pilot. What we know is that the product works and never double-books.'],
    ['What about spam and consent?', 'Only clients who said yes are messaged, at most 3 a day, and STOP cancels everything.'],
    ['What did you change after feedback?', 'Staff and duration constraints before outreach, staff working hours, and rescheduling instead of only cancelling (Section 12).'],
    ['What can\'t it do yet?', 'Real SMS or WhatsApp (offers are links and QR codes today), booking future dates, and calendar sync with other apps.'],
  ], [30, 70], { zebra: true }),
  H2('Market shocks: how Refill responds'),
  ...Tbl(['Shock', 'What Refill does'], [
    ['Late cancellation (under 2 hours)', 'Flags it as late, opens the gap, shows who fits, sends offers held for 15 minutes but never past the time a client could still arrive.'],
    ['Staff member absent', 'Cancels their open offers, holds their gaps, flags their clients; the desk moves them or sends a link to choose. Nothing moves on its own.'],
    ['Different service duration', 'A shorter service may take a longer gap; a longer one is never offered a shorter gap.'],
    ['Client withdraws consent', 'Every open offer to them is cancelled at once; they are never messaged again unless they say yes.'],
  ], [30, 70]),

  // ------------------------------------------------------------------ 17
  H1('What works today', '17 · In plain words'),
  ...Tbl(['Works today (live)', 'Not yet'], [
    ['Recording cancellations, finding who fits with reasons, sending offers', 'Real SMS or WhatsApp messages (offers are links and QR codes)'],
    ['One booking per slot, even with simultaneous taps', 'Booking future dates (one day at a time today)'],
    ['Consent yes / no / never asked; STOP; message cap; offer hold', 'Password reset by email; Google sign-in'],
    ['Staff absence, working hours, moving appointments', 'Calendar sync with other booking apps'],
    ['Accounts for owners and clients; setting up a real business', 'No-show tracking inside the app'],
    ['Clients joining, booking offers and open times themselves', 'Payments and invoicing'],
    ['Owner view: money recovered, rules, team links, history', 'A dashboard across many locations'],
    ['Evidence log exported as a spreadsheet', '-'],
  ], [50, 50], { zebra: true }),
  H2('Words you will see on screen'),
  ...Tbl(['On screen', 'Meaning'], [
    ['Amber slot', 'An open gap that can be offered'],
    ['Green slot', 'Refilled'],
    ['Coral / red', 'Someone needs moving, or a staff member is out'],
    ['No permission to message', 'The client has not said yes to messages'],
    ['Different service', 'This staff member does not do what the client wants'],
    ['Needs more time', 'The service is longer than the gap'],
    ['Not free then', 'The client is not available at that time'],
    ['Messaged enough today', 'The client has reached the daily limit'],
    ['Late', 'Cancelled with under 2 hours\' notice'],
  ], [32, 68], { zebra: true }),
]

build({ file: OUT, title: 'Refill: business master document', footer: 'Refill · MBA master document', body }).then(() => console.log('wrote', OUT))
