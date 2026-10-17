// Settings, as in any account-based app: your name and sign-in, and for an owner the business
// itself (its name, its type, whether clients can find it). Deleting is at the end, behind a
// typed confirmation, and the database checks the same confirmation again.
import { useState, type FormEvent } from 'react'
import { rpc } from './api'
import { readSession, signOut } from './auth.ts'
import { useRun, type Book } from './desk/common'
import { Icon } from './ui'

const SAID: Record<string, string> = {
  CONFIRM_MISMATCH: 'That is not the business name. Nothing was deleted.',
  HAS_BUSINESS: 'Delete your business first. Your account owns it.',
  NOT_LIVE: 'A demo day is reset from the profile menu, not deleted.',
  INVALID_VALUE: 'Names are 1 to 80 letters; the type up to 40.',
  MISSING_FIELD: 'Write a name.',
}

export default function Settings({ book }: { book: Book }) {
  const st = book.state
  const run = useRun(book)
  const session = readSession()
  const owner = st?.role === 'owner'
  const live = st?.workspace.kind === 'live'
  const [biz, setBiz] = useState(st?.workspace.salon ?? '')
  const [type, setType] = useState(st?.workspace.business_type ?? '')
  const [name, setName] = useState(book.profile?.name ?? '')
  const [confirm, setConfirm] = useState('')
  const [arm, setArm] = useState<'biz' | 'me' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const saveBiz = async (ev: FormEvent) => {
    ev.preventDefault()
    setErr(null)
    const r = await run<{ ok: boolean; code?: string }>('update_business', { p_biz: { name: biz.trim(), type: type.trim() } }, (x) => (x.ok ? 'Business details saved.' : null))
    if (r && !r.ok) setErr(SAID[r.code ?? ''] ?? `Not saved: ${r.code}`)
  }
  const saveMe = async (ev: FormEvent) => {
    ev.preventDefault()
    setErr(null)
    try {
      const r = await rpc<{ ok: boolean; code?: string }>('set_profile', { p_name: name.trim(), p_role: null })
      if (!r.ok) return setErr(SAID[r.code ?? ''] ?? 'That name is too long or has odd characters.')
      try { localStorage.setItem('refill.name', name.trim()) } catch { /* only a prefill */ }
      setSaved('Your name is saved.')
    } catch (e) { setErr((e as Error).message) }
  }
  const deleteBiz = async () => {
    setErr(null)
    const r = await run<{ ok: boolean; code?: string }>('delete_business', { p_confirm: confirm })
    if (!r) return
    if (!r.ok) return setErr(SAID[r.code ?? ''] ?? `Not deleted: ${r.code}`)
    try { localStorage.removeItem('refill.business') } catch { /* nothing kept */ }
    location.hash = '#/'
    book.refresh()
  }
  const deleteMe = async () => {
    setErr(null)
    try {
      const r = await rpc<{ ok: boolean; code?: string }>('delete_account', {})
      if (!r.ok) return setErr(SAID[r.code ?? ''] ?? `Not deleted: ${r.code}`)
      try { localStorage.removeItem('refill.business'); localStorage.removeItem('refill.name') } catch { /* nothing kept */ }
      location.hash = '#/'
      signOut()
    } catch (e) { setErr((e as Error).message) }
  }

  return (
    <main className="page is-narrow settings">
      <div className="stack">
        <header className="page-head"><div>
          <p className="overline">Settings</p>
          <h1>{owner && st ? st.workspace.salon : 'Your account'}</h1>
          <p>{owner ? 'Your business and your sign-in. Team, services and rules are on the Team and Rules pages.' : 'Your name and sign-in. Each place you joined is on your home page.'}</p>
        </div></header>

        {owner && st && (
          <section className="group" aria-label="Business">
            <div className="group-head"><h2>Business</h2><p>Clients see this name on your booking page and in the directory.</p></div>
            <form className="add" onSubmit={saveBiz} noValidate>
              <label className="field">Name<input value={biz} onChange={(e) => setBiz(e.target.value)} maxLength={80} autoComplete="organization" /></label>
              <label className="field">Type<input value={type} onChange={(e) => setType(e.target.value)} maxLength={40} placeholder="Salon, clinic, tuition…" /></label>
              <button className="btn is-primary" type="submit" disabled={!biz.trim() || (biz.trim() === st.workspace.salon && type.trim() === (st.workspace.business_type ?? ''))}>Save</button>
            </form>
            {live && (
              <ul className="rows">
                <li className="link-row">
                  <span className="link-ico"><Icon name="list" /></span>
                  <span className="row-main"><span className="overline">Directory</span><strong>{st.workspace.listed === false ? 'Not listed' : 'Listed on Refill'}</strong><small>Listed places show up when clients search, with your services and prices. Never anyone’s name.</small></span>
                  <span className="person-acts">
                    <button className={`toggle-pill ${st.workspace.listed === false ? 'is-out' : ''}`} aria-pressed={st.workspace.listed !== false}
                      onClick={() => run<{ ok: boolean; listed: boolean }>('set_listed', { p_listed: st.workspace.listed === false }, (r) => (r.ok ? (r.listed ? 'Listed: clients can find you.' : 'Hidden from the directory. Your code still works.') : null))}>
                      {st.workspace.listed === false ? 'Hidden' : 'Listed'}
                    </button>
                  </span>
                </li>
              </ul>
            )}
          </section>
        )}

        {session && (
          <section className="group" aria-label="Account">
            <div className="group-head"><h2>Account</h2><p>Signed in as {session.user.email}.</p></div>
            <form className="add" onSubmit={saveMe} noValidate>
              <label className="field">Your name<input value={name} onChange={(e) => { setName(e.target.value); setSaved(null) }} maxLength={60} autoComplete="name" /></label>
              <button className="btn" type="submit" disabled={!name.trim()}>Save name</button>
              {saved && <p className="quiet small" role="status">{saved}</p>}
            </form>
            <button className="btn is-quiet" onClick={() => signOut()}><Icon name="arrow" /> Sign out</button>
          </section>
        )}

        {err && <p className="err" role="alert">{err}</p>}

        {((owner && live) || session) && (
          <section className="group danger-zone" aria-label="Delete">
            <div className="group-head"><h2>Delete</h2><p>This cannot be undone.</p></div>
            {owner && live && st && (arm === 'biz' ? (
              <div className="add">
                <label className="field">Type “{st.workspace.salon}” to delete it, with every appointment, client sign-up and log<input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></label>
                <div className="card-acts">
                  <button className="btn is-danger" disabled={confirm.trim().toLowerCase() !== st.workspace.salon.trim().toLowerCase()} onClick={deleteBiz}>Delete {st.workspace.salon}</button>
                  <button className="link" onClick={() => { setArm(null); setConfirm('') }}>Keep it</button>
                </div>
              </div>
            ) : <button className="btn is-danger" onClick={() => setArm('biz')}>Delete this business</button>)}
            {session && (arm === 'me' ? (
              <div className="add">
                <p>Delete your account? {owner && live ? 'Delete your business first: your account owns it.' : 'Places you joined keep your sign-up, but it is no longer linked to you.'}</p>
                <div className="card-acts">
                  <button className="btn is-danger" onClick={deleteMe}>Yes, delete my account</button>
                  <button className="link" onClick={() => setArm(null)}>Keep it</button>
                </div>
              </div>
            ) : <button className="btn is-quiet" onClick={() => setArm('me')}>Delete my account</button>)}
          </section>
        )}
      </div>
    </main>
  )
}
