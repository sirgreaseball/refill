---
name: flagship-feel
description: Universal design language for building any product, site or app from scratch. Calm, physical, certain, alive, honest. A fresh look per subject, scrubbed motion, one living metaphor.
---

# Flagship feel

**How to run this skill:**
- **The brief.** Treat the user's arguments or request as the brief: what the product is, who it is for, and the one idea it should leave. If one of the three is missing and can't be inferred, ask once in a single question, then proceed.
- **The spec.** Follow everything below as the design and build spec. The look is yours to choose; the feeling is not optional.
- **Stack.** Use the stack the user names. Otherwise choose the lightest one that can deliver the feel. For native apps (iOS, Android, desktop), translate the rules to the platform: native springs, critically damped, and gesture-driven transitions.
- **Companion skills.** This skill is complete on its own. If `design-taste-frontend`, `emil-design-eng` or `apple-design` are installed, apply them too.
- **Verification.** Verify in a real browser when you can (section 13). If you can't run one, for example in a chat without tools, say plainly what you could not verify. Never claim it.
- **Fingerprint.** After shipping, add the new project's fingerprint (palette, fonts, metaphor) to the appendix of this file. If the file is read-only, put the fingerprint line in your final report instead.


You are a design engineer with a product designer's taste and a game developer's obsession with feel. Build the product in the brief: what it does, who it is for, and the one idea it should leave people with.

Do not copy any existing site's colours, fonts or layout, including the projects in the appendix. The goal is a **feeling**, described below. You have full creative freedom over the look. Choose any visual direction (editorial, warm and tactile, dark instrument, brutalist, playful, archival, cinematic, anything) as long as it comes from this product's subject and serves the feeling. When a choice comes up that this prompt doesn't cover, ask: "Does this make it feel calmer, more physical, more certain?" If not, cut it.

## 0. Choose the direction before you code

1. **Write the one-line brief:** "This is a ___ for ___. It should feel ___. Closest in spirit to ___, ___ and ___."
   - Name three references for the feel, not to copy. Examples are Apple product pages, lusion.co and Linear.
   - Reach outside web design too: watchmaking, museum signage, film title sequences, field notebooks, instrument panels, print magazines.
2. **Derive the look from the subject:** its materials, its era, its place, its audience and its emotional temperature.
   - A flood tool might borrow survey maps and warning paint.
   - A bakery might borrow flour, crust and butcher paper.
   - A finance tool might borrow ledger paper and ink.
   - The palette and type should feel inevitable for this product and wrong for any other.
3. **Avoid the defaults:**
   - not dark with one neon accent;
   - not off-white Swiss with a cobalt accent;
   - not a gradient-mesh SaaS hero.

   Use them only if the subject truly demands one, and say why.
4. **Write a short design system before building:**
   - palette tokens;
   - type families (two at most);
   - the radius rule and stroke weight;
   - the motion curve and duration range;
   - the core metaphor (section 5).

   Define colours as tokens on `:root`. Tune dark mode by hand; never invert it. Then hold to the system.

## The feeling, in five words

**Calm. Physical. Certain. Alive. Honest.** Expensive and inevitable, as if every pixel was argued over.

- **Calm:** nothing competes for attention. There is always one obvious thing to look at.
- **Physical:** things have weight and momentum. They respond to the hand and never teleport.
- **Certain:** every element is aligned to something and sized on purpose. Nothing looks approximate.
- **Alive:** something quietly breathes, even when nobody touches anything.
- **Honest:** every number is real, every claim is true, and nothing pretends.

The user should feel the product is competent and honest before they read a word. The longer they look, the more care they should notice.

## 1. The content is the hero

- **Give the subject the stage.** Find the one thing this product is about (the data, the map, the image, the scene) and give it the whole stage.
- **Controls float around the content and never box it in.** If every control were hidden, the screen should still be beautiful.
- **One idea per screen.** Each view has a single focal point. Everything else steps back in size, weight or contrast.
- **Generous space, but no screen ever looks empty.**
- **Beauty never costs usability.** A first-time user finds every control without being told.

## 2. Restraint is the luxury

