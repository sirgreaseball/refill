// Refill final deck, rebuilt in the product's chronograph language. Content follows the MBA deck
// (REFILL_Deck.pptx) except where the brief asked for changes (slides 2 personas, 3, 4, 5 unit
// economics, 6 additions) and the new splash cover with the team.
// `node build.js` makes the dark deck; `node build.js --light` the daylight one (the app's light theme).
const pptxgen = require('pptxgenjs')
const path = require('path')
const LIGHT = process.argv.includes('--light')
const A = (n) => path.join(__dirname, 'art', n)
const V = (n) => A(LIGHT ? n.replace('.', '-light.') : n) // art drawn per theme

const K = LIGHT ? {
  canvas: 'F4F2ED', surface: 'FFFFFF', surface2: 'FAF8F4', surface3: 'ECE9E2', line: 'E0DDD6', line2: 'D4D2CD',
  ink: '121214', ink2: '5A5852', ink3: '8C8981', act: '3F6B00', actDeep: 'EBF0E5', actLine: 'CFDABF', beat: 'B36A00', beatDeep: 'F9EFDF', danger: 'D13A2B', dangerDeep: 'FBEDEC',
} : {
  canvas: '0A0A0C', surface: '131316', surface2: '18181C', surface3: '222228', line: '2A2A2F', line2: '35353B',
  ink: 'F4F1EA', ink2: 'A9A59C', ink3: '76736C', act: 'C6F24E', actDeep: '1C2410', actLine: '3A4A18', beat: 'FFB547', beatDeep: '2A2112', danger: 'FF5D4D', dangerDeep: '2C1614',
}
const HEAD = 'Clash Display Semibold'
const HEAD_M = 'Clash Display Medium'
const BODY = 'Satoshi'
const BODY_M = 'Satoshi Medium'
const MONO = 'JetBrains Mono'

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9' // 10 x 5.625 in, same as the source deck
pres.title = 'Refill · Appointment Recovery Desk'
pres.author = 'Team C29'
pres.company = 'Team C29 · Fynd x NMIMS Hyderabad'
pres.theme = { headFontFace: HEAD, bodyFontFace: BODY }

pres.defineSlideMaster({ title: 'COVER', background: { path: V('DeckBgCover.jpg') } })
pres.defineSlideMaster({
  title: 'CONTENT',
  background: { path: V('DeckBg.jpg') },
  objects: [
    { image: { path: V('DeckMark.png'), x: 8.93, y: 0.27, w: 0.5, h: 0.156 } },
  ],
  slideNumber: { x: 9.38, y: 0.2, w: 0.3, h: 0.3, fontFace: MONO, fontSize: 7, color: K.ink3, align: 'right' },
})

// ---------------------------------------------------------------- helpers
const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontFace: BODY, color: K.ink, fontSize: 10, valign: 'top', ...o })
const over = (s, text, o = {}) => T(s, text.toUpperCase(), { fontFace: MONO, fontSize: 7.5, charSpacing: 1.1, color: K.ink3, ...o })
const card = (s, x, y, w, h, o = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.09, fill: { color: o.fill ?? K.surface }, line: { color: o.line ?? K.line, width: 0.75 }, ...(o.shadow || LIGHT ? { shadow: LIGHT ? { type: 'outer', color: '14141E', blur: 10, offset: 2, angle: 90, opacity: 0.07 } : { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 90, opacity: 0.45 } } : {}) })
const rule = (s, x, y, w) => s.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color: K.line, width: 0.75 } })
const dot = (s, x, y, color, d = 0.08) => s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } })
const chip = (s, text, x, y, w, tone = 'act', h = 0.2) => {
  const fill = { act: K.actDeep, beat: K.beatDeep, danger: K.dangerDeep, ink: K.surface3 }[tone]
  const color = { act: K.act, beat: K.beat, danger: K.danger, ink: K.ink2 }[tone]
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.05, fill: { color: fill }, line: { color: fill, width: 0 } })
  T(s, text, { x, y, w, h, fontFace: MONO, fontSize: 6.5, color, align: 'center', valign: 'middle', charSpacing: 0.5 })
}
function head(s, kicker, title, size = 23) {
  T(s, [{ text: kicker.split(' · ')[0], options: { color: K.act } }, { text: '  ·  ' + kicker.split(' · ').slice(1).join(' · ').toUpperCase(), options: { color: K.ink3 } }], { x: 0.45, y: 0.26, w: 7.5, h: 0.2, fontFace: MONO, fontSize: 7.5, charSpacing: 1.1 })
  T(s, title, { x: 0.45, y: 0.47, w: 8.4, h: 0.5, fontFace: HEAD, fontSize: size, color: K.ink, valign: 'middle' })
}

