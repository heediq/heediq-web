import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingMark } from '../components/ui'
import { exchangeCodeForTokens } from '../lib/auth/cognito-oauth'
import { useAuth } from '../lib/auth/AuthContext'
import { useOAuthCallbackGuard } from '../lib/auth/useOAuthCallbackGuard'

export function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { applyTokens } = useAuth()
  const [failed, setFailed] = useState(false)
  const { isDuplicate } = useOAuthCallbackGuard()

  useEffect(() => {
    let cancelled = false

    if (isDuplicate) {
      // Already signed in by an earlier invocation of this exact callback (reload, browser
      // back/forward) — the code is single-use, so replaying it would only fail (D-113). The
      // session from the original successful exchange is already applied; just continue in.
      navigate('/sources', { replace: true })
      return
    }

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
  }, [isDuplicate])

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
