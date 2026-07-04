import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce'

const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN as string
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string

const VERIFIER_KEY = 'heediq.pkce.verifier'
const STATE_KEY = 'heediq.pkce.state'

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`
}

export async function startLogin(): Promise<void> {
  const verifier = generateCodeVerifier()
  const state = generateState()
  const challenge = await generateCodeChallenge(verifier)

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: redirectUri(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })

  window.location.assign(`${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`)
}

export interface TokenResponse {
  access_token: string
  id_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export class OAuthCallbackError extends Error {}

/**
 * Consumes the stored verifier/state on every call (success or failure) so a
 * stale entry can never be replayed against a later callback.
 */
export async function exchangeCodeForTokens(searchParams: URLSearchParams): Promise<TokenResponse> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  const expectedState = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)

  const error = searchParams.get('error')
  if (error) throw new OAuthCallbackError(searchParams.get('error_description') ?? error)

  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) throw new OAuthCallbackError('missing_code')
  if (!verifier) throw new OAuthCallbackError('missing_verifier')
  if (!state || !expectedState || state !== expectedState) throw new OAuthCallbackError('state_mismatch')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CLIENT_ID,
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  })

  const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new OAuthCallbackError('token_exchange_failed')

  return res.json() as Promise<TokenResponse>
}

export type RefreshTokenResponse = Omit<TokenResponse, 'refresh_token'>

/** Cognito's refresh_token grant does not return a new refresh token — the original keeps working until it expires. */
export async function refreshTokens(refreshToken: string): Promise<RefreshTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: COGNITO_CLIENT_ID,
    refresh_token: refreshToken,
  })

  const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new OAuthCallbackError('token_refresh_failed')

  return res.json() as Promise<RefreshTokenResponse>
}

export function logoutUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: window.location.origin,
  })
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`
}