// ================================================================ 0 · splash cover
{
  const s = pres.addSlide({ masterName: 'COVER' })
  s.addImage({ path: V('DeckMark.png'), x: 0.45, y: 0.42, w: 0.62, h: 0.194 })
  T(s, 'Refill', { x: 1.15, y: 0.37, w: 1.5, h: 0.3, fontFace: HEAD, fontSize: 14, valign: 'middle' })
  T(s, 'fillthechair.vercel.app', { x: 6.6, y: 0.37, w: 3.0, h: 0.3, fontFace: MONO, fontSize: 7.5, color: K.ink3, align: 'right', valign: 'middle' })
  over(s, 'Refill · Appointment recovery desk', { x: 0.45, y: 1.22, w: 5, h: 0.2, color: K.ink2 })
  T(s, [
    { text: 'Every cancelled', options: { color: K.ink, breakLine: true } },
    { text: 'appointment,', options: { color: K.ink, breakLine: true } },
    { text: 'filled again.', options: { color: K.act } },
  ], { x: 0.45, y: 1.48, w: 5.2, h: 1.72, fontFace: HEAD, fontSize: 37, lineSpacing: 39 })
  T(s, 'When a client cancels, Refill offers the time to the next person on the waitlist who fits it and said yes to messages. The first to accept gets it.', { x: 0.45, y: 3.27, w: 4.7, h: 0.55, fontSize: 10.5, color: K.ink2, lineSpacingMultiple: 1.15 })
  rule(s, 0.45, 4.02, 4.9)
  over(s, 'Team C29', { x: 0.45, y: 4.14, w: 2, h: 0.18, color: K.act })
  const lead = [{ text: 'Vedanth Raj', options: {} }, { text: '   TEAM LEAD', options: { fontFace: MONO, fontSize: 6.8, color: K.act, charSpacing: 1 } }]
  ;[['B.TECH', lead, 4.36], ['', 'Dhruv Sonar · Parth Kachhara · Chirag Seervi', 4.58], ['MBA', 'Parth Srivastava · Tushar Walia', 4.84]].forEach(([k, v, y]) => {
    T(s, k, { x: 0.45, y, w: 0.6, h: 0.22, fontFace: MONO, fontSize: 7, color: K.ink3, valign: 'middle' })
    T(s, v, { x: 1.08, y, w: 4.6, h: 0.22, fontFace: BODY_M, fontSize: 10, color: K.ink, valign: 'middle' })
  })
  T(s, 'Fynd × NMIMS Hyderabad  ·  Product & Business Simulation  ·  Case C29  ·  18 October 2026', { x: 0.45, y: 5.18, w: 6, h: 0.18, fontFace: MONO, fontSize: 6.5, color: K.ink3 })
  s.addImage({ path: V('DeckDial.png'), x: 5.45, y: 0.62, w: 4.4, h: 4.4 })
  s.addNotes('Open on the promise: every cancelled appointment, filled again. The dial is the product\'s own view of a day: one ring per staff member, one arc per appointment; the amber arc is a cancelled slot waiting to be refilled. Introduce Team C29: B.Tech, led by Vedanth (team lead), with Dhruv, Parth K. and Chirag; MBA: Parth S. and Tushar.')
}

// ================================================================ 1 · product overview
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  head(s, '01 · Product overview', [{ text: 'Refill  ', options: { color: K.ink } }, { text: 'Appointment Recovery Desk', options: { color: K.ink3, fontFace: HEAD_M } }])
  T(s, 'Recover eligible cancellation slots without overbooking or contacting anyone who hasn\'t opted in.', { x: 0.45, y: 1.05, w: 5.0, h: 0.42, fontSize: 11, color: K.ink2, lineSpacingMultiple: 1.1 })
  const W5 = [
    ['WHO', 'Salon / tutoring-centre owner + reception staff', K.ink],
    ['WHAT', 'Convert eligible cancellations into confirmed bookings', K.act],
    ['WHERE', 'One-calendar pilot · Hyderabad beachhead', K.ink],
    ['WHEN', 'Triggered at cancellation; outreach before slot expires', K.beat],
    ['WHY', 'Unused capacity = lost contribution · Manual recovery wastes staff time', K.danger],
  ]
  W5.forEach(([k, v, c], i) => {
    const y = 1.66 + i * 0.66
    rule(s, 0.45, y, 5.0)
    dot(s, 0.45, y + 0.2, c)
    T(s, k, { x: 0.62, y: y + 0.13, w: 0.8, h: 0.2, fontFace: MONO, fontSize: 7.5, color: K.ink3, charSpacing: 1.5 })
    T(s, v, { x: 1.45, y: y + 0.1, w: 4.0, h: 0.48, fontFace: BODY_M, fontSize: 11, color: K.ink })
  })
  const P4 = [
    ['PRODUCT', ['Five-feature recovery desk:', 'cancellation visibility → waitlist match → consent gate → rebook → audit trail']],
    ['PRICE', ['₹499–₹699 / location / month', '(hypothesis; willingness-to-pay to be validated with owners)']],
    ['PLACE', ['Founder-led local demo', 'One Hyderabad calendar pilot', 'Software/consultant referral later']],
    ['PROMOTION', ['Cancellation scenario demo', 'Recovered-contribution calculator', 'Consent + collision test proof']],
  ]
  P4.forEach(([k, lines], i) => {
    const x = 5.85 + (i % 2) * 1.92
    const y = 1.05 + Math.floor(i / 2) * 2.0
    card(s, x, y, 1.8, 1.86)
    over(s, k, { x: x + 0.16, y: y + 0.16, w: 1.5, h: 0.18, color: K.act })
    T(s, lines.map((l, j) => ({ text: l, options: { breakLine: j < lines.length - 1, color: j === 0 ? K.ink : K.ink2, fontFace: j === 0 ? BODY_M : BODY } })), { x: x + 0.16, y: y + 0.45, w: 1.5, h: 1.3, fontSize: 9.5, paraSpaceAfter: 4, lineSpacingMultiple: 1.05 })
  })
  T(s, 'Fynd × NMIMS Hyderabad  |  Product & Business Simulation  |  Case C29  |  18 October 2026', { x: 0.45, y: 5.22, w: 9.1, h: 0.18, fontFace: MONO, fontSize: 6.5, color: K.ink3 })
  s.addNotes('Refill does one narrow job: when a booking is cancelled, it fills the freed slot with someone who fits and has opted in, and it never overbooks. Walk the five Ws on the left, then the four Ps on the right.')
}

