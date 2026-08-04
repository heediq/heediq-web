import { useCallback, useEffect, useRef, useState } from 'react'

/** The one container/codec we capture and presign for — the whole audio path is keyed to it. */
const MIME_TYPE = 'audio/webm'

/** How often the elapsed-time readout ticks while recording (ms). */
const TICK_MS = 200

export type MediaRecorderState = 'unsupported' | 'idle' | 'recording'

/** Why a recording attempt failed — the form maps each to its own `t()` copy. */
export type MediaRecorderErrorReason = 'unsupported' | 'permission-denied' | 'empty'

export class MediaRecorderError extends Error {
  constructor(public readonly reason: MediaRecorderErrorReason) {
    super(reason)
    this.name = 'MediaRecorderError'
  }
}

/** Feature-detect the exact capability we need: a `MediaRecorder` that can emit `audio/webm`, plus
 * `getUserMedia`. A browser missing any of these (e.g. older Safari) is `unsupported` — we surface an
 * "upload a file instead" message rather than a broken record button. */
function isSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    MediaRecorder.isTypeSupported(MIME_TYPE)
  )
}

export interface UseMediaRecorder {
  state: MediaRecorderState
  /** Elapsed capture time in ms, live while `recording`. */
  elapsedMs: number
  /** Begin capture. Rejects with `MediaRecorderError('permission-denied' | 'unsupported')`. */
  start: () => Promise<void>
  /** Stop capture and resolve the `audio/webm` Blob. Rejects with `MediaRecorderError('empty')` if
   * nothing was captured. */
  stop: () => Promise<Blob>
}

/**
 * Live microphone capture (D-026 record path) → an `audio/webm` `Blob`, ready to feed straight into the
 * existing `useUploadAudio` presign→upload→transcribe pipeline. **Online-only (D-119)** — there is no
 * offline/IndexedDB buffering; a capture that can't upload just surfaces an error.
 *
 * State machine: `idle → recording → idle`. `unsupported` is terminal (no `MediaRecorder`/`getUserMedia`
 * or no `audio/webm`). The three error reasons the form must handle — `unsupported`, `permission-denied`
 * (getUserMedia rejected), and `empty` (a 0-byte capture) — are all raised as a typed `MediaRecorderError`.
 * Media tracks are always stopped (mic indicator released) on stop and on unmount.
 */
export function useMediaRecorder(): UseMediaRecorder {
  const supported = isSupported()
  const [state, setState] = useState<MediaRecorderState>(supported ? 'idle' : 'unsupported')
  const [elapsedMs, setElapsedMs] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)

  const teardown = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (!supported) throw new MediaRecorderError('unsupported')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      throw new MediaRecorderError('permission-denied')
    }
    chunksRef.current = []
    const recorder = new MediaRecorder(stream, { mimeType: MIME_TYPE })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    streamRef.current = stream
    recorderRef.current = recorder
    recorder.start()
    startedAtRef.current = Date.now()
    setElapsedMs(0)
    setState('recording')
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current)
    }, TICK_MS)
  }, [supported])

  const stop = useCallback(
    () =>
      new Promise<Blob>((resolve, reject) => {
        const recorder = recorderRef.current
        if (!recorder) {
          reject(new MediaRecorderError('empty'))
          return
        }
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: MIME_TYPE })
          chunksRef.current = []
          teardown()
          setState('idle')
          setElapsedMs(0)
          if (blob.size === 0) reject(new MediaRecorderError('empty'))
          else resolve(blob)
        }
        recorder.stop()
      }),
    [teardown],
  )

  // Release the mic if the component unmounts mid-recording.
  useEffect(() => teardown, [teardown])

  return { state, elapsedMs, start, stop }
}
