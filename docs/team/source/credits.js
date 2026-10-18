// Supporting document: everything Refill uses, borrows or learned from, the AI tools, and who did what.
const { P, Small, H1, H2, Bullets, Tbl, Callout, Cover, build } = require('./lib')
const OUT = 'Z:/claude/refill/docs/submission/Refill-Credits-and-Inspirations.docx'

const body = [
  Cover({
    kicker: 'Supporting document · Credits',
    title: 'Credits and inspirations',
    subtitle: 'Everything Refill is built on, borrowed from or learned from, with licences, plus the AI tools we used and who did what.',
    meta: [
      ['Team', 'Team C29 · Fynd × NMIMS Hyderabad Product & Business Simulation'],
      ['Case', 'C29 Appointment Recovery Desk'],
      ['Live app', '[fillthechair.vercel.app](https://fillthechair.vercel.app)'],
      ['Repository', '[github.com/sirgreaseball/refill](https://github.com/sirgreaseball/refill)'],
      ['Companion file', '`Refill-Citations.xlsx`: every claim we make, with its source or our test evidence'],
      ['Date', '18 October 2026'],
    ],
  }),

  H1('What we used', '01 · Data, software, services, fonts'),
  P('This part lists what Refill runs on and what we used to make the film, the deck and these documents. Every library is open source or free to use for a project like ours; the licence is named next to it.'),

  H2('The case and the data'),
  ...Tbl(['What', 'Where it came from', 'How we used it'], [
    ['Case C29 brief, the three scored checks, the edge cases and the pilot path', 'Fynd × NMIMS Hyderabad, Use Case Book v3, p. 32 (organisers)', 'The product scope, the Lab and the tests follow it word for word'],
    ['Starter fixture `Starter_Data/C29/fixture.json`', 'Organisers', 'Kept as scenario C01 (W1 takes S2) in `tests/core-scenarios.json`'],
    ['Kesar Salon, the demo salon: staff, services, Hyderabad mid-range prices, the waiting list', 'Written by our team (Chirag Seervi), `data/salon/*.csv`', 'Synthetic. Every name is invented; no real customer data is used anywhere'],
    ['Scenario tests P01–P12', 'Written by our team (Parth Kachhara), `tests/scenarios.json`', 'Run by `npm test` on every change'],
    ['Market-shock rehearsal', 'Written by our team (Chirag Seervi), `docs/SHOCKS.md`', 'Click paths for late cancel, staff absence, duration change, consent withdrawal'],
  ], [34, 34, 32], { zebra: true }),

  H2('Software inside the app'),
  ...Tbl(['Library', 'What it does in Refill', 'Licence'], [
    ['React 19, React DOM', 'Every screen', 'MIT'],
    ['Vite 8, @vitejs/plugin-react', 'Build and development server', 'MIT'],
    ['TypeScript 6', 'Types across the app and tests', 'Apache-2.0'],
    ['Vitest 5', 'The 51 rule and scenario tests', 'MIT'],
    ['oxlint', 'Code checks', 'MIT'],
    ['GSAP 3.15 with ScrollTrigger (GreenSock)', 'Scroll-driven story on the splash page', 'GreenSock Standard "no charge" licence'],
    ['Lenis 1.3 (darkroom.engineering)', 'Smooth scrolling on the splash page', 'MIT'],
    ['qrcode (node-qrcode)', 'QR codes for the client sign-up link', 'MIT'],
  ], [34, 44, 22], { zebra: true }),

  H2('Services'),
  ...Tbl(['Service', 'What it does', 'Plan'], [
    ['Supabase', 'PostgreSQL database (every booking rule runs here) and email-and-password sign-in', 'Free plan'],
    ['Vercel', 'Hosting; every push to `main` deploys', 'Hobby plan'],
    ['GitHub', 'Code, issues, pull requests, CI that runs the tests on each pull request', 'Free'],
    ['YouTube', 'Hosts the product film (unlisted)', 'Free'],
  ], [22, 56, 22], { zebra: true }),

  H2('Fonts'),
  ...Tbl(['Font', 'Designer / source', 'Licence'], [
    ['Satoshi, Clash Display', 'Indian Type Foundry, served by Fontshare', 'ITF Free Font License (free for personal and commercial use)'],
    ['JetBrains Mono', 'JetBrains, served by Google Fonts', 'SIL Open Font License 1.1'],
    ['Fraunces, DM Mono (team guides only)', 'Google Fonts', 'SIL Open Font License 1.1'],
    ['Arial (documents and workbook)', 'Monotype, bundled with Windows', 'System font'],
  ], [30, 36, 34], { zebra: true }),

  H2('The film, the deck and the documents'),
  ...Tbl(['Tool', 'What we made with it', 'Licence / terms'], [
    ['Remotion 4', 'The 3:29 product film, built as React code in `video/`', 'Remotion License (free for individuals and small teams)'],
    ['ElevenLabs', 'Narration: premade voice "Sarah", model eleven_multilingual_v2', 'Free plan; credited on the film\'s end card as the free plan requires'],
    ['Our own scripts (`video/tools/sfx.py`, `music.py`)', 'All 29 sound effects and the music bed, synthesised from scratch', 'Ours; no third-party audio'],
    ['pptxgenjs', 'The final deck, dark and light', 'MIT'],
    ['docx', 'The Word documents, this one included', 'MIT'],
    ['openpyxl', 'The citations workbook', 'MIT'],
    ['Playwright', 'Screenshots of the live app for the deck and README', 'Apache-2.0'],
    ['Pillow', 'Composing screenshots', 'MIT-CMU (HPND)'],
    ['Microsoft PowerPoint, Word, Excel', 'Font embedding, contents pages, PDF export', 'Licensed Microsoft 365'],
  ], [30, 44, 26], { zebra: true }),

  H1('What inspired us', '02 · Design, product ideas, techniques, research'),
  P('We studied other products and research before building. This part names each source of an idea and says what we took from it. We took ideas and patterns, never code, artwork or copy.'),

  H2('Design'),
  ...Tbl(['Where in Refill', 'Inspired by', 'What we took'], [
    ['The Day Dial (front desk, splash, sign-in)', 'Chronograph watch faces', 'The day as a watch face: one ring per staff member, one arc per appointment, a hand at the current time. Colour only where it means something: lime filled, amber open, coral needs moving.'],
    ['Splash story page', 'lusion.co, Apple product pages, Awwwards Sites of the Day', 'The feel only: a story scrubbed by the scroll and a cursor that drives the scene. Colours, layout and copy are Refill\'s own.'],
    ['Sign-in: heading with a switch link instead of tabs', 'Linear, Resend', 'The pattern'],
    ['Sign-in: show-password inside the field', 'Stripe, Cal.com', 'The pattern'],
    ['Sign-in: an "or" rule before other ways in', 'Clerk', 'The pattern'],
    ['Sign-in: the brand on its own panel beside the form', 'Stripe, Supabase', 'The pattern; our panel plays a refill on the Day Dial'],
    ['Front-desk calendar with one column per staff member', 'The staff-column calendars common in salon software', 'The layout, with Refill\'s colour key (open, refilled, needs moving, booked)'],
    ['Glass top bar and dock', 'Apple\'s translucent materials', 'A blurred bar and dock over the content'],
    ['Motion and build techniques', 'Our own earlier projects: Threshold, Sandbox, Cascade', 'Patterns reused from our own code'],
  ], [30, 28, 42], { zebra: true }),

  H2('Product ideas from other products'),
  ...Tbl(['Idea', 'Seen in', 'What Refill does differently'], [
    ['A waitlist that fills gaps left by last-minute cancellations', 'Square Appointments, Fresha, Zenoti, Vagaro, Mangomint (citations C25–C29)', 'Offers go only to clients who fit the duration, the staff member\'s skills and hours, and their own free time, and who said yes to messages. The database enforces every rule, so no screen can skip it.'],
    ['Consent recorded with time and source', 'India\'s Digital Personal Data Protection Act, 2023 and TRAI\'s consent register for SMS (C18, C20)', 'Three states, never pre-ticked: yes, no, never asked. Only yes is messaged, checked when offers go out and again at booking.'],
    ['One-step opt-out', 'The STOP convention in text messaging', 'One STOP link withdraws every open offer at once.'],
    ['Late-cancellation windows and message limits', 'Common salon cancellation policies and anti-spam practice', 'Owner-set defaults: under 2 hours is late, offers held 15 minutes, at most 3 offers a client a day, no offers inside 10 minutes of the start.'],
    ['An evidence log with a reason for every decision, and edge-case toggles with before/after export', 'Our MBA team\'s research on the case', 'Every offer, skip, booking, expiry, move and undo is logged with a rule code and exports as CSV or JSON.'],
    ['Prepayment and no-show research', 'Treatwell, Booksy, Fresha (C11, C35, C36)', 'Shaped how we frame the problem. Deposits are not a Refill feature yet.'],
  ], [28, 32, 40], { zebra: true }),

  H2('Engineering techniques'),
  ...Bullets([
    '**One slot, one booking:** a PostgreSQL row lock taken in a fixed order, plus a unique index on confirmed bookings. Both are standard PostgreSQL features.',
    '**The database as the only door:** the app calls database functions; tables have no direct client access. This is a common Supabase pattern.',
    '**Installable app:** a web app manifest and the View Transitions API, both web-platform standards.',
  ]),

  H2('Research we read'),
  P('The outside facts behind the deck and the documents (market size, cancellation losses, software churn, prices, regulation, and the psychology of buying time) are listed one by one, with links and what each source says, in `Refill-Citations.xlsx`. Six of them need a small correction before final use; the workbook names each fix.'),

  H1('AI tools and the team', '03 · Disclosure and credits'),
  H2('AI tools we used'),
  ...Tbl(['Tool', 'How we used it'], [
    ['Claude Code (Anthropic)', 'Dhruv\'s coding and writing assistant for the app, the database, the tests, the film, the deck build and these documents. Every change was reviewed, tested and committed by Dhruv; the tests in `Refill-Citations.xlsx` (Product evidence) are what prove the result.'],
    ['AI coding assistants (teammates)', 'Used on teammates\' own branches under the rules in `AGENTS.md`: which files each person may touch, and no direct pushes to `main`.'],
    ['ElevenLabs', 'The AI voice that narrates the film.'],
    ['Design guidance for the assistant', 'Written design rules kept in `.claude/skills/` (flagship-feel, design-taste-frontend, emil-design-eng, apple-design).'],
  ], [30, 70], { zebra: true }),
  Callout('What AI did not do', ['It did not invent data: the demo salon is synthetic and labelled as such, and every outside number is checked against its source in the citations workbook.', 'It did not decide what to build: the scope comes from the case brief and the team\'s choices.'], 'act'),

  H2('Who did what'),
  ...Tbl(['Person', 'Team', 'Contribution'], [
    ['Vedanth Raj', 'B.Tech · team lead', 'Reliability and handoff: clean-machine setup check (`docs/SETUP_CHECK.md`), known limits, demo script, engineering presentation.'],
    ['Dhruv Sonar', 'B.Tech', 'Product and code: rules engine, database and its guarantees, every screen and the design system, deployment, the film, the deck build and the team documents.'],
    ['Parth Kachhara', 'B.Tech', 'Scenario tests P01–P12; real-phone testing with twelve bug reports (#9 to #20); the Lab fixes (pull request #21).'],
    ['Chirag Seervi', 'B.Tech', 'Salon data and prices; the market-shock scenarios and rehearsal; the splash story page.'],
    ['Parth Srivastava', 'MBA', 'Market research, segmentation and positioning, pricing hypothesis, unit economics, financial projections, go-to-market, the original deck.'],
    ['Tushar Walia', 'MBA', 'Market research, segmentation and positioning, pricing hypothesis, unit economics, financial projections, go-to-market, the original deck.'],
  ], [20, 18, 62], { zebra: true }),
  Small('Questions about any credit: open an issue at [github.com/sirgreaseball/refill](https://github.com/sirgreaseball/refill/issues).', { before: 200 }),
]

build({ file: OUT, title: 'Refill: credits and inspirations', footer: 'Refill · Credits and inspirations', body }).then(() => console.log('wrote', OUT))