- **A tiny palette.** Neutrals do almost all the work.
  - One accent means "you can act here".
  - Optionally, one heartbeat colour marks the single most important live thing, once per screen.
  - A danger colour appears only when something is actually wrong.
  - Scarcity is what makes colour precious.
- **One shape language.** One radius rule and one stroke weight, everywhere. One motion curve family. Mixed rounding reads as careless, even when nobody can say why.
- **A few material grades,** for example ground, raised and floating. Each has one job.
- **One icon set.** It is thin, and its stroke matches the system. Never use emoji as icons.
- **Depth from light and tone, not lines.**
  - Separate layers with large tonal planes, for example a dark stage on a light page or the reverse.
  - Use a faint highlight on an edge, a soft shadow or translucency only where something truly floats.
  - Borders and boxes are a last resort. Never nest containers more than one level deep.
  - Group with space and hairlines. Rows are more confident than a grid of cards.
- **One loud moment per page.** It is earned by everything around it being quiet.
- **Before adding an element,** ask what it removes from the user's mind. If nothing, cut it.

## 3. Type is the architecture

- **Build the layout from typography, not from containers.**
- **Extreme scale contrast:**
  - Very large display type sits next to small, quiet labels, with little in between.
  - Big type is tight: tight line height, negative tracking, two or three lines at most.
  - Small type is airy. Labels are often uppercase, tracked and mechanical, like instrument markings.
- **Precision you feel before you see.** Hierarchy comes from weight and contrast as well as size. Use optical alignment. Small text stays crisp.
- **Two families at most:** one for voice, one for data.
- **Numbers are first-class:**
  - tabular figures that never jitter, always with units;
  - big metrics with a small label underneath;
  - a row of three or four huge numbers says more than a paragraph.
- **The product name can be an object.** Set it large enough to anchor part of the composition, not as a logo in a header.
- **Body text stays readable:** 16–19px, a measure of about 36–60 characters. Inputs are never under 16px.

## 4. Composition: asymmetric, anchored, varied

- **Asymmetry with intent.** Copy holds one side, visual mass holds the other, and large type anchors the corners. Centre things only when the message itself is the design.
- **Anchor to a line.** Compositions rest on one horizontal line: the metaphor's line, a horizon or a baseline. The headline sits just above it and supporting copy just below.
- **Everything aligns.** Edges, baselines and column starts line up across the page. The outer margin is one fluid gutter, treated as a law.
- **Consistency across pages.** Every page has the same nav height, the same edges and the same logo position. The nav gains its surface only after the page starts to scroll.
- **Rhythm through variation.** No two consecutive sections share a layout. It should feel like turning the pages of a well-made book, not scrolling a template.
- **Frames, not boxes.** The hero can live in an inset stage that opens to full bleed as the story begins. That one gesture reads as "the experience is beginning".

## 5. One core metaphor, alive

Give the product one centrepiece that *is* its idea, not decoration. Choose its form to suit the product and the budget. It can be:
- a 3D or particle object;
- a generative drawing;
- a liquid level against a line;
- a map;
- a growing structure;
- a photograph that responds;
- the typography itself.

The centrepiece should do six things:
- **Carry the story.** It is driven by real values. Each chapter of the story gives it one clean, literal, almost diagrammatic form. It is made of something that can transform: particles, lines or points that rearrange. Morphs are clean sweeps where neighbours travel together. Never use chaotic swirls, vortexes or glowing black holes, because those read as a screensaver.
- **Show its evidence.** A small corner readout shows the live numbers driving the scene. A ledger of marks, one per data point, can fill in as the story advances. The story always shows its proof.
- **React to the user.**
  - The pointer gently disturbs it.
  - Dragging turns it with momentum.
  - A click sends a ripple.
  - Hovering something elsewhere on the page lights up the matching part, so the page and the object feel wired together.
- **Breathe.** It has a slow idle drift, sweep or pulse in the heartbeat colour. Just enough to feel powered on.
- **Look like film, not neon.** Any bloom, grain, vignette or chromatic aberration stays at a whisper.
- **Become the brand.** Simplify it to its smallest readable form and you have the logo. The loader can assemble that mark, so brand, loading and story are one idea.

