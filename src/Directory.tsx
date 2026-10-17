// The directory: every business on Refill that chose to be listed. Business-level facts only
// (what they offer, how many people are waiting); never a client's name. Tapping a place opens
// its sign-up, which links to the account when signed in.
import { useEffect, useState } from 'react'
import { rpc } from './api'
import { Icon, Mark, money } from './ui'

interface Biz { name: string; type: string | null; code: string; staff: number; waiting: number; services: { name: string; minutes: number; price_inr: number | null }[] }

export function DirectoryList({ joined = [] }: { joined?: string[] }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<Biz[] | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => {
      rpc<Biz[]>('directory', { p_q: q.trim() || null }).then((r) => { setList(r); setErr(false) }, () => setErr(true))
    }, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [q])

  return (
    <section className="directory" aria-label="Find a place">
      <label className="field">Find a place<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Salon, clinic, tutor, a service…" autoComplete="off" /></label>
      {err && <p className="quiet small">Could not load places. Check the connection.</p>}
      {list === null && !err && <p className="quiet small">Loading places…</p>}
      {list?.length === 0 && <p className="quiet small">{q ? `Nothing matches “${q}”.` : 'No places are listed yet.'}</p>}
      {!!list?.length && (
        <ul className="rows">
          {list.map((b) => {
            const mine = joined.includes(b.code)
            const from = b.services.find((s) => s.price_inr != null)
            return (
              <li key={b.code}>
                <a className="my-slot place link-row" href={`#/join/${b.code}`}>
                  <span className="avatar-sm" aria-hidden="true">{b.name.slice(0, 1)}</span>
                  <span className="my-slot-main">
                    <strong>{b.name}</strong>
                    <small>{[b.type, b.services.slice(0, 3).map((s) => s.name).join(', '), from ? `from ${money(from.price_inr)}` : null].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className={`tag ${mine ? 'is-act' : ''}`}>{mine ? 'Joined' : b.waiting ? `${b.waiting} waiting` : 'Join'}</span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** The public page: anyone can browse, no account needed. */
export default function Directory() {
  return (
    <main className="phone">
      <header className="phone-top">
        <a className="brand" href="#/" aria-label="Refill home"><Mark size={14} /></a>
        <span><strong>Places on Refill</strong><small>book your next free slot</small></span>
      </header>
      <div className="phone-lead">
        <h1 className="phone-h">Find a place</h1>
        <p className="quiet">Join a waiting list and get offered the next time that fits, from any of these places, in one account.</p>
      </div>
      <div className="phone-body"><DirectoryList /></div>
      <footer className="phone-foot">
        <p><Icon name="shield" size={14} /> Places see only your sign-up with them, never your other places.</p>
      </footer>
    </main>
  )
}
