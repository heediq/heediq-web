import { useTranslation } from 'react-i18next'
import { AudioIngestForm } from '../features/sources/AudioIngestForm'
import { TextIngestForm } from '../features/sources/TextIngestForm'

/**
 * The Capture landing (D-026/D-150) — the ingestion front door and post-auth destination. It hosts
 * the ingest methods; the text-file and audio-file upload paths are live here, with live mic
 * recording arriving as a further method on this page (PR3d).
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