// ================================================================ 2 · STP and beachhead
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  head(s, '02 · STP & Beachhead', 'Solopreneurs Who Sell Their Time to High-Income Clients', 20)
  // psychographic insight
  card(s, 0.45, 1.08, 2.85, 2.0)
  over(s, 'Psychographic insight', { x: 0.62, y: 1.24, w: 2.5, h: 0.18, color: K.act })
  T(s, '"Rich people value time."', { x: 0.62, y: 1.5, w: 2.55, h: 0.4, fontFace: HEAD, fontSize: 15 })
  T(s, 'End customers who book premium salons place high value on convenience — making a relevant, opt-in waitlist offer credible.', { x: 0.62, y: 2.0, w: 2.55, h: 0.95, fontSize: 9.5, color: K.ink2, lineSpacingMultiple: 1.1 })
  // S T P
  const STP = [
    ['SEGMENT', 'Independent salons, recurring appointments, service-duration constraints. Tutoring centres: adjacent, later.'],
    ['TARGET', 'Owner-operated 1-location salon (3–15 staff). Recurring cancellations. Some waitlist demand. Hyderabad-first.'],
    ['POSITION', 'Recovery-first, consent-first. Not a full salon ERP. Narrow job: fill eligible slots without overbooking or unauthorised outreach.'],
  ]
  STP.forEach(([k, v], i) => {
    const y = 1.08 + i * 0.68
    if (i) rule(s, 3.5, y - 0.04, 3.0)
    T(s, k, { x: 3.5, y: y + 0.03, w: 0.85, h: 0.2, fontFace: MONO, fontSize: 7.5, color: K.act, charSpacing: 1.5 })
    T(s, v, { x: 4.35, y, w: 2.15, h: 0.62, fontSize: 8.5, color: K.ink, lineSpacingMultiple: 1.05 })
  })
  // beachhead
  card(s, 6.7, 1.08, 2.9, 2.0)
  over(s, 'Beachhead: independent salons', { x: 6.86, y: 1.24, w: 2.65, h: 0.18, color: K.beat, fontSize: 6.8, charSpacing: 0.6 })
  const BH = [['Sector', 'Independent salon · Recurring appts'], ['Footprint', 'One location · 3–15 bookable staff'], ['Cancellations', 'Recurring eligible · Measurable capacity'], ['Waitlist', 'Customers willing to opt in'], ['Constraints', 'Duration + staff skills capturable'], ['Geography', 'One Hyderabad cluster first']]
  BH.forEach(([k, v], i) => {
    const y = 1.5 + i * 0.255
    T(s, k, { x: 6.86, y, w: 0.8, h: 0.22, fontSize: 7.3, color: K.ink3 })
    T(s, v, { x: 7.62, y, w: 1.95, h: 0.22, fontSize: 7.3, color: K.ink })
  })
  // two personas, business side and client side, for any appointment business
  const PERS = [
    { k: 'P1 — Business side', role: 'OWNER + FRONT DESK · ECONOMIC BUYER & DAILY OPERATOR', who: 'Any appointment business: salons, clinics, tutoring centres, spas, studios.', pains: ['Low time', 'Fragmented records', 'Afraid of overbooking', 'Front-desk multitasking', 'Stale waitlist', 'Competing requests'], want: 'Fill a freed slot fast, never double-book, and see what was recovered.', tone: 'act' },
    { k: 'P2 — Client side', role: 'OPTED-IN END CUSTOMER', who: 'Anyone who books time: a haircut, a physio session, a tuition class.', pains: ['Wants a relevant offer', 'Hates intrusive outreach', 'Controls consent'], want: 'Hear about an earlier slot only after saying yes; book it in one tap.', tone: 'beat' },
  ]
  PERS.forEach((p, i) => {
    const x = 0.45 + i * 4.62
    card(s, x, 3.25, 4.5, 1.88)
    dot(s, x + 0.18, 3.47, p.tone === 'act' ? K.act : K.beat, 0.1)
    T(s, p.k, { x: x + 0.36, y: 3.37, w: 3.4, h: 0.28, fontFace: HEAD, fontSize: 13, valign: 'middle' })
    s.addShape(pres.shapes.OVAL, { x: x + 3.94, y: 3.39, w: 0.42, h: 0.42, fill: { color: p.tone === 'act' ? K.actDeep : K.beatDeep }, line: { color: p.tone === 'act' ? K.actDeep : K.beatDeep, width: 0 } })
    s.addImage({ path: V(p.tone === 'act' ? 'Icon-business.png' : 'Icon-client.png'), x: x + 3.98, y: 3.43, w: 0.34, h: 0.34, altText: p.tone === 'act' ? 'Business owner icon' : 'Opted-in client icon' })
    over(s, p.role, { x: x + 0.18, y: 3.7, w: 4.2, h: 0.16, color: p.tone === 'act' ? K.act : K.beat, fontSize: 6.3, charSpacing: 0.5 })
    T(s, p.who, { x: x + 0.18, y: 3.92, w: 4.15, h: 0.22, fontSize: 9, color: K.ink2 })
    let cx = x + 0.18; let cy = 4.2
    p.pains.forEach((t) => {
      const w = 0.12 + t.length * 0.062
      if (cx + w > x + 4.35) { cx = x + 0.18; cy += 0.26 }
      chip(s, t, cx, cy, w, 'ink', 0.21)
      cx += w + 0.07
    })
    T(s, p.want, { x: x + 0.18, y: 4.76, w: 4.15, h: 0.3, fontFace: BODY_M, fontSize: 9, color: K.ink })
  })
  T(s, '[HYPOTHESIS] Segmentation assumptions to validate through owner interviews and pilot.', { x: 0.45, y: 5.24, w: 9.1, h: 0.18, fontFace: MONO, fontSize: 6.5, color: K.ink3 })
  s.addNotes('Two personas, not three, because Refill works for any appointment business, not only salons. P1 is the business side: the owner who pays and the front desk who uses it every day. P2 is the client side: the opted-in customer who receives offers. Keep the psychographic insight, STP and beachhead as the core of the slide.')
}