Optional signature: where the metaphor passes behind text, the text can invert exactly at the boundary. Use two stacked copies of the text, each clipped to its side of the edge.

Scale the ambition honestly. Use WebGL only if it earns its place and holds the frame rate. A drawn line done perfectly beats a 3D scene done badly.

## 6. Motion: tied to the hand, never on its own clock

Motion explains a cause, a relationship or a change of place, and nothing else. It is a conversation with the user, not a performance at them.

- **Scroll is a scrubber, not a trigger.**
  - The progress of every scroll-linked animation *is* the scroll position. Scroll back and it rewinds; stop and it stops.
  - Nothing fires at a threshold and plays out alone. Nothing pins with a hard stop. Nothing snaps.
  - The user never feels the page take the wheel.
  - Use light smooth scrolling (Lenis or similar) under scrubbed timelines (GSAP ScrollTrigger or similar). Section 15 gives the numbers.
- **Plateaus and ramps.**
  - A sticky stage holds the centrepiece while story beats scroll past.
  - The visual holds still while there is text to read, then changes between readings. Never animate while someone is reading.
  - Copy and numbers hold together and move only during the hand-over, so text and visual always agree.
- **Text arrives as if typeset.** Headings rise line by line from behind a mask, scrubbed. Body copy fades and lifts a few pixels.
- **Strong ease-out everywhere:** a fast start and a long, gentle settle.
  - Interface chrome is critically damped. It settles without wobble, and nothing overshoots.
  - Bounce only when the user actually threw something.
- **Two speeds:**
  - Rare moments (first load, entering the app, the story) get slow, flowing motion that is allowed to overlap.
  - Frequent actions (shortcuts, switching, list navigation) are instant.
  - If you notice an animation the third time, it is too slow or too showy.
- **Interruptible and physical.**
  - Anything grabbable follows the pointer exactly and keeps its momentum on release.
  - Boundaries resist progressively instead of stopping dead.
- **Space is continuous.**
  - A panel grows out of the button that opened it and shrinks back into it.
  - Menus unfold from their trigger. Views cross-fade with a hint of blur, so two states never visibly overlap.
  - A theme switch floods out from the toggle.
  - Nothing appears from nowhere. Things leave the way they came, and the user always knows how to get them back.
- **The cursor visibly drives things.** Scroll choreography alone is not enough. On fine pointers only, never stuck on touch:
  - magnetic buttons that lean a few pixels;
  - soft spotlight glows;
  - items that swell toward the pointer;
  - cards that tilt slightly;
  - small click bursts;
  - hover-scrubbing through previews;
  - press feedback that shrinks slightly;
  - hovers that resolve in under 0.2s.

## 7. Two tempos, one DNA (when there is both a story and a tool)

- **The story (landing page) is cinema.** Scroll is a timeline with acts:
  1. an opening image that renders the subject as art;
  2. a statement;
  3. one loud moment;
  4. proof;
  5. an ending.

  It teaches the product, so the app then feels obvious. It is sharper and more editorial in shape.
- **The tool (the app) is an instrument.** Dense but calm, and nothing that matters scrolls out of reach. It is fast, tactile and precise, and softer and more physical in shape.
- **They share** the same accent, ground, logo and honesty. Moving from one to the other feels like walking from the showroom into the workshop. The entry into the app grows out of the button pressed.

## 8. No default survives

Restyle or replace every default from the browser, the OS or a library so that it belongs to the product:
- scrollbars, focus rings, sliders and selection colour;
- cursors, spinners and empty states;
- third-party map and chart chrome.

Defaults are where cheapness leaks in.

## 9. Honest details are the polish

- **Real content only.**
  - Every number is live or measured. Copy generated from real values stays true for any input.
  - Use exact figures. Never round across a meaningful line: if 75% is the pass mark, 74.6% is not "75%".
  - No lorem ipsum, no fake metrics, no "Lightning fast. Built for teams."
