import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, ApiClientError } from '../api-client'

describe('apiClient (D-088 — version prefix regression)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, data: { fine: true } }),
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prepends the /api/v1 version prefix to every request path', async () => {
    await apiClient.post('/auth/lookup-email', { email: 'a@b.com' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/auth\/lookup-email$/)
  })

  it('applies the prefix on GET requests too', async () => {
    await apiClient.get('/me')

    const [url] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/me$/)
  })

  it('throws an ApiClientError carrying the backend error code when the response has one', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ ok: false, error: { code: 'WEAK_PASSWORD', message: 'nope' } }),
    })

    const err = await apiClient.post('/auth/link/confirm', {}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiClientError)
    expect((err as ApiClientError).code).toBe('WEAK_PASSWORD')
    expect((err as ApiClientError).message).toBe('nope')
  })

  it('falls back to a generic Error when the response has no error code', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    })

    const err = await apiClient.get('/me').catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(ApiClientError)
    expect(err).toBeInstanceOf(Error)
  })
})
