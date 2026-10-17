// The owner's three pages. Overview: what today recovered, counted live from the database.
// Team: who is in, each staff member's link, the front-desk link and the client sign-up code.
// Rules: the policies the database enforces, and who may do what.
import { useState, type FormEvent } from 'react'
import { deskLinkUrl, joinLink, ownerLink, staffLinkUrl, type DbStaff, type State } from './api'
import { figures, togglePresence, useRun, type Book } from './desk/common'
import { Icon, Modal, Qr, clock, copy, lead, money } from './ui'

type Can = 'yes' | 'own' | 'no'

// Mirrors the checks in supabase/migrations 004 and 005: require_owner, require_desk,
// require_staff, the client's token and the unguessable offer and move links.
const ACCESS: [string, Can, Can, Can, Can][] = [
  ['See the day, the waitlist and everyone’s consent', 'yes', 'yes', 'no', 'no'],
  ['Record a cancellation, undo it', 'yes', 'yes', 'no', 'own'],
  ['Offer an open gap to the waitlist', 'yes', 'yes', 'no', 'no'],
  ['Move an appointment, or send a link to choose', 'yes', 'yes', 'no', 'own'],
  ['Mark a staff member in or out', 'yes', 'yes', 'own', 'no'],
  ['Change consent', 'yes', 'yes', 'no', 'own'],
  ['Book or decline an offer', 'no', 'no', 'no', 'own'],
  ['Change the rules: hold window, message cap, late cut-off', 'yes', 'no', 'no', 'no'],
  ['Make staff and front-desk links', 'yes', 'no', 'no', 'no'],
  ['Reset the demo day', 'yes', 'no', 'no', 'no'],
]
const CAN_TEXT: Record<Can, string> = { yes: 'Yes', own: 'Own only', no: '—' }

function OwnerOnly() {
  return (
    <div className="stack">
      <header className="page-head"><div><p className="overline">Owner</p><h1>Owner only</h1><p>This key is the front desk’s. The database refuses owner actions for it.</p></div></header>
      <Access />
    </div>
  )
}

// ---------------------------------------------------------------- overview

