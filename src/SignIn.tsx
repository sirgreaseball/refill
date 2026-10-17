// The way in, as in any business app: create an account or sign in, then say how you use
// Refill. A business sets itself up next; a client goes to their own places. The demo needs
// none of this and is one tap away.
import { useState, type FormEvent } from 'react'
import { rpc } from './api'
import { signIn, signUp } from './auth.ts'
import type { Book } from './desk/common'
import { Icon } from './ui'

const NAME = 'refill.name'

export default function Auth({ book }: { book: Book }) {
  // Someone who made an account on this device before most likely wants to sign in.
  const [tab, setTab] = useState<'in' | 'up'>(() => { try { return localStorage.getItem(NAME) ? 'in' : 'up' } catch { return 'up' } })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (tab === 'up' && !name.trim()) return setErr('Write your name.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Write a full email address.')
    if (password.length < 6) return setErr('Use a password of at least 6 characters.')
    setErr(null)
    setBusy(true)
    try {
      if (tab === 'up') {
        try { localStorage.setItem(NAME, name.trim()) } catch { /* only a prefill */ }
        await signUp(email.trim(), password, name.trim())
      } else await signIn(email.trim(), password)
      // The app re-routes itself on sign-in (AUTH_EVENT): role choice, setup, or the account's home.
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <main className="page auth">
      <section className="auth-story">
        <p className="overline">Refill · appointment recovery</p>
        <h1>Every cancelled appointment, filled again.</h1>
        <p className="lede">When a client cancels, Refill offers the time to the next person on your waitlist who fits it and said yes to messages. The first to accept gets it.</p>
        <ul className="auth-facts">
          <li><Icon name="shield" /><span><strong>Only people who said yes</strong><small>Nobody is messaged without their consent.</small></span></li>
          <li><Icon name="check" /><span><strong>Never double-booked</strong><small>The database decides who got the slot, once.</small></span></li>
          <li><Icon name="list" /><span><strong>Every decision explained</strong><small>Who was offered, who was not, and why.</small></span></li>
        </ul>
        <button className="link" onClick={() => book.setMode('demo')}>Or look around the demo first, no account needed</button>
        <a className="link" href="#/places">Browse places you can book</a>
      </section>

      <section className="group auth-form" aria-label={tab === 'up' ? 'Create an account' : 'Sign in'}>
        <div className="seg auth-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'up'} className={tab === 'up' ? 'is-on' : ''} onClick={() => { setTab('up'); setErr(null) }}>Create account</button>
          <button role="tab" aria-selected={tab === 'in'} className={tab === 'in' ? 'is-on' : ''} onClick={() => { setTab('in'); setErr(null) }}>Sign in</button>
        </div>
        <form className="add" onSubmit={submit} noValidate>
          {tab === 'up' && <label className="field">Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" /></label>}
          <label className="field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" /></label>
          <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'up' ? 'new-password' : 'current-password'} minLength={6} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn is-primary is-big" type="submit" disabled={busy}>{busy ? 'One moment…' : tab === 'up' ? 'Create account' : 'Sign in'}</button>
          <p className="quiet small">{tab === 'up' ? 'Next you choose how you use Refill: run a business, or book appointments.' : 'Your business or your places open right after.'}</p>
        </form>
      </section>
    </main>
  )
}

/** Right after the first sign-in: run a business, or book appointments. */
export function Welcome({ book }: { book: Book }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME) ?? '' } catch { return '' } })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const choose = async (role: 'owner' | 'client') => {
    if (!name.trim()) return setErr('Write your name first.')
    setBusy(true)
    try {
      const r = await rpc<{ ok: boolean; code?: string }>('set_profile', { p_name: name.trim(), p_role: role })
      if (!r.ok) { setErr(r.code === 'SIGN_IN' ? 'Your session ended. Sign in again.' : 'That name is too long or has odd characters.'); setBusy(false); return }
      book.refresh()
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  return (
    <main className="page is-narrow">
      <div className="stack">
        <header className="page-head"><div>
          <p className="overline">Welcome{book.profile?.email ? ` · ${book.profile.email}` : ''}</p>
          <h1>How will you use Refill?</h1>
          <p>Pick what you came for. Businesses and clients see different parts of Refill.</p>
        </div></header>
        <section className="group">
          <label className="field">Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" /></label>
        </section>
        <div className="role-choice">
          <button className="choice" disabled={busy} onClick={() => choose('owner')}>
            <span className="choice-ico"><Icon name="desk" size={22} /></span>
            <span className="row-main"><strong>I run a business</strong><small>Set up your place, team and services, then run the front desk and recover cancellations.</small></span>
            <Icon name="arrow" />
          </button>
          <button className="choice" disabled={busy} onClick={() => choose('client')}>
            <span className="choice-ico"><Icon name="user" size={22} /></span>
            <span className="row-main"><strong>I book appointments</strong><small>Join a place’s waitlist, get offers when a time opens, and keep every visit in one place.</small></span>
            <Icon name="arrow" />
          </button>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
    </main>
  )
}