// ================================================================ 3 · five features and the gap
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  head(s, '03 · 5 features + gap analysis', '5 Main Features & Competitive Gap')
  const FEAT = [
    ['Who-fits\nmatching', 'Each waiting client is checked against the open slot: consent, staff skill, duration, availability. Fits listed in queue order; every skip shows its reason.', '6 FIT · 11 SKIPPED'],
    ['Consent\ngate', 'Yes / no / never asked: only yes is messaged. Checked when offers go out and again at booking. STOP withdraws every open offer at once.', 'TESTS C05 · C06 · C12'],
    ['One slot,\none booking', 'The booking is decided inside the database under a lock. Two taps at the same instant: one booking, the other client keeps their place.', 'RACE: 8 TAPS → 1 BOOKING'],
    ['Offer\nrules', 'Offers held 15 min, then passed on. Max 3 offers per client a day. Under-2-hour cancellations flagged late. Mistakes undone. Owner sets every limit.', 'OWNER → RULES'],
    ['Staff out &\nrescheduling', '"I can\'t come in" withdraws that person\'s offers, holds their gaps and flags their clients. The desk moves them or sends a pick-a-time link.', 'LIVE · FLOW-TESTED'],
  ]
  FEAT.forEach(([t, b, proof], i) => {
    const x = 0.45 + i * 1.84
    card(s, x, 1.05, 1.74, 2.3)
    T(s, String(i + 1).padStart(2, '0'), { x: x + 0.14, y: 1.17, w: 0.5, h: 0.2, fontFace: MONO, fontSize: 8, color: K.act })
    T(s, t, { x: x + 0.14, y: 1.4, w: 1.5, h: 0.48, fontFace: HEAD, fontSize: 12, lineSpacingMultiple: 0.95 })
    T(s, b, { x: x + 0.14, y: 1.93, w: 1.48, h: 1.05, fontSize: 7.8, color: K.ink2, lineSpacingMultiple: 1.08 })
    chip(s, proof, x + 0.12, 3.06, 1.5, 'act', 0.2)
  })
  over(s, 'Mandatory case scoring checks (C29)', { x: 0.45, y: 3.52, w: 6, h: 0.18, color: K.ink2 })
  const CHK = [
    ['10 pts', '60-min request cannot occupy a 30-min slot — duration hard-constraint before any outreach'],
    ['10 pts', 'Two competing requests for one slot → one confirmed booking + one waitlist entry (no duplicate)'],
    ['5 pts', 'Customer without contact consent is excluded from outreach — logged with reason'],
  ]
  CHK.forEach(([p, t], i) => {
    const y = 3.78 + i * 0.32
    rule(s, 0.45, y - 0.03, 9.1)
    chip(s, p, 0.45, y + 0.03, 0.55, 'beat', 0.2)
    T(s, t, { x: 1.12, y: y + 0.01, w: 7.6, h: 0.25, fontSize: 9, color: K.ink, valign: 'middle' })
    chip(s, 'PASS · LIVE', 8.75, y + 0.03, 0.8, 'act', 0.2)
  })
  card(s, 0.45, 4.8, 9.1, 0.5, { fill: K.surface2 })
  T(s, [
    { text: 'GAP vs competitors (Fresha, Zenoti, Square): ', options: { fontFace: BODY_M, color: K.beat } },
    { text: 'Existing platforms offer waitlists but do not expose auditable consent-state, duration-mismatch rejection, or slot-contention proof to the operator. Validate by demo before claiming.', options: { color: K.ink2 } },
  ], { x: 0.62, y: 4.85, w: 8.8, h: 0.4, fontSize: 8, valign: 'middle' })
  s.addNotes('Five features that are built and live today, each with its proof. 1) Who-fits matching: the desk sees who fits and who is skipped, with a reason for every skip (in the demo, 6 fit and 11 are skipped). 2) Consent gate: only clients who said yes are ever messaged, checked twice; STOP withdraws everything. 3) One slot, one booking: decided in the database; 8 simultaneous taps give exactly 1 booking. 4) Offer rules: 15-minute hold, max 3 offers a day, late flag, undo; the owner controls the limits. 5) Staff out and rescheduling. The three case checks all pass live on the Proof page.')
}

