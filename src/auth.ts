// Accounts: Supabase Auth over plain fetch, no client library. Email and password; the project
// does not ask people to confirm their email, so a demo can use any number of addresses.
// The session lives in this browser and every database call carries it (see setBearer in rpc.ts).
import { SUPABASE_KEY, SUPABASE_URL } from './config.ts'
import { ApiError, setBearer } from './rpc.ts'

export interface Session { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email: string } }
const KEY = 'refill.session'
/** Fired on sign-in, sign-out and refresh failure, so the app can re-route. */
export const AUTH_EVENT = 'refill-auth'

export function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return s && typeof s.access_token === 'string' ? s : null
  } catch { return null }
}
function save(s: Session | null, announce = true) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) } catch { /* private mode: this tab still works */ }
  if (announce) dispatchEvent(new Event(AUTH_EVENT))
}

const SAID: Record<string, string> = {
  invalid_credentials: 'That email and password do not match.',
  user_already_exists: 'There is already an account with this email. Sign in instead.',
  email_exists: 'There is already an account with this email. Sign in instead.',
  weak_password: 'Use a longer password: at least 6 characters.',
  validation_failed: 'Check the email address and password.',
  email_address_invalid: 'That email address does not look right.',
  over_request_rate_limit: 'Too many tries. Wait a minute and try again.',
  over_email_send_rate_limit: 'Too many sign-ups from here. Wait a minute and try again.',
  signup_disabled: 'New accounts are switched off for now.',
}

async function gotrue(path: string, body: unknown, token?: string) {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
  } catch { throw new ApiError('No connection. Check the network and try again.') }
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(SAID[j.error_code] ?? j.msg ?? j.error_description ?? 'That did not go through.', j.error_code ?? null)
  return j
}
const toSession = (j: { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } }): Session =>
  ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + j.expires_in * 1000, user: { id: j.user.id, email: j.user.email } })

export async function signUp(email: string, password: string, name: string) {
  const j = await gotrue('signup', { email, password, data: { name } })
  // With email confirmation switched on in Supabase there is no session yet.
  if (!j.access_token) throw new ApiError('This account needs its email confirmed first. Check the inbox, then sign in.', 'CONFIRM_REQUIRED')
  save(toSession(j))
}
export async function signIn(email: string, password: string) {
  save(toSession(await gotrue('token?grant_type=password', { email, password })))
}
export function signOut() {
  const s = readSession()
  save(null)
  if (s) gotrue('logout', {}, s.access_token).catch(() => { /* the session is gone locally either way */ })
}

// One refresh at a time; a failed refresh signs the browser out.
let refreshing: Promise<Session | null> | null = null
async function bearer(): Promise<string | null> {
  const s = readSession()
  if (!s) return null
  if (s.expires_at - Date.now() > 60_000) return s.access_token
  refreshing ??= gotrue('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
    .then((j) => { const n = toSession(j); save(n, false); return n }, () => { save(null); return null })
    .finally(() => { refreshing = null })
  return (await refreshing)?.access_token ?? null
}
setBearer(bearer)
