import { i18n } from '../i18n/config'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL as string

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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? i18n.t('errors.requestFailed', { status: res.status }))
  }

  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
}

export function wsUrl(): string {
  return WS_BASE_URL
}
