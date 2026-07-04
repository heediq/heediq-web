import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>()
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-body text-text-secondary">{t('sourceDetail.comingSoon', { sourceId })}</p>
    </div>
  )
}
