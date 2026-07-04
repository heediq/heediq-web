import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingMark } from '../components/ui'
import { exchangeCodeForTokens } from '../lib/auth/cognito-oauth'
import { useAuth } from '../lib/auth/AuthContext'

export function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { applyTokens } = useAuth()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    exchangeCodeForTokens(new URLSearchParams(window.location.search))
      .then((tokens) => {
        if (cancelled) return
        applyTokens(tokens)
        navigate('/sources', { replace: true })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorState
          title={t('authCallback.error.title')}
          description={t('authCallback.error.description')}
          retryLabel={t('authCallback.error.retry')}
          onRetry={() => navigate('/', { replace: true })}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingMark size="lg" aria-label={t('authCallback.signingIn')} />
    </div>
  )
}
