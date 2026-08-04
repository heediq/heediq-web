import { useTranslation } from 'react-i18next'
import { TextIngestForm } from '../features/sources/TextIngestForm'

/**
 * The Capture landing (D-026/D-150) — the ingestion front door and post-auth destination. It hosts
 * the ingest methods; the text-file path is live here, with live mic recording and audio-file upload
 * arriving as further methods on this page (PR3c/PR3d).
 */
export function CapturePage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('capture.title')}</h1>
        <p className="text-body text-text-secondary">{t('capture.subtitle')}</p>
      </div>
      <TextIngestForm />
    </div>
  )
}
