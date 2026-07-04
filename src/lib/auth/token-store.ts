/**
 * Access/ID tokens live only in module memory (never persisted) — the
 * refresh token is the sole thing persisted across reloads, in localStorage,
 * so a browser refresh doesn't force a full Hosted UI redirect round trip.
 */
const REFRESH_TOKEN_KEY = 'heediq.refresh_token'

interface Session {
  accessToken: string
  idToken: string
  expiresAt: number
}

let session: Session | null = null

export function setSession(tokens: { access_token: string; id_token: string; expires_in: number }): void {
  session = {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  }
}

export function setRefreshToken(refreshToken: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getAccessToken(): string | null {
  return session?.accessToken ?? null
}

export function isSessionActive(): boolean {
  return session !== null && session.expiresAt > Date.now()
}

export function clearSession(): void {
  session = null
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
