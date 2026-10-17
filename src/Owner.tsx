// The owner's page: what today recovered, the rules the database enforces, the front-desk
// link, and who may do what. Each number is computed from the same database state the desk
// shows; nothing here is estimated.
import { useState, type FormEvent } from 'react'
import { deskLinkUrl, type State, type useBook } from './api'
import { Icon, Modal, Qr, copy, lead, money } from './ui'

type Book = ReturnType<typeof useBook>
type Can = 'yes' | 'own' | 'no'

// Mirrors the checks in supabase/migrations 004 and 005: require_owner, require_desk,
// require_staff, the customer's token and the unguessable offer and move links.
const ACCESS: [string, Can, Can, Can, Can][] = [
  ['See the day, the waitlist and everyone’s consent', 'yes', 'yes', 'no', 'no'],
  ['Record a cancellation, undo it', 'yes', 'yes', 'no', 'own'],
  ['Offer an open gap to the waitlist', 'yes', 'yes', 'no', 'no'],
  ['Move an appointment, or send a link to choose', 'yes', 'yes', 'no', 'own'],
  ['Mark a stylist in or out', 'yes', 'yes', 'own', 'no'],
  ['Change consent', 'yes', 'yes', 'no', 'own'],
  ['Book or decline an offer', 'no', 'no', 'no', 'own'],
  ['Change the rules: hold window, message cap, late cut-off', 'yes', 'no', 'no', 'no'],
  ['Make stylist and front-desk links', 'yes', 'no', 'no', 'no'],
  ['Reset the demo day', 'yes', 'no', 'no', 'no'],
]
const CAN_TEXT: Record<Can, string> = { yes: 'Yes', own: 'Own only', no: '—' }

function numbers(st: State) {
  const now = st.workspace.now_min
  const ev = (k: string) => st.events.filter((e) => e.kind === k)
  const recovered = st.slots.filter((s) => s.status === 'booked' && s.refilled)
  const cancelled = new Set(ev('CANCELLED').map((e) => e.slot_id))
  const open = st.slots.filter((s) => s.status === 'free' && s.start_min >= now)
  const lost = st.slots.filter((s) => s.status === 'free' && s.start_min < now && cancelled.has(s.id))
  const o = (status: string) => st.offers.filter((x) => x.status === status).length
  const consent = (v: boolean | null) => st.waitlist.filter((e) => e.status === 'waiting' && e.consent === v).length
  const moved = ev('MOVED')
  return {
    recovered: recovered.reduce((n, s) => n + (s.price_inr ?? 0), 0), refilled: recovered.length,
    atRisk: open.reduce((n, s) => n + (s.price_inr ?? 0), 0), lost: lost.reduce((n, s) => n + (s.price_inr ?? 0), 0),
    cancelled: cancelled.size, late: ev('CANCELLED').filter((e) => e.code === 'LATE').length,
    sent: st.offers.length, accepted: o('accepted'), declined: o('declined'), expired: o('expired'), lostRace: o('waitlisted'), revoked: o('revoked'),
    yes: consent(true), no: consent(false), unknown: consent(null),
    blockedByConsent: st.events.filter((e) => e.kind === 'OFFER_SKIPPED' && e.code === 'NO_CONSENT').length,
    movedByDesk: moved.filter((e) => e.detail.by === 'front desk').length, movedByCustomer: moved.filter((e) => e.detail.by === 'customer').length,
    linksOpen: st.moves.filter((m) => m.status === 'open').length,
  }
}

