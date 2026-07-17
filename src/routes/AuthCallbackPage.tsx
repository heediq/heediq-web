import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState, FullPageLoading } from '../components/ui'
import { exchangeCodeForTokens } from '../lib/auth/cognito-oauth'
import { useAuth } from '../lib/auth/AuthContext'
import { useOAuthCallbackExchange } from '../lib/auth/useOAuthCallbackExchange'

export function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { applyTokens } = useAuth()

  const { showLoading, failed } = useOAuthCallbackExchange({
    run: async () => {
      const tokens = await exchangeCodeForTokens(new URLSearchParams(window.location.search))
      applyTokens(tokens)
    },
    onDone: () => navigate('/sources', { replace: true }),
  })

  if (showLoading) {
    return <FullPageLoading aria-label={t('authCallback.signingIn')} />
  }

  if (!failed) {
    return null
  }

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
