import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../api-client'

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
})
