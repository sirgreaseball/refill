// Every database call is a POST to one function (supabase/migrations). Plain
// fetch is all that takes; no client library. Shared by the app, the Lab and
// scripts/race-test.ts, so it imports with explicit .ts extensions for Node.
import { SUPABASE_KEY, SUPABASE_URL } from './config.ts'

/** `code` is the database's own code (RATE_LIMITED, TOO_LARGE...); `message` is the sentence to show. */
export class ApiError extends Error {
  code: string | null
  constructor(message: string, code: string | null = null) {
    super(message)
    this.code = code
  }
}

// Limits the database enforces (supabase/migrations/002), said plainly.
const FRIENDLY: Record<string, string> = {
  RATE_LIMITED: 'Too many requests from this network. Wait a minute and try again.',
  CAPACITY: 'The demo is full right now. Try again in a little while.',
  TOO_LARGE: 'That is more data than one demo day holds.',
}

// The signed-in account's token, when there is one (src/auth.ts sets this). Scripts never set
// it, so they call as the public key, exactly as before accounts existed.
let bearer: () => Promise<string | null> = async () => null
export const setBearer = (f: () => Promise<string | null>) => { bearer = f }

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    const token = await bearer()
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(args),
    })
  } catch {
    throw new ApiError('No connection to the database.')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(FRIENDLY[body?.message] ?? body?.message ?? `${fn} failed (${res.status})`, body?.message ?? null)
  return body as T
}
