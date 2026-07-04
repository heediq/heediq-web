import { useTranslation } from 'react-i18next'

export function AuthCallbackPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-body text-text-secondary">{t('authCallback.notWiredUp')}</p>
    </div>
  )
}
