import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-display">{t('home.title')}</h1>
      <p className="text-body text-text-secondary">{t('home.subtitle')}</p>
    </div>
  )
}