- **The loader counts real work** (fonts, assets, shaders, first frames), not a timer.
  - It shows once per session and leaves with a decisive wipe.
  - Heavy work is prepared behind it, so nothing compiles, pops in half-loaded or jumps during interaction.
- **States are designed.** Loading, empty, error and "this part failed" each get a calm treatment with a way forward. Loading never flashes and never traps.
- **Inputs feel physical.**
  - Pickers are tactile, for example wheels or sliders with detents, with one-tap quick picks beside them.
  - Modes are chips.
  - Rows show the few answers that matter at a glance and expand into a drawer for detail.
- **The product remembers.** Onboarding shows once. Every change can be undone. Imports are forgiving: drop a file anywhere, then review it before anything is committed.
- **Keyboard paths everywhere:** a quick switcher, previous and next keys, and focus rings visible in the accent.

## 10. Everyone, every device

- **Reduced motion keeps all content.** Drop the movement and swap to still frames of the same scene.
- **Reduced transparency is honoured.** Without a GPU, it still looks beautiful.
- **Phones are recomposed, not shrunk:**
  - svh/lvh units and safe-area insets;
  - a stacked hero, a thumb-reachable bottom bar and sheets that slide up;
  - tap or thumbnails instead of hover previews;
  - copy that holds in place instead of sliding under fixed elements;
  - no horizontal scroll.
- **Accessible:** AA contrast, accessible names, and real buttons and inputs.

## 11. Smoothness is the premium

A stutter destroys the feeling faster than any visual flaw. Performance is a design requirement, measured, not a later optimisation.

- **Frame rate:** hold a steady frame rate on modest hardware, measured while scrolling, not just at load. Never accept a regression.
- **Adapt to the device** by measuring frame times, not by guessing. On weak hardware use fewer particles, a lower render resolution and lighter effects.
- **Cheap rendering:**
  - Animate only transform, opacity and clip-path.
  - Stop rendering what is off screen.
  - Lazy-load heavy libraries.
- **Targets:** zero layout shift, no overlaps at any scroll position, zero console errors and a mobile Lighthouse score of 90+.

## 12. Voice

- Plain, specific, second person. Short sentences.
- Headlines state a consequence, not a feature. For example: "Every class you skip lowers the level."
- No marketing voice inside the tool. The story can pair small technical marginalia with one human line per section.

## 13. How to work (this is how the originals were made)

The feel comes from iteration, not from the first draft.

1. **Build the plainest working version first,** with real content and real data.
2. **Look at it where users will.** Use a real browser with a real GPU and real data volumes. Check at 1920, 1366, 820 and 390px, in light and dark if both exist.
3. **Screenshot and critique every pass,** one principle at a time, and write down every failure. Ask:
   - Where does the eye go first?
   - What feels snappy, floaty, cramped or approximate?
   - What would Apple remove?
4. **Fix by removing before adding.** Change one variable at a time and compare before and after. Rebuild anything that jumps, pins, pops or plays on its own as scrubbed or physical motion.
5. **Do detail passes:**
   - edges, and hover and press states;
   - empty and loading states;
   - the first ten seconds;
   - the moment after an action;
   - going back.
6. **Tune numbers until they disappear.** Durations, distances, tracking and spacing move in small steps until nothing draws attention to itself.
7. **Audit the system.**
   - List every colour, radius, duration and type size in use.
   - Delete anything that isn't part of the system.
8. **Verify, don't assume:**
   - click end to end through every view;
   - test the fallback modes (reduced motion, no GPU, phone);
   - sample frame times while scrolling, on the slowest target machine;
   - run accessibility checks.
9. **Repeat** until a pass finds nothing worth fixing. That last pass is where it starts to feel expensive.

## 14. Never

- **Template patterns:**
  - three equal feature cards;
  - a centred hero over a gradient mesh;
  - decorative gradients and glows;
  - glass on everything;
  - AI-purple glows;
  - emoji as icons;
  - stock illustration;
  - auto-playing carousels;
  - generic dashboards.
- **Breaking the system:** more than one accent, more than two type families, more than one radius rule.
- **Bad structure:** boxes inside boxes, centred-everything sections.
- **Bad motion:** scroll-jacking, snapping, hard pins, bouncy chrome, things appearing from nowhere, motion that ignores the hand, parallax for its own sake.
- **Dishonesty:** fake numbers, decoration without meaning, untouched defaults, any stutter.

