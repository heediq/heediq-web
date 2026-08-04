import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FileAudio, Upload } from 'lucide-react'
import type { PresignUploadRequest } from '@heediq/shared'
import { Button, Card, Input, Progress, useToast } from '../../components/ui'
import { useAsyncAction } from '../../lib/useAsyncAction'
import { useUploadAudio } from './sources-api'

/** 2 GB upload cap (matches the presign endpoint's limit). */
const MAX_BYTES = 2 * 1024 * 1024 * 1024

/**
 * File extension → the presign endpoint's accepted `contentType`. We key off the extension rather than
 * `File.type` because browsers report audio MIME inconsistently (`.m4a` as `audio/x-m4a`, `.wav` as
 * `audio/wave`, sometimes empty), whereas the presigned PUT must use exactly one of these five values.
 */
const CONTENT_TYPE_BY_EXT: Record<string, PresignUploadRequest['contentType']> = {
  webm: 'audio/webm',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
}

function contentTypeFor(fileName: string): PresignUploadRequest['contentType'] | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPE_BY_EXT[ext] ?? null
}

/**
 * The audio-file ingest method of the Capture landing (D-150): pick an audio file, confirm the title,
 * and upload it straight to S3 with live progress, then kick off transcription. Wrong-type/oversize
 * files are rejected client-side with a toast before any network call. On success it routes to the new
 * Source's detail page, where transcribe → summarize → classify progress lands over the WS framework.
 */
export function AudioIngestForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAudio = useUploadAudio()

  const [file, setFile] = useState<File | null>(null)
  const [contentType, setContentType] = useState<PresignUploadRequest['contentType'] | null>(null)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(0)

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = '' // let the user re-pick the same file after clearing
    if (!picked) return
    const type = contentTypeFor(picked.name)
    if (!type) {
      toast.error(t('capture.audio.wrongType'))
      return
    }
    if (picked.size > MAX_BYTES) {
      toast.error(t('capture.audio.tooLarge'))
      return
    }
    setFile(picked)
    setContentType(type)
    // Default the title to the filename (sans extension), but never clobber a title the user typed.
    setTitle((current) => current || picked.name.replace(/\.[^.]+$/, ''))
  }

  const canSubmit = title.trim().length > 0 && file !== null && contentType !== null

  const submit = useAsyncAction(async () => {
    if (!file || !contentType || title.trim().length === 0) return
    setProgress(0)
    try {
      const sourceId = await uploadAudio({
        title: title.trim(),
        file,
        contentType,
        onProgress: setProgress,
      })
      navigate(`/sources/${sourceId}`)
    } catch {
      toast.error(t('capture.audio.submitError'))
    }
  })

  return (
    <Card className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.m4a"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onFileChange}
      />

      {file ? (
        <>
          <Input
            label={t('capture.audio.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <p className="text-caption text-text-secondary">
            {t('capture.audio.selected', { name: file.name })}
          </p>
          {submit.pending ? (
            <div className="flex flex-col gap-1.5">
              <Progress value={progress} aria-label={t('capture.audio.uploadProgress')} />
              <span className="text-caption text-text-secondary">
                {t('capture.audio.uploadingPct', { pct: progress })}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void submit.run()} loading={submit.pending} disabled={!canSubmit}>
              {submit.pending ? t('capture.audio.uploading') : t('capture.audio.submit')}
            </Button>
            <Button
              variant="ghost"
              disabled={submit.pending}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('capture.audio.chooseAnother')}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <FileAudio className="size-8 text-text-secondary" aria-hidden="true" />
          <p className="text-body text-text-secondary">{t('capture.audio.prompt')}</p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" /> {t('capture.audio.choose')}
          </Button>
        </div>
      )}
    </Card>
  )
}
