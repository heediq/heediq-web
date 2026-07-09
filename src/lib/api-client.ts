import { i18n } from '../i18n/config'

/** Mirrors CognitoIdpError (src/lib/auth/cognito-idp.ts) for backend API errors: `code` is our
 * own ErrorCode (heediq-api/src/lib/errors.ts), e.g. "WEAK_PASSWORD", not a Cognito exception name. */
export class ApiClientError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL as string

// The only place the API version prefix is written (D-088) — callers pass a bare resource
// path (e.g. '/auth/lookup-email') and never the prefix itself.
const API_VERSION_PREFIX = '/api/v1'

/**
 * JWT is read fresh on every call (not cached at module scope) so a token
 * refresh mid-session is picked up without re-instantiating the client.
 */
let getAccessToken: () => string | null = () => null

export function setAccessTokenGetter(fn: () => string | null): void {
  getAccessToken = fn
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  const body = await res.json().catch(() => null)

  if (!res.ok || !body?.ok) {
    if (body?.error?.code) {
      throw new ApiClientError(body.error.code, body.error.message)
    }
    throw new Error(i18n.t('errors.requestFailed', { status: res.status }))
  }

  return body.data as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function wsUrl(): string {
  return WS_BASE_URL
}
