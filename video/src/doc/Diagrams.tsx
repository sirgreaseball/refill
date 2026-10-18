// Print-friendly figures for the team documents: Refill's light tokens, the chronograph type.
import React from 'react'
import { AbsoluteFill } from 'remotion'
import { F } from '../theme'

const L = {
  bg: '#f4f2ed', surface: '#ffffff', ink: '#121214', ink2: '#5a5852', ink3: '#8c8981',
  line: 'rgba(18,18,20,0.14)', act: '#3f6b00', actSoft: 'rgba(63,107,0,0.1)', beat: '#b86e00', beatSoft: 'rgba(212,130,10,0.13)',
  danger: '#d13a2b', dangerSoft: 'rgba(209,58,43,0.09)',
}

function Box({ x, y, w, h, title, sub, items, tone, mono }: { x: number; y: number; w: number; h: number; title: string; sub?: string; items?: string[]; tone?: 'act' | 'beat' | 'danger'; mono?: boolean }) {
  const c = tone ? L[tone] : L.ink
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: L.surface, border: `2px solid ${tone ? c : L.line}`, borderRadius: 18, padding: '18px 22px', boxShadow: '0 10px 28px -14px rgba(20,20,30,0.25)' }}>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 26, color: c, lineHeight: 1.1 }}>{title}</div>
      {sub && <div style={{ fontFamily: F.mono, fontSize: 15, color: L.ink3, marginTop: 6, letterSpacing: '0.04em' }}>{sub}</div>}
      {items && (
        <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
          {items.map((t) => <div key={t} style={{ fontFamily: mono ? F.mono : F.sans, fontSize: mono ? 15 : 18, color: L.ink2, lineHeight: 1.3 }}>{t}</div>)}
        </div>
      )}
    </div>
  )
}

function Arrow({ x1, y1, x2, y2, label, color = L.ink2, dashed, lx = 0, ly = -12 }: { x1: number; y1: number; x2: number; y2: number; label?: string; color?: string; dashed?: boolean; lx?: number; ly?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const hx = x2 - Math.cos(a) * 14
  const hy = y2 - Math.sin(a) * 14
  return (
    <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }} width="100%" height="100%">
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? '8 6' : undefined} />
      <polygon points={`${x2},${y2} ${hx - Math.sin(a) * 7},${hy + Math.cos(a) * 7} ${hx + Math.sin(a) * 7},${hy - Math.cos(a) * 7}`} fill={color} />
      {label && <text x={(x1 + x2) / 2 + lx} y={(y1 + y2) / 2 + ly} textAnchor="middle" style={{ font: `500 15px ${F.mono}`, fill: color }}>{label}</text>}
    </svg>
  )
}

function Title({ k, t }: { k: string; t: string }) {
  return (
    <div style={{ position: 'absolute', left: 60, top: 40 }}>
      <div style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: '0.18em', color: L.ink3 }}>{k}</div>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 40, color: L.ink, marginTop: 6 }}>{t}</div>
    </div>
  )
}

