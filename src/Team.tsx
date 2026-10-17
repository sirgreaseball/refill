// The owner's team page: who is in, each stylist's own link, the customer sign-up
// code for the front desk, and what each role is allowed to do.
import { useState } from 'react'
import { joinLink, ownerLink, staffLinkUrl, type DbStaff, type useBook } from './api'
import { Icon, Modal, Qr, copy, clock } from './ui'

type Book = ReturnType<typeof useBook>

export default function Team({ book }: { book: Book }) {
  const st = book.state!
  const desk = book.desk!
  const now = st.workspace.now_min
  const [share, setShare] = useState<{ title: string; url: string; note: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const code = st.workspace.join_code

  const toggle = async (p: DbStaff) => {
    try { await book.act('set_staff_presence', { p_staff: p.id, p_present: !p.present }) } catch (e) { setErr((e as Error).message) }
  }
  const shareStylist = async (p: DbStaff) => {
    try {
      const key = await book.act<string>('staff_link', { p_staff: p.id })
      setShare({ title: `${p.name}'s link`, url: staffLinkUrl(desk.id, p.id, key), note: `${p.name} sees only their own day and can mark themselves in or out. Making a new link turns the old one off.` })
    } catch (e) { setErr((e as Error).message) }
  }

  return (
    <div className="team">
      <section className="lab-intro">
        <p className="overline">Team and sign-up</p>
        <h1 className="lab-title">Everyone sees only their part.</h1>
        <p className="quiet">The desk is yours. Each stylist gets a link to their own day. Customers join the waitlist themselves and choose whether you may message them. The database checks each person’s key on every action.</p>
      </section>

      <section aria-label="Stylists">
        <header className="section-head"><h2>Stylists</h2></header>
        <ul className="rows team-rows">
          {st.staff.map((p) => {
            const mine = st.slots.filter((s) => s.staff_id === p.id)
            const ahead = mine.filter((s) => s.status === 'booked' && s.start_min + s.minutes > now).length
            return (
              <li key={p.id} className="team-row">
                <span className="team-who">
                  <strong>{p.name}</strong>
                  <small>{p.skills.join(' · ')} · {ahead} booked ahead{!p.present && ahead ? ', needs moving' : ''}</small>
                </span>
                <button className={`presence ${p.present ? 'is-in' : 'is-out'}`} onClick={() => toggle(p)}
                  aria-label={p.present ? `${p.name} is in. Mark out` : `${p.name} is out. Mark in`}>{p.present ? 'In today' : 'Out today'}</button>
                <a className="btn is-quiet" href={`#/staff/${p.id}`}><Icon name="phone" /> Their view</a>
                <button className="btn is-quiet" onClick={() => shareStylist(p)}><Icon name="share" /> Their link</button>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="team-grid">
        <section className="card" aria-label="Customer sign-up">
          <p className="overline">Customers</p>
          <h3>Put this at the front desk</h3>
          <p className="quiet">Customers scan it, join the waitlist and choose yes or no to messages. Nothing is ticked for them.</p>
          {code && <Qr text={joinLink(code)} size={168} />}
          <div className="card-acts">
            {code && <a className="btn" href={`#/join/${code}`}>Open the sign-up page</a>}
            {code && <button className="btn is-quiet" onClick={() => copy(joinLink(code))}><Icon name="copy" /> Copy link</button>}
          </div>
        </section>

        <section className="card" aria-label="Your desk on a phone">
          <p className="overline">You</p>
          <h3>This desk on your phone</h3>
          <p className="quiet">This link carries your owner key. Keep it to yourself: anyone with it can run your desk.</p>
          <button className="btn" onClick={() => setShare({ title: 'Your desk on a phone', url: ownerLink(desk), note: 'Owner rights. Do not share.' })}><Icon name="phone" /> Show the code</button>
        </section>
      </div>

      <section aria-label="Who can do what">
        <header className="section-head"><h2>Who can do what</h2></header>
        <table className="roles">
          <thead><tr><th>Role</th><th>Can</th><th>Cannot</th><th>Proves it with</th></tr></thead>
          <tbody>
            <tr><td>Owner</td><td>Everything on the desk: cancellations, offers, consent at the desk, moving appointments, the clock</td><td>Book on a customer’s behalf</td><td>Owner key made with the day, stored only as a hash</td></tr>
            <tr><td>Stylist</td><td>See their own day; mark themselves in or out</td><td>See other stylists, the waitlist or anyone’s consent</td><td>Their own key; a new link turns the old one off</td></tr>
            <tr><td>Customer</td><td>Join the waitlist, see their place, change consent, leave; book or decline an offer</td><td>See anyone else</td><td>A private token from sign-up; each offer link is unguessable</td></tr>
          </tbody>
        </table>
        <p className="quiet small">Demo clock {clock(now)} · every rule is enforced by the database, not by this page.</p>
      </section>

      {err && <p className="err" role="alert">{err}</p>}
      {share && (
        <Modal title={share.title} onClose={() => setShare(null)}>
          <div className="qr-one">
            <Qr text={share.url} size={208} />
            <p className="quiet">{share.note}</p>
            <button className="btn" onClick={() => copy(share.url)}><Icon name="copy" /> Copy link</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
