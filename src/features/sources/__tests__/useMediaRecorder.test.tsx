import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MediaRecorderError, useMediaRecorder } from '../useMediaRecorder'

// Module-level knobs the fakes read, set per-test (no `beforeEach` reset — same discipline as
// CapturePage.test.tsx: touching a shared mock's state between tests can mis-flag an intentionally
// caught rejection as unhandled on vitest v2).
let typeSupported = true
let chunkBytes = 10
let getUserMediaImpl: () => Promise<MediaStream> = () => Promise.resolve(fakeStream())

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: () => {} }] } as unknown as MediaStream
}

/** Minimal `MediaRecorder` stand-in: emits one chunk of `chunkBytes` on stop, then fires `onstop`. */
class FakeMediaRecorder {
  static isTypeSupported = () => typeSupported
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(
    public stream: MediaStream,
    public options?: { mimeType?: string },
  ) {}
  start() {}
  stop() {
    if (chunkBytes > 0) {
      this.ondataavailable?.({ data: new Blob([new Uint8Array(chunkBytes)], { type: 'audio/webm' }) })
    }
    this.onstop?.()
  }
}

vi.stubGlobal('MediaRecorder', FakeMediaRecorder as unknown as typeof MediaRecorder)
Object.defineProperty(navigator, 'mediaDevices', {
  configurable: true,
  value: { getUserMedia: () => getUserMediaImpl() },
})

describe('useMediaRecorder', () => {
  it('starts capturing and reports the recording state', async () => {
    typeSupported = true
    getUserMediaImpl = () => Promise.resolve(fakeStream())
    const { result } = renderHook(() => useMediaRecorder())
    expect(result.current.state).toBe('idle')

    await act(async () => {
      await result.current.start()
    })
    expect(result.current.state).toBe('recording')
  })

  it('resolves an audio/webm Blob on stop and returns to idle', async () => {
    typeSupported = true
    chunkBytes = 10
    getUserMediaImpl = () => Promise.resolve(fakeStream())
    const { result } = renderHook(() => useMediaRecorder())

    await act(async () => {
      await result.current.start()
    })
    let blob: Blob | undefined
    await act(async () => {
      blob = await result.current.stop()
    })
    expect(blob?.type).toBe('audio/webm')
    expect(blob?.size).toBeGreaterThan(0)
    expect(result.current.state).toBe('idle')
  })

  it('rejects with permission-denied when the mic is blocked', async () => {
    typeSupported = true
    getUserMediaImpl = () => Promise.reject(new Error('NotAllowedError'))
    const { result } = renderHook(() => useMediaRecorder())

    let reason: string | undefined
    await act(async () => {
      try {
        await result.current.start()
      } catch (e) {
        reason = (e as MediaRecorderError).reason
      }
    })
    expect(reason).toBe('permission-denied')
    expect(result.current.state).toBe('idle')
  })

  it('rejects with empty when nothing was captured', async () => {
    typeSupported = true
    chunkBytes = 0
    getUserMediaImpl = () => Promise.resolve(fakeStream())
    const { result } = renderHook(() => useMediaRecorder())

    await act(async () => {
      await result.current.start()
    })
    let reason: string | undefined
    await act(async () => {
      try {
        await result.current.stop()
      } catch (e) {
        reason = (e as MediaRecorderError).reason
      }
    })
    expect(reason).toBe('empty')
  })

  it('reports unsupported when the browser cannot record audio/webm', () => {
    typeSupported = false
    const { result } = renderHook(() => useMediaRecorder())
    expect(result.current.state).toBe('unsupported')
    typeSupported = true
  })
})
