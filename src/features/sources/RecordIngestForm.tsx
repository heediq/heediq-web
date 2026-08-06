import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Callout, Card, Input, ListenButton, Progress, useToast } from '../../components/ui'
import type { ListenButtonState } from '../../components/ui'
import { useAsyncAction } from '../../lib/useAsyncAction'
import { MediaRecorderError, useMediaRecorder } from './useMediaRecorder'
import { useUploadAudio } from './sources-api'
import { track } from '../../lib/analytics/analytics'

/** Elapsed ms → `mm:ss` for the live recording readout. */
function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** A friendly date stamp for the default title, e.g. "Aug 4, 2026". */
function todayStamp(): string {
  return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * The live-recording ingest method of the Capture landing (D-026/D-150). Captures straight from the mic
 * via `useMediaRecorder` into an `audio/webm` Blob, wraps it as a `File`, and feeds it through the exact
 * same `useUploadAudio` presign → XHR-PUT → `/jobs` pipeline the audio-file path uses — this adds
 * *capture*, not a second upload path. The three-state `ListenButton` drives the whole interaction:
 * idle → recording (live timer) → processing (upload). On success it routes to the new Source's detail
 * page, where transcribe → summarize → classify progress lands over the WS framework. Online-only (D-119).
 */
export function RecordIngestForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const recorder = useMediaRecorder()
  const uploadAudio = useUploadAudio()

  const [title, setTitle] = useState(() => t('capture.record.defaultTitle', { date: todayStamp() }))
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Stop the capture, wrap the Blob as a File, and hand it to the shared audio pipeline. Guarded by
  // `useAsyncAction` so a double-tap on Stop can't fire two uploads (D-120).
  const submit = useAsyncAction(async () => {
    setUploading(true)
    try {
      let blob: Blob
      try {
        blob = await recorder.stop()
      } catch (e) {
        toast.error(
          e instanceof MediaRecorderError && e.reason === 'empty'
            ? t('capture.record.empty')
            : t('capture.record.submitError'),
        )
        return
      }
      const name = title.trim() || t('capture.record.defaultTitle', { date: todayStamp() })
      const file = new File([blob], `${name}.webm`, { type: 'audio/webm' })
      setProgress(0)
      track('capture_started', { method: 'record' })
      try {
        const sourceId = await uploadAudio({
          title: name,
          file,
          contentType: 'audio/webm',
          method: 'record',
          onProgress: setProgress,
        })
        track('capture_submitted', { method: 'record' })
        navigate(`/sources/${sourceId}`)
      } catch {
        toast.error(t('capture.record.submitError'))
      }
    } finally {
      setUploading(false)
    }
  })

  async function toggle() {
    if (recorder.state === 'recording') {
      void submit.run()
      return
    }
    try {
      await recorder.start()
    } catch (e) {
      toast.error(
        e instanceof MediaRecorderError && e.reason === 'permission-denied'
          ? t('capture.record.permissionDenied')
          : t('capture.record.submitError'),
      )
    }
  }

  if (recorder.state === 'unsupported') {
    return (
      <Card>
        <Callout tone="warning">{t('capture.record.unsupported')}</Callout>
      </Card>
    )
  }

  const time = formatElapsed(recorder.elapsedMs)
  const listenState: ListenButtonState = uploading
    ? 'processing'
    : recorder.state === 'recording'
      ? 'recording'
      : 'idle'
  const listenLabel =
    listenState === 'processing'
      ? t('capture.record.processing')
      : listenState === 'recording'
        ? t('capture.record.recording', { time })
        : t('capture.record.start')
  const listenAria =
    listenState === 'processing'
      ? t('listenButton.processingAria')
      : listenState === 'recording'
        ? t('listenButton.recordingAria', { time })
        : t('listenButton.idleAria')

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-body text-text-secondary">{t('capture.record.prompt')}</p>
      <Input
        label={t('capture.record.titleLabel')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={listenState !== 'idle'}
        required
      />
      <div>
        <ListenButton state={listenState} label={listenLabel} aria-label={listenAria} onClick={() => void toggle()} />
      </div>
      {uploading ? (
        <div className="flex flex-col gap-1.5">
          <Progress value={progress} aria-label={t('capture.audio.uploadProgress')} />
          <span className="text-caption text-text-secondary">
            {t('capture.audio.uploadingPct', { pct: progress })}
          </span>
        </div>
      ) : null}
    </Card>
  )
}
