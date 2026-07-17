import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOAuthCallbackExchange } from '../useOAuthCallbackExchange'

describe('useOAuthCallbackExchange', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.history.pushState({}, '', '/auth/callback?code=abc&state=xyz')
  })

  it('never reports failed on mount while the exchange is still pending (regression: error flash)', () => {
    const run = vi.fn().mockReturnValue(new Promise(() => {}))
    const onDone = vi.fn()

    const { result } = renderHook(() => useOAuthCallbackExchange({ run, onDone }))

    // showLoading is false this instant (the D-122 delay hasn't elapsed yet) — a caller that
    // rendered an error state from `!showLoading` alone would flash one here, even though
    // nothing has failed. `failed` is the only signal that should ever gate the error render.
    expect(result.current.showLoading).toBe(false)
    expect(result.current.failed).toBe(false)
  })

  it('sets failed once the exchange rejects', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'))
    const onDone = vi.fn()

    const { result } = renderHook(() => useOAuthCallbackExchange({ run, onDone }))

    await vi.waitFor(() => expect(result.current.failed).toBe(true))
    expect(onDone).not.toHaveBeenCalled()
  })

  it('calls onDone once the exchange resolves', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    const onDone = vi.fn()

    renderHook(() => useOAuthCallbackExchange({ run, onDone }))

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('calls onDone immediately for a duplicate invocation without running the exchange', async () => {
    sessionStorage.setItem('heediq.oauth.consumed.abc', '1')
    const run = vi.fn()
    const onDone = vi.fn()

    renderHook(() => useOAuthCallbackExchange({ run, onDone }))

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(run).not.toHaveBeenCalled()
  })
})
