// Every database call is a POST to one function (supabase/migrations). Plain
// fetch is all that takes; no client library. Shared by the app, the Lab and
// scripts/race-test.ts, so it imports with explicit .ts extensions for Node.
import { SUPABASE_KEY, SUPABASE_URL } from './config.ts'

export class ApiError extends Error {}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
  } catch {
    throw new ApiError('No connection to the database.')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(body?.message ?? `${fn} failed (${res.status})`)
  return body as T
}
