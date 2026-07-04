import { useTranslation } from 'react-i18next'

export function SourcesLibraryPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-body text-text-secondary">{t('sourcesLibrary.comingSoon')}</p>
    </div>
  )
}
