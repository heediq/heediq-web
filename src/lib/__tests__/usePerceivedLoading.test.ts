import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePerceivedLoading } from '../usePerceivedLoading'

describe('usePerceivedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('never shows when the operation finishes before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => usePerceivedLoading(isActive, { delay: 150, minDuration: 500 }),
      { initialProps: { isActive: true } }
    )
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(false)

    rerender({ isActive: false })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(false)
  })

  it('shows once the delay elapses and stays visible for at least minDuration', () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => usePerceivedLoading(isActive, { delay: 150, minDuration: 500 }),
      { initialProps: { isActive: true } }
    )

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe(true)

    // The operation finishes almost immediately after becoming visible.
    rerender({ isActive: false })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(true) // still under minDuration since it became visible

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe(false)
  })

  it('hides immediately once minDuration has already elapsed by the time the operation finishes', () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => usePerceivedLoading(isActive, { delay: 150, minDuration: 500 }),
      { initialProps: { isActive: true } }
    )

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(600) // well past minDuration while still active
    })
    expect(result.current).toBe(true)

    rerender({ isActive: false })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(false)
  })

  it('cancels a pending hide and stays visible if the operation restarts before minDuration expires', () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => usePerceivedLoading(isActive, { delay: 150, minDuration: 500 }),
      { initialProps: { isActive: true } }
    )

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe(true)

    rerender({ isActive: false })
    act(() => {
      vi.advanceTimersByTime(200) // still within the minDuration hide-delay window
    })
    expect(result.current).toBe(true)

    rerender({ isActive: true }) // a fresh action starts before the previous one finished fading out
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(true)

    // No fresh delay is applied — it was already visible.
    rerender({ isActive: false })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe(false)
  })
})
