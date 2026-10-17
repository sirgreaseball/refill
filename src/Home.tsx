// Home: the product, not a splash. The whole day at a glance as one live ribbon (amber gaps
// breathe, refills turn green, red needs moving), what needs someone now, who is in, the
// waitlist's consent, the latest activity, and a launcher into each person's view.
import type { DbSlot, State } from './api'
import { first, figures, kindOf, sentence, staffFor, type Book } from './desk/common'
import { Num } from './motion'
import { Icon, clock, money } from './ui'

const DAY_START = 600
const DAY_END = 1200
const pct = (m: number) => `${((Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / (DAY_END - DAY_START)) * 100}%`
const hour = () => new Date().getHours()
const greet = () => (hour() < 12 ? 'Good morning' : hour() < 17 ? 'Good afternoon' : 'Good evening')

export default function Home({ book }: { book: Book }) {
  const st = book.state
  const canOwn = st?.role === 'owner' || !!book.desk?.deskKey
  const asDesk = async (slot?: string) => {
    if (st?.role !== 'desk' || book.desk?.deskKey) await book.viewAs('desk')
    location.hash = slot ? `#/desk/slot/${slot}` : '#/desk'
  }
  const asOwner = async () => { await book.viewAs('owner'); location.hash = '#/owner' }

  if (!st) {
    return (
      <main className="home">
        <div className="home-top"><p className="overline">{book.phase === 'error' ? 'Database unreachable' : 'Opening today'}</p><h1 className="home-title shimmer">Refill</h1></div>
        <div className="bento"><div className="tile is-hero skeleton" /><div className="tile skeleton" /><div className="tile skeleton" /></div>
      </main>
    )
  }

  const f = figures(st)
  const queue = [...f.risk, ...f.held, ...f.open].sort((a, b) => a.start_min - b.start_min)
  const waiting = st.waitlist.filter((e) => e.status === 'waiting')
  const yes = waiting.filter((e) => e.consent === true).length
  const no = waiting.filter((e) => e.consent === false).length
  const now = st.workspace.now_min

  return (
    <main className="home">
      <header className="home-top">
        <div>
          <p className="overline">{greet()} · {st.workspace.salon}</p>
          <h1 className="home-title">{queue.length ? <>{queue.length} {queue.length === 1 ? 'thing needs' : 'things need'} you<span className="accent-dot">.</span></> : <>All clear<span className="accent-dot is-act">.</span></>}</h1>
        </div>
        <div className="home-clock" aria-label={`Demo clock ${clock(now)}`}><span className="mono">{clock(now)}</span><small>demo clock</small></div>
      </header>

      <div className="bento">
        <section className="tile is-hero spot" aria-label="Today">
          <div className="tile-head"><h2>Today</h2><span className="legend"><i className="is-gap" />open <i className="is-fill" />refilled <i className="is-risk" />needs moving</span></div>
          <Ribbon st={st} onPick={(s) => asDesk(s.id)} />
          <div className="hero-nums">
            <div><span className="big act-text"><Num value={f.recovered} format={money} /></span><small>recovered from cancellations</small></div>
            <div><span className="big beat-text"><Num value={f.openValue} format={money} /></span><small>in {f.open.length} open gap{f.open.length === 1 ? '' : 's'} still fillable</small></div>
            <div><span className={`big ${f.risk.length ? 'risk-text' : ''}`}><Num value={f.risk.length} /></span><small>clients whose staff member is out</small></div>
          </div>
        </section>

        <section className="tile spot" aria-label="Needs you now">
          <div className="tile-head"><h2>Needs you now</h2>{queue.length > 3 && <button className="link" onClick={() => asDesk()}>All {queue.length}</button>}</div>
          {queue.length === 0 ? <p className="all-clear"><Icon name="check" /> Nothing waiting.</p> : (
            <div className="queue">
              {queue.slice(0, 3).map((s) => <Need key={s.id} st={st} s={s} onPick={() => asDesk(s.id)} />)}
            </div>
          )}
        </section>

        <section className="tile spot" aria-label="Team today">
          <div className="tile-head"><h2>Team today</h2><span className="quiet small">{st.staff.filter((p) => p.present).length} of {st.staff.length} in</span></div>
          <ul className="team-faces">
            {st.staff.map((p) => (
              <li key={p.id} className={p.present ? '' : 'is-out'}>
                <a href={`#/staff/${p.id}`} aria-label={`${p.name}, ${p.present ? 'in' : 'out'}. Open their view`}>
                  <span className="face">{p.name.slice(0, 1)}<i /></span>
                  <span className="face-name">{p.name}</span>
                  <small>{p.present ? `${clock(p.shift_start)}–${clock(p.shift_end)}` : 'out today'}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="tile spot" aria-label="Waitlist">
          <div className="tile-head"><h2>Waitlist</h2><span className="quiet small">{waiting.length} waiting</span></div>
          <div className="consent-bar" role="img" aria-label={`${yes} may be messaged, ${no} said no, ${waiting.length - yes - no} not asked`}>
            <span className="is-yes" style={{ flex: yes || 0.0001 }} /><span className="is-no" style={{ flex: no || 0.0001 }} /><span className="is-unknown" style={{ flex: waiting.length - yes - no || 0.0001 }} />
          </div>
          <ul className="facts">
            <li><span>May be messaged</span><span className="mono act-text"><Num value={yes} /></span></li>
            <li><span>Said no, or never asked: never messaged</span><span className="mono"><Num value={waiting.length - yes} /></span></li>
          </ul>
        </section>

        <section className="tile spot" aria-label="Latest">
          <div className="tile-head"><h2>Latest</h2><span className="live"><i />live</span></div>
          <ol className="latest">
            {st.events.slice(0, 4).map((e) => <li key={e.id}>{sentence(e, st)}</li>)}
          </ol>
        </section>
      </div>

      <section className="launcher" aria-label="Open a view">
        <p className="overline">Open as</p>
        <div className="apps">
          <button className="app-ico spot" onClick={() => asDesk()}><span className="ico is-desk"><Icon name="desk" size={26} />{queue.length > 0 && <b>{queue.length}</b>}</span><span>Front desk</span></button>
          <button className="app-ico spot" onClick={asOwner} disabled={!canOwn}><span className="ico is-owner"><Icon name="chart" size={26} /></span><span>Owner</span></button>
          <a className="app-ico spot" href={`#/staff/${st.staff[0]?.id}`}><span className="ico is-staff"><Icon name="user" size={26} /></span><span>Staff</span></a>
          <a className="app-ico spot" href={st.workspace.join_code ? `#/join/${st.workspace.join_code}` : '#/'}><span className="ico is-client"><Icon name="phone" size={26} /></span><span>Client</span></a>
          <a className="app-ico spot" href="#/lab"><span className="ico is-proof"><Icon name="check" size={26} /></span><span>Proof</span></a>
        </div>
      </section>
    </main>
  )
}

function Ribbon({ st, onPick }: { st: State; onPick: (s: DbSlot) => void }) {
  const now = st.workspace.now_min
  const hours = [600, 720, 840, 960, 1080, 1200]
  return (
    <div className="ribbon">
      <div className="ribbon-axis" aria-hidden="true">{hours.map((h) => <span key={h} style={{ left: pct(h) }}>{clock(h)}</span>)}</div>
      {st.staff.map((p) => (
        <div key={p.id} className={`ribbon-row ${p.present ? '' : 'is-out'}`}>
          <span className="ribbon-name">{p.name}</span>
          <div className="ribbon-track">
            {st.slots.filter((s) => s.staff_id === p.id).map((s) => {
              const k = kindOf(st, s)
              return (
                <button key={s.id} className={`rb is-${k} ${s.start_min + s.minutes <= now ? 'is-past' : ''}`}
                  style={{ left: pct(s.start_min), width: `calc(${pct(s.start_min + s.minutes)} - ${pct(s.start_min)} - 2px)` }}
                  onClick={() => onPick(s)} title={`${clock(s.start_min)} ${s.service ?? ''} · ${k === 'open' ? 'open gap' : s.customer ?? k}`}
                  aria-label={`${clock(s.start_min)}, ${s.service}, ${k === 'open' ? 'open gap' : k === 'risk' ? `${s.customer} needs moving` : s.customer ?? k}`} />
              )
            })}
          </div>
        </div>
      ))}
      <div className="ribbon-now" style={{ left: `calc(64px + (100% - 64px) * ${(Math.min(Math.max(now, DAY_START), DAY_END) - DAY_START) / (DAY_END - DAY_START)})` }} aria-hidden="true"><span>{clock(now)}</span></div>
    </div>
  )
}

function Need({ st, s, onPick }: { st: State; s: DbSlot; onPick: () => void }) {
  const k = kindOf(st, s)
  const who = staffFor(st, s)?.name
  return (
    <button className={`q-item is-${k}`} onClick={onPick}>
      <span className="q-time">{clock(s.start_min)}</span>
      <span className="q-main"><strong>{k === 'risk' ? `${first(s.customer)}: ${who} is out` : k === 'blocked' ? `Held: ${who} is out` : `Open gap · ${s.service}`}</strong><small>{s.minutes} min · {k === 'open' ? money(s.price_inr) : 'tap to sort it'}</small></span>
      <span className="q-side"><Icon name="arrow" size={16} /></span>
    </button>
  )
}