// ================================================================ 4 · onboarding and a day
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  head(s, '04 · Onboarding & day-to-day', 'Onboarding + What Does a Day on Refill Look Like?')
  over(s, 'Onboarding · in the app', { x: 0.45, y: 1.02, w: 4, h: 0.18, color: K.act })
  const ON = [
    ['Create account', 'Email + password, then "I run a business".'],
    ['Set up the business', 'Name and type, services (minutes, price), team and working hours. Any appointment business.'],
    ['Share the links', 'Front-desk login link, a private link per staff member, the client booking page + QR (yes / no to messages, never pre-ticked).'],
    ['Set the rules', 'Offer hold 15 min · 3 messages per client a day · late if under 2 h · no offers inside 10 min. Owner can change all.'],
  ]
  ON.forEach(([t, b], i) => {
    const x = 0.45 + i * 2.3
    card(s, x, 1.26, 2.2, 1.1)
    T(s, String(i + 1), { x: x + 0.14, y: 1.36, w: 0.3, h: 0.3, fontFace: HEAD, fontSize: 17, color: K.act })
    T(s, t, { x: x + 0.45, y: 1.4, w: 1.68, h: 0.24, fontFace: BODY_M, fontSize: 10.5, valign: 'middle' })
    T(s, b, { x: x + 0.14, y: 1.7, w: 1.95, h: 0.62, fontSize: 7.8, color: K.ink2, lineSpacingMultiple: 1.06 })
  })
  over(s, 'A day on Refill · front desk', { x: 0.45, y: 2.55, w: 4, h: 0.18, color: K.act })
  const DAY = [
    ['Open Today', 'The Day Dial: every staff ring, every booking; "needs you now".', K.ink2],
    ['Client cancels', 'Desk records it. The gap turns amber with ₹ at stake; late if under 2 h.', K.beat],
    ['Who fits', 'Fits in queue order; every skip with its reason.', K.ink2],
    ['Send offers', 'One tap. Held 15 min; max 3 a day per client.', K.ink2],
    ['Client books', 'One tap on their phone. Two taps at once: one booking.', K.ink2],
    ['Slot refilled', 'Lime on the dial; the owner sees ₹ recovered.', K.act],
    ['Staff out?', 'Their clients flagged; desk moves them or sends a link.', K.danger],
  ]
  const x0 = 0.45; const step = 1.31
  s.addShape(pres.shapes.LINE, { x: x0 + 0.05, y: 2.92, w: step * 6, h: 0, line: { color: K.line2, width: 1 } })
  DAY.forEach(([t, b, c], i) => {
    const x = x0 + i * step
    dot(s, x, 2.87, c, 0.11)
    T(s, t, { x, y: 3.05, w: 1.22, h: 0.22, fontFace: BODY_M, fontSize: 9.5, color: c === K.ink2 ? K.ink : c })
    T(s, b, { x, y: 3.3, w: 1.2, h: 0.7, fontSize: 7.5, color: K.ink2, lineSpacingMultiple: 1.06 })
  })
  card(s, 0.45, 4.15, 4.6, 1.15, { fill: K.surface2 })
  over(s, 'Evidence trail saved at every step', { x: 0.62, y: 4.28, w: 4.2, h: 0.18, color: K.act })
  T(s, 'Every cancellation, offer (sent or skipped, with its reason), booking, expiry, move and undo is logged automatically. Export as CSV or JSON for the owner; live businesses archive each day into History.', { x: 0.62, y: 4.52, w: 4.3, h: 0.72, fontSize: 8.3, color: K.ink2, lineSpacingMultiple: 1.08 })
  s.addImage({ path: A('film-desk_fit.jpg'), x: 5.25, y: 4.15, w: 2.04, h: 1.15 })
  s.addImage({ path: A('film-client.jpg'), x: 7.51, y: 4.15, w: 2.04, h: 1.15 })
  T(s, 'FRONT DESK · WHO FITS', { x: 5.25, y: 5.33, w: 2.04, h: 0.14, fontFace: MONO, fontSize: 5.5, color: K.ink3 })
  T(s, 'CLIENT · ONE-TAP BOOKING', { x: 7.51, y: 5.33, w: 2.04, h: 0.14, fontFace: MONO, fontSize: 5.5, color: K.ink3 })
  s.addNotes('Onboarding is done inside the app: create an account, set up the business (services, staff, hours), share three links (front desk, staff, client booking page with QR), and set the rules. A day: the desk opens Today on the Day Dial; a client cancels and the gap turns amber; Refill shows who fits and who is skipped and why; one tap sends offers; the first client to tap Book gets it; the slot turns lime and the owner sees the money recovered. If a staff member is out, their clients are flagged and moved by the desk. Every step is logged and exportable.')
}