export function Arch() {
  return (
    <AbsoluteFill style={{ background: L.bg }}>
      <Title k="FIGURE · ARCHITECTURE" t="Every rule lives in the database" />
      <Box x={60} y={170} w={330} h={420} title="People" sub="ONE APP, FIVE VIEWS" items={['Owner · email + password account', 'Front desk · desk link (key)', 'Staff member · private link', 'Client · phone, private link or QR', 'Judges · /#/lab proof page']} />
      <Box x={470} y={170} w={520} h={420} title="Refill web app" sub="REACT 19 · TYPESCRIPT · VITE 8 · VERCEL" items={[
        'Pages per role, lazy-loaded; hash routes',
        'src/engine.ts: the rules as pure functions (previews, Lab, tests)',
        'src/rpc.ts: plain fetch POST to /rest/v1/rpc/<function>',
        'src/auth.ts: Supabase Auth over fetch, JWT bearer',
        'Polls state every 2 s, skips unchanged state',
        'PWA: service worker caches the shell, never the data',
        'CSP, nosniff, strict referrer headers (vercel.json)',
        '/splash: GSAP + Lenis story, its own chunk',
      ]} />
      <Box x={60} y={620} w={330} h={222} title="Hosting" sub="VERCEL · GITHUB" items={['Push to main deploys in ~1 min', 'CI on every push: npm ci, test, build']} />
      <Box x={470} y={620} w={520} h={222} title="Checks" sub="RUN FROM A CLEAN CHECKOUT" items={['npm test · 51 rules and scenario tests', 'npm run dbtest · 28 live database checks', 'npm run race · 8 taps, 1 booking, 3 runs', 'npm run flowtest · 14 cross-role checks']} />
      <Box x={1070} y={170} w={470} h={420} title="Supabase · Postgres" sub="83 FUNCTIONS · 13 TABLES" tone="act" items={[
        'PostgREST: one endpoint per function',
        'security definer functions re-check every rule',
        'Row level security on, no policies: tables unreachable',
        'Row locks + partial unique indexes',
        'rate_hits limits, events append-only',
        'pg_cron: tick_live() every minute (IST clock)',
      ]} />
      <Box x={1070} y={620} w={470} h={222} title="Supabase Auth" sub="GOTRUE · EMAIL + PASSWORD" items={['Session in the browser, bearer on every call', 'profiles table: name + role']} />
      <Box x={1600} y={170} w={260} h={672} title="Tables" sub="RLS ON, NO POLICIES" mono items={['workspaces', 'staff', 'services', 'slots', 'waitlist', 'offers', 'bookings', 'moves', 'events', 'history', 'staff_tasks', 'profiles', 'rate_hits']} />
      <Arrow x1={390} y1={380} x2={470} y2={380} label="taps" />
      <Arrow x1={990} y1={380} x2={1070} y2={380} label="RPC" ly={-14} color={L.act} />
      <Arrow x1={990} y1={715} x2={1070} y2={715} label="auth" ly={-14} />
      <Arrow x1={1540} y1={380} x2={1600} y2={380} color={L.act} />
      <div style={{ position: 'absolute', left: 60, bottom: 40, fontFamily: F.sans, fontSize: 19, color: L.ink2, width: 1800 }}>
        The browser only previews. Every write is a database function that checks the caller's role, re-checks the rules under a row lock, logs an event and returns a code.
      </div>
    </AbsoluteFill>
  )
}

export function Flow() {
  const lanes = [
    { x: 150, t: 'Front desk' },
    { x: 700, t: 'Database' },
    { x: 1250, t: 'Client A · Meera' },
    { x: 1700, t: 'Client B · Sameer' },
  ]
  const Step = ({ x, y, w = 420, t, s, tone }: { x: number; y: number; w?: number; t: string; s: string; tone?: 'act' | 'beat' | 'danger' }) => (
    <div style={{ position: 'absolute', left: x - w / 2, top: y, width: w, padding: '12px 16px', borderRadius: 14, background: tone ? (tone === 'act' ? L.actSoft : tone === 'beat' ? L.beatSoft : L.dangerSoft) : L.surface, border: `1.5px solid ${tone ? L[tone] : L.line}` }}>
      <div style={{ fontFamily: F.mono, fontSize: 17, color: tone ? L[tone] : L.ink, fontWeight: 500 }}>{t}</div>
      <div style={{ fontFamily: F.sans, fontSize: 16, color: L.ink2, marginTop: 4, lineHeight: 1.3 }}>{s}</div>
    </div>
  )
  return (
    <AbsoluteFill style={{ background: L.bg }}>
      <Title k="FIGURE · ONE CANCELLATION, END TO END" t="Two taps at the same instant, one booking" />
      {lanes.map((l) => (
        <React.Fragment key={l.t}>
          <div style={{ position: 'absolute', left: l.x - 160, width: 320, top: 150, textAlign: 'center', fontFamily: F.display, fontWeight: 600, fontSize: 24, color: L.ink }}>{l.t}</div>
          <div style={{ position: 'absolute', left: l.x - 1, top: 190, width: 2, height: 830, background: L.line }} />
        </React.Fragment>
      ))}
      <Step x={150} y={215} w={260} t="cancel_slot" s="Harsh, 12:00, 45 min notice" tone="beat" />
      <Step x={700} y={215} t="slot free · LATE flagged" s="event CANCELLED; the gap turns amber on every screen" />
      <Arrow x1={280} y1={255} x2={490} y2={255} />
      <Step x={150} y={340} w={260} t="send_offers" s="3 of the 6 who fit" />
      <Step x={700} y={330} t="rate limit · desk key · expire stale" s="fit_reason() per client, frequency cap (3/day), insert offers with a 15-min hold" />
      <Arrow x1={280} y1={380} x2={490} y2={380} />
      <Arrow x1={910} y1={400} x2={1150} y2={470} dashed />
      <Arrow x1={910} y1={410} x2={1600} y2={470} dashed />
      <div style={{ position: 'absolute', left: 1290, top: 372, fontFamily: F.mono, fontSize: 16, color: L.ink2, background: L.bg, padding: '2px 8px' }}>offer links · URL or QR</div>
      <Step x={1250} y={480} w={300} t="accept_offer" s="taps Book at 12:00:07.412" />
      <Step x={1700} y={480} w={300} t="accept_offer" s="taps Book at 12:00:07.412" />
      <Arrow x1={1100} y1={530} x2={910} y2={600} />
      <Arrow x1={1550} y1={530} x2={910} y2={640} />
      <Step x={700} y={580} t="lock offer → slot → entry (FOR UPDATE)" s="the second call waits on the slot row lock" tone="act" />
      <Step x={700} y={700} t="A: re-check consent, fit, time, hold" s="insert booking; unique index bookings_one_per_slot is the backstop" tone="act" />
      <Step x={700} y={830} t="B: booking already exists" s="offer → waitlisted; B keeps their queue place; event logged" />
      <Arrow x1={910} y1={740} x2={1100} y2={760} />
      <Arrow x1={910} y1={870} x2={1550} y2={890} />
      <Step x={1250} y={740} w={300} t="CONFIRMED" s="slot refilled · ₹1,600 back" tone="act" />
      <Step x={1700} y={880} w={300} t="WAITLISTED" s="keeps their place" />
    </AbsoluteFill>
  )
}

