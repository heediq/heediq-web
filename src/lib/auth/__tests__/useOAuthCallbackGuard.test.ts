import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useOAuthCallbackGuard } from '../useOAuthCallbackGuard'

function setSearch(search: string) {
  window.history.pushState({}, '', search)
}

describe('useOAuthCallbackGuard', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setSearch('/')
  })

  it('is not a duplicate on first render with a code', () => {
    setSearch('/auth/callback?code=abc&state=xyz')
    const { result } = renderHook(() => useOAuthCallbackGuard())
    expect(result.current.isDuplicate).toBe(false)
  })

  it('marks the code as a duplicate on a second invocation with the same code', () => {
    setSearch('/auth/callback?code=abc&state=xyz')
    renderHook(() => useOAuthCallbackGuard())

    const { result } = renderHook(() => useOAuthCallbackGuard())
    expect(result.current.isDuplicate).toBe(true)
  })

  it('is not a duplicate for a different code', () => {
    setSearch('/auth/callback?code=abc')
    renderHook(() => useOAuthCallbackGuard())

    setSearch('/auth/callback?code=def')
    const { result } = renderHook(() => useOAuthCallbackGuard())
    expect(result.current.isDuplicate).toBe(false)
  })

  it('is never a duplicate when there is no code (e.g. an error callback)', () => {
    setSearch('/auth/callback?error=access_denied')
    renderHook(() => useOAuthCallbackGuard())

    const { result } = renderHook(() => useOAuthCallbackGuard())
    expect(result.current.isDuplicate).toBe(false)
  })
})