// ================================================================ 5 · pricing and the experiment
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  head(s, '05 · Pricing + experiment', 'Pricing Hypothesis & 30-Day Experiment')
  card(s, 0.45, 1.05, 2.0, 2.35, { fill: K.actDeep, line: K.actLine })
  T(s, '₹699', { x: 0.45, y: 1.17, w: 2.0, h: 0.62, fontFace: HEAD, fontSize: 36, color: K.act, align: 'center', valign: 'middle' })
  T(s, '/location/month', { x: 0.45, y: 1.78, w: 2.0, h: 0.2, fontSize: 8.5, color: K.ink2, align: 'center' })
  T(s, 'CORE', { x: 0.45, y: 2.0, w: 2.0, h: 0.2, fontFace: MONO, fontSize: 8, color: K.act, align: 'center', charSpacing: 3 })
  T(s, [
    { text: 'Core workflow + consent log', options: { breakLine: true } },
    { text: 'Service/staff constraints', options: { breakLine: true } },
    { text: 'Duplicate protection' },
  ], { x: 0.62, y: 2.33, w: 1.7, h: 0.62, fontSize: 8.5, color: K.ink, paraSpaceAfter: 2 })
  T(s, '[HYPOTHESIS] Base price', { x: 0.62, y: 3.05, w: 1.7, h: 0.2, fontFace: MONO, fontSize: 6.5, color: K.beat })
  over(s, 'Why', { x: 2.7, y: 1.05, w: 1, h: 0.18, color: K.act })
  T(s, [
    { text: '₹699 is an ', options: {} },
    { text: 'ANCHOR', options: { color: K.act, fontFace: BODY_M } },
    { text: ' for owner discovery interviews — not a final list price.', options: { breakLine: true } },
    { text: 'Test at ₹499, ₹699 and ₹999. Concrete paid-pilot decision is the only real validation. Stated interest ≠ willingness to pay.' },
  ], { x: 2.7, y: 1.3, w: 3.55, h: 1.35, fontSize: 11.5, color: K.ink, lineSpacingMultiple: 1.12, paraSpaceAfter: 6 })
  ;[['₹499', 'ink'], ['₹699', 'act'], ['₹999', 'ink']].forEach(([p, tone], i) => chip(s, p + (tone === 'act' ? ' · ANCHOR' : ''), 2.7 + i * 1.12, 2.85, tone === 'act' ? 1.04 : 0.9, tone, 0.24))
  card(s, 0.45, 3.58, 5.8, 0.62, { fill: K.surface2 })
  T(s, 'VALUE FORMULA: Monthly recovered contribution = Completed recovered appts × Contribution/appt − Incremental messaging / platform / recovery costs', { x: 0.62, y: 3.62, w: 5.5, h: 0.55, fontSize: 8.8, color: K.ink, italic: true, valign: 'middle' })
  T(s, 'Example: At ₹500 contribution/service → need ~2 recovered bookings/month to justify ₹699 subscription after costs.', { x: 0.45, y: 4.35, w: 5.8, h: 0.4, fontSize: 9.5, color: K.ink2 })
  // unit economics, in general terms
  card(s, 6.45, 1.05, 3.1, 2.55)
  over(s, 'Unit economics (illustrative)', { x: 6.6, y: 1.18, w: 2.8, h: 0.18, color: K.act })
  const UE = [
    ['Price per location', '₹699 / month (test ₹499–₹999)'],
    ['Cost to serve', 'Low: hosting + messages'],
    ['Contribution margin', 'High, software-like'],
    ['Acquisition cost', 'Low early: founder-led demos'],
    ['Payback', 'Within the first months'],
    ['Lifetime value', 'Rises with retention'],
    ['Break-even', 'A few hundred active locations'],
  ]
  UE.forEach(([k, v], i) => {
    const y = 1.44 + i * 0.3
    rule(s, 6.6, y, 2.8)
    T(s, k, { x: 6.6, y: y + 0.04, w: 1.25, h: 0.24, fontSize: 8, color: K.ink2, valign: 'middle' })
    T(s, v, { x: 7.8, y: y + 0.04, w: 1.62, h: 0.24, fontFace: BODY_M, fontSize: 8, color: K.ink, align: 'right', valign: 'middle' })
  })
  card(s, 6.45, 3.75, 3.1, 1.12)
  over(s, 'Voice of consumer', { x: 6.6, y: 3.88, w: 2.8, h: 0.18, color: K.beat })
  T(s, '- 5 consenting role-players · pseudonymous IDs', { x: 6.6, y: 4.12, w: 2.85, h: 0.22, fontSize: 8.5, color: K.ink })
  ;['RP-01', 'RP-02', 'RP-03', 'RP-04', 'RP-05'].forEach((id, i) => chip(s, id, 6.6 + i * 0.57, 4.5, 0.5, 'ink', 0.22))
  T(s, '[HYPOTHESIS] Price to be tested with owners; 5 role-players ≠ market validation of WTP.', { x: 0.45, y: 5.24, w: 9.1, h: 0.18, fontFace: MONO, fontSize: 6.5, color: K.ink3, italic: true })
  s.addNotes('₹699 is an anchor for owner interviews, not a list price; we test ₹499, ₹699 and ₹999, and only a paid-pilot decision counts as validation. Unit economics in plain terms: the cost to serve one location is small (hosting and messages), so contribution per location is high, like most software; acquisition is cheap early because the founders demo in person; and the business breaks even at a few hundred active locations. The value formula shows why an owner pays: about two recovered bookings a month cover the subscription.')
}

