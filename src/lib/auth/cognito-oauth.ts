import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce'

const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN as string
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string

const VERIFIER_KEY = 'heediq.pkce.verifier'
const STATE_KEY = 'heediq.pkce.state'
const LINK_VERIFIER_KEY = 'heediq.pkce.link.verifier'
const LINK_STATE_KEY = 'heediq.pkce.link.state'

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`
}

function linkRedirectUri(): string {
  return `${window.location.origin}/settings/link-callback`
}

export type LinkableProvider = 'Google' | 'Microsoft'

/**
 * `provider` sends `identity_provider` straight through to Cognito's Hosted-UI authorize
 * endpoint (D-118), skipping its generic IdP picker — mirrors `startProviderLink` below.
 * Omitted, the user lands on Cognito's own picker (email/password + IdP choices).
 */
export async function startLogin(provider?: LinkableProvider): Promise<void> {
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
    // Intended to force the IdP's own account chooser instead of silently reusing an existing
    // browser session. Confirmed working for Microsoft (custom OIDC IdP, forwards extra
    // authorize params) but NOT for Google: Cognito's built-in social Google IdP silently drops
    // `prompt` before redirecting to accounts.google.com — verified via the network tab, the
    // param never reaches Google. Left in place (harmless no-op for Google, and Cognito may add
    // forwarding support later) rather than special-cased per provider.
    ...(provider ? { identity_provider: provider, prompt: 'select_account' } : {}),
  })

  window.location.assign(`${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`)
}

/**
 * Proactive linking (D-079/D-083): a provider the current user has never signed into has no
 * federated identity in Cognito yet, so we need one fresh Hosted-UI round trip through it before
 * AdminLinkProviderForUser can run server-side. This lands on its own /settings/link-callback
 * route (D-083) rather than reusing /auth/callback, so it gets its own PKCE storage keys.
 */
export async function startProviderLink(provider: LinkableProvider): Promise<void> {
  const verifier = generateCodeVerifier()
  const state = generateState()
  const challenge = await generateCodeChallenge(verifier)

  sessionStorage.setItem(LINK_VERIFIER_KEY, verifier)
  sessionStorage.setItem(LINK_STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: linkRedirectUri(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    identity_provider: provider,
    // See startLogin — only actually effective for Microsoft; Cognito drops it for Google.
    prompt: 'select_account',
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

/**
 * Exchanges the /settings/link-callback code for tokens representing the just-authenticated
 * federated identity — NOT the current user's session. Callers must never pass this result to
 * applyTokens/token-store; the current session's tokens stay untouched throughout linking.
 */
export async function exchangeLinkCodeForTokens(searchParams: URLSearchParams): Promise<TokenResponse> {
  const verifier = sessionStorage.getItem(LINK_VERIFIER_KEY)
  const expectedState = sessionStorage.getItem(LINK_STATE_KEY)
  sessionStorage.removeItem(LINK_VERIFIER_KEY)
  sessionStorage.removeItem(LINK_STATE_KEY)

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
    redirect_uri: linkRedirectUri(),
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