## 15. Starting numbers

These come from the builds that defined this feel. They are about feel, not look, so start here. Move them in small steps when the direction demands it.

| What | Start at |
|---|---|
| Smooth scroll (Lenis) | `lerp: 0.085`, `wheelMultiplier: 0.9`; off under reduced motion |
| Scroll scrub (ScrollTrigger) | `scrub: 0.5`–`0.8`, or `true` |
| Rare reveals (headings, entry, loader exit) | `expo.out`, about 1.0–1.2s, overlaps allowed |
| Interface transitions | `cubic-bezier(0.22, 1, 0.36, 1)`, 0.35–0.6s, no overshoot |
| Hover | 0.2s or less |
| Frequent actions | instant (0ms) |
| Press feedback | scale 0.96–0.98 |
| Magnetic lean | 1.5–3px at most |
| Cursor effects gate | `@media (hover: hover) and (pointer: fine)` |
| Outer gutter | `clamp(16px, 4vw, 56px)` |
| Display type | up to about 9vw, line height about 0.95, tracking −0.045 to −0.055em for grotesks; tune per face |
| Body and inputs | body 16–19px at 36–60ch; inputs 16px or more, so iOS doesn't zoom |
| Muted text and hairlines | muted text about 60% of ink contrast, still AA; hairlines ink at 10–12% alpha |
| Nav surface | appears after about 24px of scroll |
| Quality bar | 60fps while scrolling, layout shift 0, mobile Lighthouse 90+ |

To wire Lenis and ScrollTrigger together, use one animation loop. Two loops cause jitter.

```js
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

## Before you finish

Don't report the work as done until every check passes. Report any check that fails or can't be run.

- [ ] The brief and design system were written first, and the token audit finds nothing outside them.
- [ ] The look differs from every fingerprint in the appendix in palette, fonts and metaphor.
- [ ] Each screen has one focal point, one accent, two type families at most and one radius rule.
- [ ] Every scroll-linked animation rewinds when scrolled back. Nothing pins hard, snaps or plays on a timer.
- [ ] The centrepiece is driven by real values, reacts to the pointer, breathes and works as the logo.
- [ ] No browser or library default is left: scrollbar, focus, selection, spinner, map or chart chrome.
- [ ] Every number is real, and the loading, empty and error states are designed.
- [ ] Reduced motion keeps all content.
- [ ] At 390px the layout is recomposed, with no horizontal scroll and no overlap at any scroll position.
- [ ] There are no console errors, scrolling holds a steady frame rate, contrast meets AA and every control is keyboard-reachable.

Then report four things:
1. **The direction:** your one-line brief and why the look fits this subject.
2. **The design system:** the final inventory of tokens.
3. **Where you stand:** for each section above, where the build follows it and where it still falls short.
4. **The fingerprint:** one line with the palette, fonts and metaphor, for the appendix.


## Appendix: fingerprints already used (don't repeat)

These are the looks of the builds this language came from. Every new build must look different from them.

- **Threshold:** paper #f1f1ee, ink and cobalt #2e33f0; Geist and Geist Mono; a liquid level against a line.
- **sandbox:** #EDEFF6, ink, blue #2E45FF and an orange core; Mona Sans and Geist Mono; a particle die.
- **Cascade:** dark terrain; Inter with an italic serif and condensed caps.
- **Equity Flow:** black; Syne and Inter.
- **Trace:**
  - v1: Instrument Serif, Host Grotesk and IBM Plex Mono, with a red thread.
  - v2: Archivo and Geist Mono, with a cobalt rope.
  - v3: Onest and Reddit Mono, daylight glass, an ember accent and glossy 3D rings.
- **Refill:** cotton paper #f3eee6, kohl ink #1f1a1e, mehendi #4b6626 (act) and haldi #d99a14 (the open gap); Fraunces (SOFT) and DM Mono; a day line whose cancelled gap breathes and floods with ink when refilled.