// ================================================================ 6 · GTM, projections, KPIs, risk
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  head(s, '06 · GTM + financial projections', 'Go-to-Market Strategy & Financial Projections')
  const WK = [
    ['WEEK 1', 'Rule Verification', 'Pass all 3 case checks. Fix duration/consent/concurrency issues. Save evidence.'],
    ['WEEK 2', 'Role-Player Test', '5 consented participants. Record approach, response, usefulness. No market-size conclusions.'],
    ['WEEK 3', 'Owner Baseline', 'Secure one salon permission. Capture cancellation volume and manual effort baseline.'],
    ['WEEK 4', 'Pilot + Proof', 'Supervised one-calendar run. Measure fill rate, no-show, correction effort, contribution.'],
  ]
  WK.forEach(([w, t, b], i) => {
    const x = 0.45 + i * 2.3
    card(s, x, 1.03, 2.2, 0.86)
    T(s, w, { x: x + 0.12, y: 1.1, w: 0.7, h: 0.17, fontFace: MONO, fontSize: 6.5, color: K.act, charSpacing: 1 })
    T(s, t, { x: x + 0.72, y: 1.08, w: 1.4, h: 0.2, fontFace: BODY_M, fontSize: 9, color: K.ink })
    T(s, b, { x: x + 0.12, y: 1.32, w: 1.98, h: 0.54, fontSize: 7, color: K.ink2, lineSpacingMultiple: 1.04 })
  })
  // financial projections
  over(s, 'Financial projections', { x: 0.45, y: 2.03, w: 4.6, h: 0.17, color: K.act, fontSize: 6.8, charSpacing: 0.6 })
  const hd = (t, al = 'right') => ({ text: t, options: { fontFace: MONO, fontSize: 6.8, color: K.ink3, align: al, fill: { color: K.surface2 } } })
  const row = (label, vals, o = {}) => [
    { text: label, options: { fontSize: 7.8, color: o.labelColor ?? K.ink2, fontFace: o.bold ? BODY_M : BODY } },
    ...vals.map((v) => ({ text: v, options: { fontSize: 7.8, align: 'right', fontFace: o.bold ? BODY_M : BODY, color: o.color ? o.color(v) : K.ink } })),
  ]
  s.addTable([
    [hd('₹ Lakh', 'left'), hd('Year 1'), hd('Year 2'), hd('Year 3')],
    row('Avg Locations', ['50', '250', '800']),
    row('Revenue', ['4.19', '20.97', '67.10'], { bold: true }),
    row('Variable COGS', ['0.60', '3.00', '9.60']),
    row('Gross Profit', ['3.59', '17.97', '57.50']),
    row('Total OpEx (revised)', ['15.00', '27.00', '49.00']),
    row('EBITDA', ['-11.41', '-9.03', '+8.50'], { bold: true, labelColor: K.ink, color: (v) => (v.startsWith('-') ? K.danger : K.act) }),
  ], { x: 0.45, y: 2.24, w: 4.6, colW: [1.6, 1.0, 1.0, 1.0], rowH: 0.235, fontFace: BODY, color: K.ink, fill: { color: K.surface }, border: { type: 'solid', pt: 0.5, color: K.line }, margin: [0, 0.06, 0, 0.06], valign: 'middle' })
  T(s, 'Revenue = avg locations × ₹699 × 12 · COGS ₹100 / location / month', { x: 0.45, y: 3.94, w: 4.6, h: 0.16, fontFace: MONO, fontSize: 5.8, color: K.ink3 })
  // risk mitigation on the three star features
  over(s, 'Risk mitigation · the three star features', { x: 5.3, y: 2.03, w: 4.2, h: 0.17, color: K.beat, fontSize: 6.8, charSpacing: 0.6 })
  const RISK = [
    ['Duration & staff fit', 'Wrong durations or skills entered at setup lead to wrong offers.', 'Owner sets minutes per service; database re-checks fit at send and at booking; every skip shows its reason.'],
    ['One slot, one booking', 'A phone or walk-in booking outside Refill collides.', 'Desk adds every booking in Refill; slot lock + unique index; daily log export to reconcile.'],
    ['Consent', 'A client withdraws consent through another channel.', 'Client sets yes / no themselves (never pre-ticked); STOP withdraws all offers at once; consent time and source logged; 3-a-day cap.'],
  ]
  RISK.forEach(([f, r, m], i) => {
    const y = 2.24 + i * 0.58
    card(s, 5.3, y, 4.25, 0.52)
    T(s, f, { x: 5.42, y: y + 0.06, w: 1.05, h: 0.4, fontFace: BODY_M, fontSize: 7.8, color: K.ink, valign: 'middle' })
    T(s, [{ text: 'Risk  ', options: { fontFace: MONO, fontSize: 5.8, color: K.danger } }, { text: r, options: { color: K.ink2 } }], { x: 6.5, y: y + 0.05, w: 2.98, h: 0.18, fontSize: 6.6 })
    T(s, [{ text: 'Fix  ', options: { fontFace: MONO, fontSize: 5.8, color: K.act } }, { text: m, options: { color: K.ink } }], { x: 6.5, y: y + 0.22, w: 2.98, h: 0.28, fontSize: 6.6, lineSpacingMultiple: 1.0 })
  })
  // north-star KPIs, concise
  over(s, 'North-star KPIs', { x: 0.45, y: 4.18, w: 3, h: 0.17, color: K.act })
  const KPI = [
    ['Fill rate', 'Recovered ÷ eligible cancellations'], ['Duplicates', 'Zero, tested + pilot'], ['Consent', '100%, zero post-withdrawal'],
    ['Time-to-fill', 'Cancel → confirmed'], ['Staff effort', 'Correction mins ↓ vs baseline'], ['WTP signal', 'Paid-pilot commitment'],
  ]
  KPI.forEach(([k, v], i) => {
    const x = 0.45 + (i % 6) * 1.52
    T(s, [{ text: k, options: { fontFace: BODY_M, color: K.ink, breakLine: true } }, { text: v, options: { color: K.ink2, fontSize: 6.6 } }], { x, y: 4.39, w: 1.45, h: 0.4, fontSize: 7.8 })
  })
  card(s, 0.45, 4.92, 9.1, 0.36, { fill: K.actDeep, line: K.actLine })
  T(s, [
    { text: 'SCALE ONLY WHEN: ', options: { fontFace: MONO, color: K.act, fontSize: 6.8 } },
    { text: 'Zero critical safety failures · Measured fill rate + contribution · Concrete WTP decision · Repeatable at ≥ 2 locations', options: { color: K.ink } },
  ], { x: 0.6, y: 4.92, w: 8.85, h: 0.36, fontSize: 8, valign: 'middle' })
  s.addNotes([
    'GTM: four weeks, one gate each: prove the three rules, test with five consenting role-players, capture one owner\'s baseline, then a supervised one-calendar pilot.',
    '',
    'FINANCIAL PROJECTIONS (illustrative; full reasoning in the presenter brief):',
    '• Revenue = average active locations × ₹699 × 12. Y1 50 × 699 × 12 = ₹4.19 L; Y2 250 → ₹20.97 L; Y3 800 → ₹67.10 L.',
    '• Average locations are an average across the year, net of churn. Y1 ≈ 8 net new locations a month (founder-led demos in one Hyderabad cluster, ending near 100); Y2 adds a second cluster and referral partners (≈ 25 a month); Y3 is channel-led (salon software consultants, associations).',
    '• Market room: published estimates put India\'s beauty-salon market around USD 12.6 bn (2025) with roughly 3 lakh players and 13,000+ organised outlets. 800 locations is under 0.3% of all players, or about 6% of organised outlets.',
    '• Variable COGS ₹100 per location per month covers its share of hosting, client messages (about 90 a month at roughly ₹0.12–0.25 each) and payment collection (about 2%). Gross margin ≈ 86%, in line with software.',
    '• OpEx: Y1 ₹15 L for a lean team (founders on stipends, part-time engineering, demos, local marketing, compliance like DLT/GST); Y2 ₹27 L adds onboarding/support and sales; Y3 ₹49 L adds a second city team.',
    '• Break-even: each location contributes ₹599 a month (₹7,188 a year); ₹49 L of Y3 OpEx needs about 682 average locations, so Y3 at 800 turns EBITDA positive (+₹8.50 L).',
    '• Why an owner pays: an owner-reported industry survey (Fresha) found hair and beauty businesses lose about 7% of monthly revenue to cancellations; recovering two bookings a month covers ₹699.',
    '• Biggest sensitivities: price (₹499 keeps Y3 negative at about -₹10.7 L; ₹999 makes it about +₹37 L) and churn (SMB software commonly loses 3–7% of customers a month; onboarding is the lever).',
    '',
    'RISK MITIGATION: the three star features and how we keep them safe: wrong setup data (database re-checks fit twice, reasons shown); bookings made outside Refill (desk records all, lock + unique index, daily export); consent withdrawn elsewhere (client controls it, STOP clears all offers, logged with time and source).',
  ].join('\n'))
}

pres.writeFile({ fileName: path.join(__dirname, LIGHT ? 'refill-deck-light-raw.pptx' : 'refill-deck-raw.pptx') }).then((f) => console.log('wrote', f))
