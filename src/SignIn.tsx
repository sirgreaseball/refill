// The way in, as in any business app: create an account or sign in, then say how you use
// Refill. A business sets itself up next; a client goes to their own places. The demo needs
// none of this and is one tap away.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { rpc } from './api'
import { signIn, signUp } from './auth.ts'
import { demoDay } from './day'
import type { Book } from './desk/common'
import { Icon, Mark } from './ui'

const NAME = 'refill.name'
const EMAIL = 'refill.email'
const remembered = (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }
const remember = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* only a prefill */ } }

// The day the dial on this page shows: the demo salon, with Harsh's 12:00 as the gap that refills.
const DAY = demoDay()
const GAP = DAY.slots.find((s) => s.customer === 'Harsh')
const LO = 600
const HI = 1200
const ang = (m: number) => -150 + ((Math.min(Math.max(m, LO), HI) - LO) / (HI - LO)) * 300
const pt = (r: number, a: number) => [200 + r * Math.sin((a * Math.PI) / 180), 200 - r * Math.cos((a * Math.PI) / 180)]
const arc = (r: number, a1: number, a2: number) => {
  const [x1, y1] = pt(r, a1)
  const [x2, y2] = pt(r, a2)
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}
const toMin = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5)
const NOW = 675

/** The day as a watch face, playing the one thing Refill does on a loop: a gap opens, then refills. */
function AuthDial() {
  const ring = (id: string | null | undefined) => 168 - Math.max(0, DAY.staff.findIndex((p) => p.id === id)) * 26
  const seg = (s: (typeof DAY.slots)[number]) => {
    const a1 = ang(toMin(s.start)) + 0.9
    return arc(ring(s.staff), a1, Math.max(a1 + 0.5, ang(toMin(s.start) + s.minutes) - 0.9))
  }
  const [hx, hy] = pt(182, ang(NOW))
  return (
    <svg className="auth-dial" viewBox="0 0 400 400" aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => LO + i * 60).map((h) => {
        const [x1, y1] = pt(180, ang(h))
        const [x2, y2] = pt((h - LO) % 120 ? 184 : 188, ang(h))
        const [tx, ty] = pt(198, ang(h))
        return <g key={h} className="dial-hour"><line x1={x1} y1={y1} x2={x2} y2={y2} />{(h - LO) % 120 === 0 && <text x={tx} y={ty} dy="0.35em" textAnchor="middle">{h / 60}</text>}</g>
      })}
      {DAY.staff.map((p) => <path key={p.id} className="dial-track" d={arc(ring(p.id), -150, 150)} />)}
      {DAY.slots.filter((s) => s.status === 'booked' && s !== GAP).map((s) => (
        <path key={s.id} className={`dial-seg ${toMin(s.start) + s.minutes <= NOW ? 'is-past' : ''}`} d={seg(s)} />
      ))}
      {GAP && <>
        <path className="dial-seg auth-was" d={seg(GAP)} />
        <path className="dial-seg auth-gap" d={seg(GAP)} />
        <path className="dial-seg auth-refill" d={seg(GAP)} pathLength={100} />
      </>}
      <line className="auth-hand" x1={pt(64, ang(NOW))[0]} y1={pt(64, ang(NOW))[1]} x2={hx} y2={hy} />
      <circle className="dial-hand-tip" cx={hx} cy={hy} r="3.5" />
      <text className="dial-big" x={200} y={206} textAnchor="middle">11:15</text>
      <text className="dial-small" x={200} y={230} textAnchor="middle">Demo day</text>
    </svg>
  )
}

// Rough strength, honest about what it is: length first, then a mix of kinds of character.
function strength(p: string) {
  if (p.length < 6) return { v: Math.min(0.24, p.length / 25), word: p ? 'Too short' : 'At least 6 characters', tone: 'is-low' }
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length
  const v = Math.min(1, 0.3 + (p.length - 6) * 0.06 + (kinds - 1) * 0.14)
  return v >= 0.7 ? { v, word: 'Strong', tone: 'is-good' } : { v, word: 'Okay', tone: 'is-mid' }
}

/** A chronograph sub-dial for the password: the same 300-degree arc, filled by strength. */
function StrengthDial({ v, tone }: { v: number; tone: string }) {
  return (
    <svg className={`auth-meter ${tone}`} viewBox="0 0 24 24" aria-hidden="true">
      <path className="auth-meter-track" d="M 6.3 17.7 A 8 8 0 1 1 17.7 17.7" pathLength={100} />
      <path className="auth-meter-fill" d="M 6.3 17.7 A 8 8 0 1 1 17.7 17.7" pathLength={100} strokeDasharray={`${Math.max(2, v * 100)} 100`} />
    </svg>
  )
}

