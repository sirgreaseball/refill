// Presenter brief for slide 6: how every number in the financial projections is built, and why.
const { P, Small, H1, H2, H3, Bullets, Steps, Tbl, Callout, Cover, Toc, build } = require('./lib')
const OUT = 'Z:/claude/refill/docs/team/Refill-Financial-Projections-Brief.docx'

const L = (n) => (n / 1e5).toFixed(2) // rupees to lakh
function model(price, locs = [50, 250, 800], opex = [15, 27, 49], cogs = 100) {
  return locs.map((n, i) => {
    const rev = n * price * 12; const c = n * cogs * 12; const gp = rev - c
    return { n, rev: L(rev), cogs: L(c), gp: L(gp), opex: opex[i].toFixed(2), ebitda: (gp / 1e5 - opex[i]).toFixed(2) }
  })
}
const sign = (v) => (+v > 0 ? '+' + v : v)
const base = model(699)
const p499 = model(499)
const p999 = model(999)
const slow = model(699, [35, 175, 560])
const be = (price, opex) => Math.ceil((opex * 1e5) / ((price - 100) * 12))

const body = [
  Cover({
    kicker: 'Presenter brief · slide 6',
    title: 'The financial projections, explained',
    subtitle: 'How every number on the slide is built, why we chose it, what moves it, and what to say when a judge pushes back.',
    meta: [
      ['For', 'Parth Srivastava and Tushar Walia (MBA), presenting slide 6'],
      ['Model', 'Illustrative, revised model. Price ₹699 per location per month; variable cost ₹100 per location per month.'],
      ['Status', 'Projections are hypotheses. Nothing here is revenue earned; the demo runs on synthetic data.'],
    ],
  }),
  Toc(),

  H1('The slide in one minute', '01 · What to say'),
  Callout('Say this', [
    '"Our model is simple: revenue is the number of active locations times ₹699 a month. Each location costs us about ₹100 a month to serve (hosting, messages and payment fees), so we keep about ₹600, an 86% gross margin, like most software. With a lean team, we lose money in years one and two while we prove the product in Hyderabad, and turn EBITDA-positive in year three at about 800 locations. That is less than 0.3% of India\'s salons, and the model breaks even at about 680 locations."',
  ], 'act'),
  H2('The table on the slide'),
  ...Tbl(['₹ Lakh', 'Year 1', 'Year 2', 'Year 3'], [
    ['Average active locations', '50', '250', '800'],
    ['Revenue', ...base.map((r) => r.rev)],
    ['Variable COGS', ...base.map((r) => r.cogs)],
    ['Gross profit', ...base.map((r) => r.gp)],
    ['Total OpEx (revised)', ...base.map((r) => r.opex)],
    ['EBITDA', ...base.map((r) => sign(r.ebitda))],
  ], [40, 20, 20, 20], { zebra: true }),

  H1('How each number is built', '02 · The arithmetic'),
  ...Tbl(['Line', 'Formula', 'Year 1 worked example'], [
    ['Revenue', 'Average active locations × ₹699 × 12 months', '50 × 699 × 12 = ₹4,19,400 = ₹4.19 L'],
    ['Variable COGS', 'Average active locations × ₹100 × 12 months', '50 × 100 × 12 = ₹60,000 = ₹0.60 L'],
    ['Gross profit', 'Revenue − variable COGS', '4.19 − 0.60 = ₹3.59 L (86% margin)'],
    ['OpEx', 'Team, sales, marketing, tools and compliance (Section 05)', '₹15.00 L'],
    ['EBITDA', 'Gross profit − OpEx', '3.59 − 15.00 = −₹11.41 L'],
  ], [18, 44, 38]),
  H2('Unit economics behind it'),
  ...Bullets([
    '**Contribution per location:** ₹699 − ₹100 = **₹599 a month**, or **₹7,188 a year**.',
    `**Break-even locations:** OpEx ÷ annual contribution. Year 1: ₹15 L ÷ ₹7,188 ≈ **${be(699, 15)}** locations. Year 3: ₹49 L ÷ ₹7,188 ≈ **${be(699, 49)}** locations.`,
    '**Why "average" locations:** a location that joins in month 10 pays for 3 months, not 12. Average active locations over the year is the honest base for annual revenue, and it already nets out locations that leave.',
  ]),
  Callout('On slide 5 we show these in general terms', ['Slide 5 keeps unit economics deliberately general (low cost to serve, high contribution, break-even at a few hundred locations). This brief has the exact numbers if a judge asks.'], 'ink'),

  H1('Why these location numbers', '03 · Adoption'),
  ...Tbl(['Year', 'Average active', 'Rough exit count', 'Net new per month', 'How we get them'], [
    ['1', '50', '≈ 100', '≈ 8', 'Founder-led demos in one Hyderabad cluster; one-calendar pilots convert first'],
    ['2', '250', '≈ 400', '≈ 25', 'Second Hyderabad cluster; referrals from happy owners; salon-software consultants'],
    ['3', '800', '≈ 1,200', '≈ 65', 'Channel partners and associations; a second city'],
  ], [8, 16, 18, 18, 40], { zebra: true }),
  H2('Is 800 locations realistic?'),
  ...Bullets([
    'Industry research puts India\'s beauty-salon market at about **USD 12.6 billion in 2025** with about **3,00,000 players**, and organised salon outlets above **13,000** (vendor estimates; see Sources).',
    '800 locations is under **0.3%** of all players, or about **6%** of organised outlets. Large chains alone run hundreds of outlets (Lakmé Salon 450+, Naturals 800+), so a few chain deals could move this a lot.',
    'Refill is not salon-only: clinics, physiotherapists, tutoring centres and studios add to the pool; we stay salon-first for focus.',
  ]),
  H2('Churn is built in'),
  P('Small-business software commonly loses **3–7% of customers a month**, and much of that loss happens in the first three months (vendor benchmarks; see Sources). Our average counts are net of churn: at about 4% a month, reaching ≈ 100 locations by the end of year 1 needs roughly 9–10 sign-ups a month, not 8. Good onboarding is the biggest lever, which is why the GTM plan starts with a supervised pilot and a weekly recovered-revenue report to the owner.'),

  H1('Why ₹100 variable cost', '04 · Cost to serve'),
  ...Tbl(['Item (per location, per month)', 'Estimate', 'Basis'], [
    ['Client messages (when SMS / WhatsApp is switched on)', '≈ ₹15–25', 'About 3 offers per cancellation × 30 cancellations ≈ 90 messages at ≈ ₹0.12–0.25 each (verify current rate cards)'],
    ['Payment collection', '≈ ₹14', 'About 2% of ₹699 (typical Indian payment gateway)'],
    ['Hosting and database share', '≈ ₹20–40', 'Paid Supabase + Vercel plans shared across locations'],
    ['Support tooling and buffer', '≈ ₹20–30', 'Email, monitoring, small allowance'],
    ['**Total**', '**≈ ₹100**', 'Conservative; today the prototype runs on free plans'],
  ], [40, 16, 44]),

  H1('Why this OpEx', '05 · The team and the spend'),
  P('OpEx is the fixed cost of running the company. The split below is illustrative, to show the presenter what ₹15 L, ₹27 L and ₹49 L buy.'),
  ...Tbl(['₹ Lakh', 'Year 1', 'Year 2', 'Year 3'], [
    ['Team (founder stipends, engineering, onboarding/support, sales)', '9.0', '17.0', '32.0'],
    ['Sales and demos (travel, demo devices, pilot support)', '2.5', '4.0', '7.0'],
    ['Marketing (social, printed QR kits, salon events)', '1.5', '3.0', '5.0'],
    ['Tools, legal, compliance (company, GST, DLT registration, accounting)', '1.0', '1.5', '2.5'],
    ['Contingency', '1.0', '1.5', '2.5'],
    ['**Total OpEx**', '**15.0**', '**27.0**', '**49.0**'],
  ], [52, 16, 16, 16], { zebra: true }),
  P('Year 1 is a lean founding team proving the product in one city. Year 2 adds onboarding and support so churn stays low. Year 3 adds a second-city team and partner management.'),

  H1('Why an owner pays ₹699', '06 · The value side'),
  ...Bullets([
    'An owner survey by Fresha found hair and beauty businesses lose **almost 7% of monthly revenue to cancellations** (vendor survey; see Sources).',
    '**Worked example (assumption):** a salon taking ₹3,00,000 a month loses about ₹21,000 to cancellations. Recovering one-sixth of that (₹3,500) is five times the subscription.',
    'From the slide\'s value formula: at ₹500 contribution per service, about **2 recovered bookings a month** cover ₹699 after costs.',
  ]),

  H1('What moves the numbers', '07 · Sensitivities'),
  ...Tbl(['Scenario', 'Year 1 EBITDA', 'Year 2 EBITDA', 'Year 3 EBITDA', 'Break-even (Y3 OpEx)'], [
    ['Base: ₹699, 50 / 250 / 800', ...base.map((r) => sign(r.ebitda)), `≈ ${be(699, 49)} locations`],
    ['Lower price: ₹499', ...p499.map((r) => sign(r.ebitda)), `≈ ${be(499, 49)} locations`],
    ['Higher price: ₹999', ...p999.map((r) => sign(r.ebitda)), `≈ ${be(999, 49)} locations`],
    ['30% slower adoption: 35 / 175 / 560 at ₹699', ...slow.map((r) => sign(r.ebitda)), `≈ ${be(699, 49)} locations`],
  ], [34, 15, 15, 15, 21], { zebra: true }),
  P('**Read it this way:** price and retention matter most. At ₹499 the company needs about 1,000 locations to break even; at ₹999 about 450. That is why the slide insists on testing ₹499, ₹699 and ₹999 with owners, and why only a paid-pilot decision counts as validation.'),

  H1('If a judge pushes back', '08 · Answers'),
  ...Tbl(['Question', 'Answer'], [
    ['Where do 50, 250 and 800 come from?', 'Bottom-up: about 8, 25 and 65 net new locations a month from founder demos, then referrals and partners. It is a hypothesis we test in the 30-day pilot, not a forecast we have evidence for yet.'],
    ['Is ₹100 COGS too low?', 'It is conservative for software: hosting is shared, and messages cost paise each. Even at ₹200 the gross margin stays above 70%.'],
    ['Why are you loss-making for two years?', 'A small team proves the product in one city first. Contribution per location is high, so profit arrives once locations cross about 680.'],
    ['What is the biggest risk to the model?', 'Churn and price. That is why we measure retention in the pilot and test three price points.'],
    ['Are these real revenues?', 'No. The demo runs on synthetic data; these are illustrative projections.'],
  ], [30, 70], { zebra: true }),

  H1('Sources', '09 · Where the outside numbers come from'),
  Small('Vendor and research-firm estimates; methods are not public, so present them as indicative.'),
  ...Bullets([
    'India beauty-salon market size and number of players: [Ken Research, India Beauty Salon Market](https://www.kenresearch.com/industry-reports/india-beauty-salon-market.md)',
    'Organised salon outlets in India: [Nexdigm, India Salon Market](https://www.nexdigm.com/market-research/report-store/india-salon-market/)',
    'Revenue lost to cancellations (hair and beauty ≈ 7% a month): [Fresha, The Hidden Cost of Cancellations](https://www.fresha.com/blog/cancellations-cost-study)',
    'SMB SaaS churn benchmarks (3–7% a month): [Kalungi, SaaS churn rate benchmarks](https://kalungi.com/blog/saas-churn-rate-benchmarks), [UserJot, SaaS churn benchmarks](https://userjot.com/blog/saas-churn-rate-benchmarks)',
    'Chain footprints (Lakmé Salon 450+, Naturals 800+): reported in [Inventiva](https://www.inventiva.co.in/?p=412093)',
  ]),
]

build({ file: OUT, title: 'Refill: financial projections brief', footer: 'Refill · Financial projections brief', body }).then(() => console.log('wrote', OUT))