export function OfferLife() {
  const node = (x: number, y: number, t: string, s: string, tone?: 'act' | 'beat' | 'danger') => <Box x={x} y={y} w={330} h={130} title={t} sub={s} tone={tone} />
  return (
    <AbsoluteFill style={{ background: L.bg }}>
      <Title k="FIGURE · OFFER LIFECYCLE" t="Every offer ends in exactly one state" />
      {node(110, 440, 'sent', 'HELD 15 MIN · ≤ 3 / CLIENT / DAY', 'beat')}
      {node(780, 170, 'accepted', 'BOOKING CONFIRMED', 'act')}
      {node(780, 330, 'waitlisted', 'LOST THE RACE · KEEPS PLACE')}
      {node(780, 490, 'declined', 'CLIENT SAID NO')}
      {node(780, 650, 'expired', 'NO REPLY IN THE HOLD WINDOW')}
      {node(780, 810, 'revoked', 'RULE BROKE BEFORE BOOKING', 'danger')}
      {[235, 395, 555, 715, 875].map((y, i) => <Arrow key={i} x1={440} y1={505} x2={780} y2={y} color={i === 0 ? L.act : i === 4 ? L.danger : L.ink2} />)}
      <div style={{ position: 'absolute', left: 1180, top: 170, width: 660, display: 'grid', gap: 18, fontFamily: F.sans, fontSize: 21, color: L.ink2, lineHeight: 1.35 }}>
        <div><b style={{ color: L.act }}>accepted</b>: accept_offer() found the slot free and every rule still true.</div>
        <div><b style={{ color: L.ink }}>waitlisted</b>: another client booked first; this client keeps their place.</div>
        <div><b style={{ color: L.ink }}>declined</b>: the client tapped No.</div>
        <div><b style={{ color: L.ink }}>expired</b>: the hold passed; expire_offers() runs on every send and every minute on live businesses (OFFER_EXPIRED).</div>
        <div><b style={{ color: L.danger }}>revoked</b>: STOP or consent withdrawn, staff member out, cancellation undone, or a rule failed at the moment of booking (NO_CONSENT, SKILL_MISMATCH, DURATION_TOO_LONG, NOT_AVAILABLE, SLOT_UNAVAILABLE).</div>
        <div style={{ fontFamily: F.mono, fontSize: 17, color: L.ink3 }}>A repeated tap on an accepted offer returns ALREADY_CONFIRMED and the same booking.</div>
      </div>
    </AbsoluteFill>
  )
}
