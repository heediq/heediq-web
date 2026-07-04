import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, LoadingMark } from '../components/ui'
import { useAuth } from '../lib/auth/AuthContext'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, login } = useAuth()

  useEffect(() => {
    if (status === 'authenticated') navigate('/sources', { replace: true })
  }, [status, navigate])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingMark size="lg" aria-label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-display">{t('home.title')}</h1>
      <p className="text-body text-text-secondary">{t('home.subtitle')}</p>
      <Button variant="primary" onClick={() => void login()}>
        {t('home.signIn')}
      </Button>
    </div>
  )
}
