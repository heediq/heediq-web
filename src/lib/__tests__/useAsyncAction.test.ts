import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAsyncAction } from '../useAsyncAction'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsyncAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets pending (after the D-122 delay) while the action is in flight, then clears it', async () => {
    const { promise, resolve } = deferred<void>()
    const action = vi.fn(() => promise)
    const { result } = renderHook(() => useAsyncAction(action))

    let runPromise: Promise<void>
    act(() => {
      runPromise = result.current.run()
    })
    // Not yet visible — usePerceivedLoading withholds it for the first 150ms.
    expect(result.current.pending).toBe(false)

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current.pending).toBe(true)

    await act(async () => {
      resolve()
      await runPromise
    })
    // Still visible — the action resolved almost immediately, well under minDuration.
    expect(result.current.pending).toBe(true)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.pending).toBe(false)
  })

  it('ignores a re-entrant call while already pending (double-click guard)', async () => {
    const { promise, resolve } = deferred<void>()
    const action = vi.fn(() => promise)
    const { result } = renderHook(() => useAsyncAction(action))

    await act(async () => {
      void result.current.run()
      void result.current.run()
      resolve()
      await promise
    })

    expect(action).toHaveBeenCalledTimes(1)
  })

  it('clears pending after a rejection so the action can be retried', async () => {
    const { promise, reject } = deferred<void>()
    const action = vi.fn(() => promise)
    const { result } = renderHook(() => useAsyncAction(action))

    let runPromise: Promise<void>
    act(() => {
      runPromise = result.current.run()
    })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current.pending).toBe(true)

    await act(async () => {
      reject(new Error('boom'))
      await runPromise.catch(() => undefined)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.pending).toBe(false)
  })
})