export default function Owner({ book }: { book: Book }) {
  const st = book.state!
  const desk = book.desk!
  const owner = st.role === 'owner'
  const n = numbers(st)
  const w = st.workspace
  const [share, setShare] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [policy, setPolicy] = useState({ hold_min: w.hold_min, max_offers: w.max_offers, late_cutoff_min: w.late_cutoff_min, min_lead_min: w.min_lead_min })

  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    setErr(null)
    try {
      const r = await book.act<{ ok: boolean; code?: string }>('set_policy', { p_policy: policy })
      if (r.ok) setSaved(true)
      else setErr('Out of range. Hold 1–240 min, messages 1–20 a day, late cut-off 0–1440 min, lead 0–240 min.')
    } catch (e) { setErr((e as Error).message) }
  }
  const showDeskLink = async (fresh = false) => {
    try { const k = await book.deskKey(fresh); if (k) setShare(deskLinkUrl(desk.id, k)) } catch (e) { setErr((e as Error).message) }
  }
  const asDesk = async () => { await book.viewAs('desk'); location.hash = '#/' }
  const util = st.staff.map((p) => {
    const mins = st.slots.filter((s) => s.staff_id === p.id && s.status === 'booked').reduce((m, s) => m + s.minutes, 0)
    return { p, pct: Math.round((mins / Math.max(1, p.shift_end - p.shift_start)) * 100) }
  })

  if (!owner) {
    return (
      <div className="team">
        <section className="lab-intro">
          <p className="overline">Owner</p>
          <h1 className="lab-title">Only the owner sees this page.</h1>
          <p className="quiet">You are signed in as the front desk. The database refuses owner-only actions for this key.</p>
        </section>
        <Access />
      </div>
    )
  }

  return (
    <div className="team">
      <section className="lab-intro">
        <p className="overline">Owner · {w.salon}</p>
        <h1 className="lab-title">{n.recovered ? `${money(n.recovered)} back in the book today.` : 'Nothing recovered yet today.'}</h1>
        <p className="quiet">Every figure below is counted from the database, live. Synthetic demo day.</p>
      </section>

      <section className="readout owner-readout" aria-label="Today">
        <Fig value={money(n.recovered)} label={`recovered · ${n.refilled} refilled`} tone="act" />
        <Fig value={money(n.atRisk)} label="still open, can be filled" tone="beat" />
        <Fig value={money(n.lost)} label="gaps that passed unfilled" />
        <Fig value={`${n.refilled}/${n.cancelled}`} label={`cancellations refilled · ${n.late} late`} />
      </section>

      <div className="team-grid">
        <section className="card" aria-label="Offers">
          <p className="overline">Offers today</p>
          <h3>{n.sent ? `${n.accepted} of ${n.sent} booked` : 'No offers sent yet'}</h3>
          <ul className="facts">
            <li><span>Declined</span><span className="mono">{n.declined}</span></li>
            <li><span>No reply in time</span><span className="mono">{n.expired}</span></li>
            <li><span>Tapped a moment late, kept their place</span><span className="mono">{n.lostRace}</span></li>
            <li><span>Withdrawn (consent, stylist out, moved)</span><span className="mono">{n.revoked}</span></li>
          </ul>
        </section>
        <section className="card" aria-label="Consent">
          <p className="overline">Consent on the waitlist</p>
          <h3>{n.yes} may be messaged</h3>
          <ul className="facts">
            <li><span>Said no</span><span className="mono">{n.no}</span></li>
            <li><span>Never asked: never messaged</span><span className="mono">{n.unknown}</span></li>
            <li><span>Offers the database refused for consent</span><span className="mono">{n.blockedByConsent}</span></li>
          </ul>
        </section>
        <section className="card" aria-label="Moves">
          <p className="overline">Reschedules</p>
          <h3>{n.movedByDesk + n.movedByCustomer} moved, none double-booked</h3>
          <ul className="facts">
            <li><span>By the front desk</span><span className="mono">{n.movedByDesk}</span></li>
            <li><span>By the customer, from their link</span><span className="mono">{n.movedByCustomer}</span></li>
            <li><span>Links waiting for a reply</span><span className="mono">{n.linksOpen}</span></li>
          </ul>
        </section>
        <section className="card" aria-label="Stylists">
          <p className="overline">Stylists booked today</p>
          <ul className="facts">
            {util.map(({ p, pct }) => (
              <li key={p.id}><span>{p.name}{p.present ? '' : ' · out'}</span><span className="bar" aria-label={`${pct}% of shift booked`}><span style={{ width: `${Math.min(100, pct)}%` }} /></span><span className="mono">{pct}%</span></li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-label="Rules">
        <header className="section-head"><h2>The rules</h2><p className="quiet">Owner only. The database applies them to every offer and booking.</p></header>
        <form className="policy" onSubmit={save} onChange={() => setSaved(false)}>
          <label>Offer holds for (min)<input type="number" min={1} max={240} value={policy.hold_min} onChange={(e) => setPolicy({ ...policy, hold_min: Number(e.target.value) })} /></label>
          <label>Messages per customer a day<input type="number" min={1} max={20} value={policy.max_offers} onChange={(e) => setPolicy({ ...policy, max_offers: Number(e.target.value) })} /></label>
          <label>Late if cancelled within (min)<input type="number" min={0} max={1440} value={policy.late_cutoff_min} onChange={(e) => setPolicy({ ...policy, late_cutoff_min: Number(e.target.value) })} /></label>
          <label>No offers within (min of start)<input type="number" min={0} max={240} value={policy.min_lead_min} onChange={(e) => setPolicy({ ...policy, min_lead_min: Number(e.target.value) })} /></label>
          <div className="card-acts">
            <button className="btn is-primary" type="submit">Save rules</button>
            {saved && <span className="done-line"><Icon name="check" /> Saved. Late now means under {lead(w.late_cutoff_min)}.</span>}
          </div>
        </form>
      </section>

      <section aria-label="Each person's view">
        <header className="section-head"><h2>See it as each person</h2></header>
        <div className="team-grid">
          <div className="card">
            <p className="overline">Front desk</p>
            <h3>Runs the day</h3>
            <p className="quiet">Cancellations, offers, moves, stylists in or out. Cannot change the rules or make links.</p>
            <div className="card-acts">
              <button className="btn" onClick={asDesk}>Open as front desk</button>
              <button className="btn is-quiet" onClick={() => showDeskLink()}><Icon name="phone" /> Front-desk link</button>
            </div>
          </div>
          <div className="card">
            <p className="overline">Stylist</p>
            <h3>Their own day</h3>
            <p className="quiet">First names only, and one button: in or out. Make each stylist’s link on the Team page.</p>
            <div className="card-acts">{st.staff.slice(0, 2).map((p) => <a key={p.id} className="btn is-quiet" href={`#/staff/${p.id}`}>{p.name}’s view</a>)}</div>
          </div>
          <div className="card">
            <p className="overline">Customer</p>
            <h3>Joins, books, moves</h3>
            <p className="quiet">Signs up with a yes or no to messages, books from an offer, and picks a new time from a move link.</p>
            <div className="card-acts">{w.join_code && <a className="btn is-quiet" href={`#/join/${w.join_code}`}>Open the sign-up</a>}</div>
          </div>
        </div>
      </section>

      <Access />
      {err && <p className="err" role="alert">{err}</p>}
      {share && (
        <Modal title="Front-desk link" onClose={() => setShare(null)}>
          <div className="qr-one">
            <Qr text={share} size={208} />
            <p className="quiet">Opens this day as the front desk. Making a new link turns the old one off.</p>
            <div className="card-acts">
              <button className="btn" onClick={() => copy(share)}><Icon name="copy" /> Copy link</button>
              <button className="btn is-quiet" onClick={() => showDeskLink(true)}><Icon name="reset" /> New link</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Fig({ value, label, tone }: { value: string; label: string; tone?: 'act' | 'beat' }) {
  return <div className={`metric ${tone ? `is-${tone}` : ''}`}><div className="metric-value mono">{value}</div><div className="metric-label">{label}</div></div>
}

export function Access() {
  return (
    <section aria-label="Who can do what">
      <header className="section-head"><h2>Who can do what</h2><p className="quiet">Checked by the database on every call, not by this page.</p></header>
      <table className="roles">
        <thead><tr><th>Action</th><th>Owner</th><th>Front desk</th><th>Stylist</th><th>Customer</th></tr></thead>
        <tbody>
          {ACCESS.map(([what, ...cans]) => (
            <tr key={what}><td>{what}</td>{cans.map((c, i) => <td key={i} className={`can is-${c}`}>{CAN_TEXT[c]}</td>)}</tr>
          ))}
          <tr className="proof"><td>Proves it with</td><td>Owner key, stored only as a hash</td><td>Front-desk key the owner can replace</td><td>Their own key</td><td>Private token or link</td></tr>
        </tbody>
      </table>
    </section>
  )
}