export default function Auth({ book }: { book: Book }) {
  // Someone who made an account on this device before most likely wants to sign in.
  const [tab, setTab] = useState<'in' | 'up'>(() => (remembered(NAME) || remembered(EMAIL) ? 'in' : 'up'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => remembered(EMAIL))
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const [err, setErr] = useState<{ field: 'name' | 'email' | 'password' | null; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const up = tab === 'up'

  // A keyboard and a mouse: start typing straight away. On a phone, wait for a tap so the
  // keyboard does not cover the page on arrival.
  useEffect(() => {
    if (matchMedia('(pointer: fine)').matches) first.current?.focus()
  }, [tab])

  const flip = () => { setTab(up ? 'in' : 'up'); setErr(null); setShow(false) }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.('CapsLock') ?? false)

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (up && !name.trim()) return setErr({ field: 'name', text: 'Write your name.' })
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr({ field: 'email', text: 'Write a full email address.' })
    if (password.length < 6) return setErr({ field: 'password', text: 'Use a password of at least 6 characters.' })
    setErr(null)
    setBusy(true)
    try {
      if (up) {
        remember(NAME, name.trim())
        await signUp(email.trim(), password, name.trim())
      } else await signIn(email.trim(), password)
      remember(EMAIL, email.trim())
      // The app re-routes itself on sign-in (AUTH_EVENT): role choice, setup, or the account's home.
    } catch (e) { setErr({ field: null, text: (e as Error).message }); setBusy(false) }
  }

  // An error about one field goes away as soon as that field is edited.
  const edit = (f: 'name' | 'email' | 'password', set: (v: string) => void) => (e: { target: { value: string } }) => { set(e.target.value); if (err?.field === f) setErr(null) }
  const s = strength(password)
  const bad = (f: 'name' | 'email' | 'password') => err?.field === f
  return (
    <main className="page auth">
      <aside className="auth-stage">
        <div className="auth-stage-dial">
          <AuthDial />
          <div className="auth-live" aria-hidden="true">
            <span className="auth-live-1"><i className="is-beat" />12:00 · Harsh cancelled</span>
            <span className="auth-live-2"><i className="is-ink" />6 fit · 3 offers out</span>
            <span className="auth-live-3"><i className="is-act" />Meera booked · ₹1,600 back</span>
          </div>
        </div>
        <div className="auth-story">
          <p className="overline">Refill · appointment recovery</p>
          <h2>Every cancelled appointment, filled again.</h2>
          <ul className="auth-facts">
            <li><Icon name="shield" /><span><strong>Only people who said yes</strong><small>Nobody is messaged without their consent.</small></span></li>
            <li><Icon name="check" /><span><strong>Never double-booked</strong><small>The database decides who got the slot, once.</small></span></li>
            <li><Icon name="list" /><span><strong>Every decision explained</strong><small>Who was offered, who was not, and why.</small></span></li>
          </ul>
        </div>
      </aside>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-head" key={tab}>
          <Mark size={18} fill={up ? 0.3 : 1} />
          <h1 id="auth-title">{up ? 'Create your account' : 'Welcome back'}</h1>
          <p>
            {up ? 'Already have an account? ' : 'New to Refill? '}
            <button type="button" className="auth-switch" onClick={flip}>{up ? 'Sign in' : 'Create an account'}</button>
          </p>
        </div>

        <form className="auth-fields" onSubmit={submit} noValidate key={`f-${tab}`}>
          {up && (
            <label className="field">Your name
              <input ref={first} value={name} onChange={edit('name', setName)} maxLength={60} autoComplete="name" enterKeyHint="next"
                aria-invalid={bad('name')} aria-describedby={bad('name') ? 'auth-err' : undefined} />
            </label>
          )}
          <label className="field">Email
            <input ref={up ? undefined : first} type="email" value={email} onChange={edit('email', setEmail)} autoComplete={up ? 'email' : 'username'} inputMode="email"
              autoCapitalize="none" spellCheck={false} enterKeyHint="next" aria-invalid={bad('email')} aria-describedby={bad('email') ? 'auth-err' : undefined} />
          </label>
          <div className="field">
            <span className="auth-label-row">
              <label htmlFor="auth-pass">Password</label>
              {up && password && <span className={`auth-strength ${s.tone}`}><StrengthDial v={s.v} tone={s.tone} />{s.word}</span>}
            </span>
            <span className="auth-pass">
              <input id="auth-pass" type={show ? 'text' : 'password'} value={password} onChange={edit('password', setPassword)} onKeyUp={onKey} onKeyDown={onKey}
                autoComplete={up ? 'new-password' : 'current-password'} minLength={6} enterKeyHint="go"
                aria-invalid={bad('password')} aria-describedby={bad('password') ? 'auth-err' : caps ? 'auth-caps' : undefined} />
              <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </span>
            {caps && <small id="auth-caps" className="auth-caps">Caps Lock is on</small>}
          </div>
          {err && <p id="auth-err" className="err auth-err" role="alert">{err.text}</p>}
          <button className="btn is-primary is-big auth-go" type="submit" disabled={busy} aria-busy={busy}>
            {busy && <span className="auth-spin" aria-hidden="true" />}
            {busy ? (up ? 'Creating your account' : 'Signing in') : up ? 'Create account' : 'Sign in'}
          </button>
          <p className="quiet small">{up ? 'Next you choose how you use Refill: run a business, or book appointments.' : 'Your business or your places open right after.'}</p>
        </form>

        <div className="auth-or"><span>or</span></div>
        <div className="auth-alt">
          <button type="button" className="auth-alt-row" onClick={() => book.setMode('demo')}>
            <Icon name="bolt" size={18} />
            <span><strong>Try the live demo</strong><small>A sample salon day. No account.</small></span>
            <Icon name="arrow" size={16} />
          </button>
          <a className="auth-alt-row" href="#/places">
            <Icon name="calendar" size={18} />
            <span><strong>Book an appointment</strong><small>Browse places that use Refill.</small></span>
            <Icon name="arrow" size={16} />
          </a>
        </div>
        <a className="auth-how" href="/splash">See how Refill works <Icon name="arrow" size={14} /></a>
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