export function Overview({ book }: { book: Book }) {
  const st = book.state!
  if (st.role !== 'owner') return <OwnerOnly />
  const f = figures(st)
  const n = counts(st)
  const util = st.staff.map((p) => {
    const mins = st.slots.filter((s) => s.staff_id === p.id && s.status === 'booked').reduce((m, s) => m + s.minutes, 0)
    return { p, pct: Math.round((mins / Math.max(1, p.shift_end - p.shift_start)) * 100) }
  })
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="overline">Owner · {st.workspace.salon}</p>
          <h1>{f.recovered ? `${money(f.recovered)} back in the book today` : 'Nothing recovered yet today'}</h1>
          <p>Counted live from the database. Synthetic demo day.</p>
        </div>
      </header>
      <div className="stats">
        <div className={`stat ${f.recovered ? 'is-act' : ''}`}><div className="stat-v">{money(f.recovered)}</div><div className="stat-l">Recovered from cancellations</div></div>
        <div className={`stat ${f.openValue ? 'is-beat' : ''}`}><div className="stat-v">{money(f.openValue)}</div><div className="stat-l">Still open, can be filled</div></div>
        <div className="stat"><div className="stat-v">{money(n.lost)}</div><div className="stat-l">Gaps that passed unfilled</div></div>
        <div className="stat"><div className="stat-v">{f.refilled}/{n.cancelled}</div><div className="stat-l">Cancellations refilled · {n.late} late</div></div>
      </div>
      <div className="grid-2">
        <section className="group">
          <div className="group-head"><h2>Offers</h2><p>{n.sent ? `${n.accepted} of ${n.sent} booked` : 'None sent yet'}</p></div>
          <ul className="facts">
            <li><span>Declined</span><span className="mono">{n.declined}</span></li>
            <li><span>No reply in time</span><span className="mono">{n.expired}</span></li>
            <li><span>Tapped a moment late, kept their place</span><span className="mono">{n.lostRace}</span></li>
            <li><span>Withdrawn (consent, staff out, moved)</span><span className="mono">{n.revoked}</span></li>
          </ul>
        </section>
        <section className="group">
          <div className="group-head"><h2>Consent</h2><p>{n.yes} may be messaged</p></div>
          <ul className="facts">
            <li><span>Said no</span><span className="mono">{n.no}</span></li>
            <li><span>Never asked, so never messaged</span><span className="mono">{n.unknown}</span></li>
            <li><span>Offers refused for consent</span><span className="mono">{n.blockedByConsent}</span></li>
          </ul>
        </section>
        <section className="group">
          <div className="group-head"><h2>Reschedules</h2><p>{n.movedByDesk + n.movedByClient} moved, none double-booked</p></div>
          <ul className="facts">
            <li><span>By the front desk</span><span className="mono">{n.movedByDesk}</span></li>
            <li><span>By the client, from their link</span><span className="mono">{n.movedByClient}</span></li>
            <li><span>Links waiting for a reply</span><span className="mono">{n.linksOpen}</span></li>
          </ul>
        </section>
        <section className="group">
          <div className="group-head"><h2>Staff booked today</h2><p>Share of each shift</p></div>
          <ul className="facts">
            {util.map(({ p, pct }) => (
              <li key={p.id}><span>{p.name}{p.present ? '' : ' · out'}</span><span className="bar-meter" aria-label={`${pct}% of shift booked`}><span style={{ width: `${Math.min(100, pct)}%` }} /></span><span className="mono">{pct}%</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function counts(st: State) {
  const now = st.workspace.now_min
  const ev = (k: string) => st.events.filter((e) => e.kind === k)
  const cancelled = new Set(ev('CANCELLED').map((e) => e.slot_id))
  const o = (status: string) => st.offers.filter((x) => x.status === status).length
  const consent = (v: boolean | null) => st.waitlist.filter((e) => e.status === 'waiting' && e.consent === v).length
  const moved = ev('MOVED')
  return {
    lost: st.slots.filter((s) => s.status === 'free' && s.start_min < now && cancelled.has(s.id)).reduce((n, s) => n + (s.price_inr ?? 0), 0),
    cancelled: cancelled.size, late: ev('CANCELLED').filter((e) => e.code === 'LATE').length,
    sent: st.offers.length, accepted: o('accepted'), declined: o('declined'), expired: o('expired'), lostRace: o('waitlisted'), revoked: o('revoked'),
    yes: consent(true), no: consent(false), unknown: consent(null),
    blockedByConsent: st.events.filter((e) => e.kind === 'OFFER_SKIPPED' && e.code === 'NO_CONSENT').length,
    movedByDesk: moved.filter((e) => e.detail.by === 'front desk').length, movedByClient: moved.filter((e) => e.detail.by === 'customer').length,
    linksOpen: st.moves.filter((m) => m.status === 'open').length,
  }
}

// ---------------------------------------------------------------- team and links

export function Team({ book }: { book: Book }) {
  const st = book.state!
  const run = useRun(book)
  const [share, setShare] = useState<{ title: string; url: string; note: string } | null>(null)
  if (st.role !== 'owner') return <OwnerOnly />
  const desk = book.desk!
  const now = st.workspace.now_min
  const code = st.workspace.join_code

  const staffLink = async (p: DbStaff) => {
    const key = await run<string>('staff_link', { p_staff: p.id })
    if (key) setShare({ title: `${p.name}'s link`, url: staffLinkUrl(desk.id, p.id, key), note: `${p.name} sees only their own day and can mark themselves in or out. A new link turns the old one off.` })
  }
  const deskLink = async (fresh = false) => {
    const k = await book.deskKey(fresh)
    if (k) setShare({ title: 'Front-desk link', url: deskLinkUrl(desk.id, k), note: 'Opens this day as the front desk: runs the day, cannot change the rules or make links. A new link turns the old one off.' })
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div><p className="overline">Owner · team and links</p><h1>Everyone sees only their part</h1><p>Each person gets their own link. The database checks the key behind it on every action.</p></div>
      </header>
      <section className="group">
        <div className="group-head"><h2>Staff</h2><p>Working hours keep every move inside a shift.</p></div>
        <ul className="rows">
          {st.staff.map((p) => {
            const ahead = st.slots.filter((s) => s.staff_id === p.id && s.status === 'booked' && s.start_min >= now).length
            return (
              <li key={p.id} className="person">
                <span className="avatar-sm">{p.name.slice(0, 1)}</span>
                <span className="row-main"><strong>{p.name}</strong><small>{p.skills.join(' · ')} · {clock(p.shift_start)}–{clock(p.shift_end)} · {ahead} booked ahead</small></span>
                <span className="person-acts">
                  <button className={`toggle-pill ${p.present ? '' : 'is-out'}`} onClick={() => togglePresence(run, p)}>{p.present ? 'In' : 'Out'}</button>
                  <a className="btn is-quiet" href={`#/staff/${p.id}`}>Their view</a>
                  <button className="btn" onClick={() => staffLink(p)}><Icon name="share" /> Link</button>
                </span>
              </li>
            )
          })}
        </ul>
      </section>
      <div className="grid-3">
        <section className="group">
          <p className="overline">Front desk</p>
          <h2 style={{ margin: '6px 0' }}>Their own login link</h2>
          <p className="quiet small">For whoever runs the counter. Runs the day; cannot change rules or make links.</p>
          <div className="card-acts" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => deskLink()}><Icon name="phone" /> Show link</button>
            <button className="btn is-quiet" onClick={async () => { await book.viewAs('desk'); location.hash = '#/desk' }}>Open as front desk</button>
          </div>
        </section>
        <section className="group">
          <p className="overline">Clients</p>
          <h2 style={{ margin: '6px 0' }}>Waitlist sign-up</h2>
          <p className="quiet small">Put this at the counter. Clients join and choose yes or no to messages; nothing is ticked for them.</p>
          {code && <div className="card-acts" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setShare({ title: 'Waitlist sign-up', url: joinLink(code), note: 'Scan to join the waitlist. Consent is an explicit choice.' })}><Icon name="phone" /> Show code</button>
            <a className="btn is-quiet" href={`#/join/${code}`}>Open it</a>
          </div>}
        </section>
        <section className="group">
          <p className="overline">You</p>
          <h2 style={{ margin: '6px 0' }}>This dashboard on your phone</h2>
          <p className="quiet small">Carries your owner key. Keep it to yourself.</p>
          <div className="card-acts" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setShare({ title: 'Your dashboard on a phone', url: ownerLink(desk), note: 'Owner rights. Do not share.' })}><Icon name="phone" /> Show code</button>
          </div>
        </section>
      </div>
      {share && (
        <Modal title={share.title} onClose={() => setShare(null)}>
          <div className="qr-one">
            <Qr text={share.url} size={208} />
            <p className="quiet">{share.note}</p>
            <div className="card-acts" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => copy(share.url)}><Icon name="copy" /> Copy link</button>
              {share.title === 'Front-desk link' && <button className="btn is-quiet" onClick={() => deskLink(true)}><Icon name="reset" /> New link</button>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- rules and access

export function Rules({ book }: { book: Book }) {
  const st = book.state!
  const w = st.workspace
  const [policy, setPolicy] = useState({ hold_min: w.hold_min, max_offers: w.max_offers, late_cutoff_min: w.late_cutoff_min, min_lead_min: w.min_lead_min })
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (st.role !== 'owner') return <OwnerOnly />

  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    setErr(null)
    try {
      const r = await book.act<{ ok: boolean }>('set_policy', { p_policy: policy })
      if (r.ok) setSaved(true)
      else setErr('Out of range. Hold 1–240 min, messages 1–20 a day, late cut-off 0–1440 min, lead 0–240 min.')
    } catch (e) { setErr((e as Error).message) }
  }
  const num = (k: keyof typeof policy) => (e: { target: { value: string } }) => { setSaved(false); setPolicy({ ...policy, [k]: Number(e.target.value) }) }

  return (
    <div className="stack">
      <header className="page-head"><div><p className="overline">Owner · rules</p><h1>The rules</h1><p>The database applies these to every offer and booking. Only the owner can change them.</p></div></header>
      <section className="group">
        <form className="policy" onSubmit={save}>
          <label className="field">Offer holds for (min)<input type="number" inputMode="numeric" min={1} max={240} value={policy.hold_min} onChange={num('hold_min')} /></label>
          <label className="field">Messages per client a day<input type="number" inputMode="numeric" min={1} max={20} value={policy.max_offers} onChange={num('max_offers')} /></label>
          <label className="field">Late if cancelled within (min)<input type="number" inputMode="numeric" min={0} max={1440} value={policy.late_cutoff_min} onChange={num('late_cutoff_min')} /></label>
          <label className="field">No offers within (min of start)<input type="number" inputMode="numeric" min={0} max={240} value={policy.min_lead_min} onChange={num('min_lead_min')} /></label>
          <div className="card-acts">
            <button className="btn is-primary" type="submit">Save rules</button>
            {saved && <span className="done-line"><Icon name="check" /> Saved. Late now means under {lead(w.late_cutoff_min)}.</span>}
            {err && <span className="err">{err}</span>}
          </div>
        </form>
      </section>
      <Access />
    </div>
  )
}

export function Access() {
  return (
    <section className="group" aria-label="Who can do what">
      <div className="group-head"><h2>Who can do what</h2><p>Checked by the database on every call, not by this page.</p></div>
      <div className="table-wrap">
        <table className="roles">
          <thead><tr><th>Action</th><th>Owner</th><th>Front desk</th><th>Staff</th><th>Client</th></tr></thead>
          <tbody>
            {ACCESS.map(([what, ...cans]) => <tr key={what}><td>{what}</td>{cans.map((c, i) => <td key={i} className={`can is-${c}`}>{CAN_TEXT[c]}</td>)}</tr>)}
            <tr className="proof"><td>Proves it with</td><td>Owner key, stored only as a hash</td><td>Front-desk key the owner can replace</td><td>Their own key</td><td>Private token or link</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
