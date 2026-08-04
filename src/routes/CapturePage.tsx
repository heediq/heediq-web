import { useTranslation } from 'react-i18next'
import { AudioIngestForm } from '../features/sources/AudioIngestForm'
import { RecordIngestForm } from '../features/sources/RecordIngestForm'
import { TextIngestForm } from '../features/sources/TextIngestForm'

/**
 * The Capture landing (D-026/D-150) — the ingestion front door and post-auth destination. It hosts the
 * three D-026 ingest methods: live mic recording (the primary "Listen" path), audio-file upload, and
 * text-file upload.
 */
export function CapturePage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('capture.title')}</h1>
        <p className="text-body text-text-secondary">{t('capture.subtitle')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-primary">{t('capture.record.heading')}</h2>
        <RecordIngestForm />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-primary">{t('capture.audio.heading')}</h2>
        <AudioIngestForm />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-primary">{t('capture.text.heading')}</h2>
        <TextIngestForm />
      </div>
    </div>
  )
}
