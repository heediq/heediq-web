import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useInstallPrompt } from '../useInstallPrompt'

function firePrompt(promptImpl: () => Promise<void>, userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>) {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  event.prompt = promptImpl
  event.userChoice = userChoice
  window.dispatchEvent(event)
}

describe('useInstallPrompt', () => {
  it('is not installable until the browser fires beforeinstallprompt', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)
    expect(result.current.installed).toBe(false)
  })

  it('becomes installable after beforeinstallprompt fires, and prompts on demand', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const promptImpl = vi.fn().mockResolvedValue(undefined)

    act(() => {
      firePrompt(promptImpl, Promise.resolve({ outcome: 'accepted' }))
    })
    expect(result.current.canInstall).toBe(true)

    const outcome = await act(() => result.current.promptInstall())
    expect(promptImpl).toHaveBeenCalledTimes(1)
    expect(outcome).toBe('accepted')
  })

  it('resolves unavailable when prompted with no captured event', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const outcome = await act(() => result.current.promptInstall())
    expect(outcome).toBe('unavailable')
  })

  it('marks installed and clears installability on the appinstalled event', () => {
    const { result } = renderHook(() => useInstallPrompt())

    act(() => {
      firePrompt(vi.fn(), Promise.resolve({ outcome: 'accepted' }))
    })
    expect(result.current.canInstall).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.installed).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })
})
