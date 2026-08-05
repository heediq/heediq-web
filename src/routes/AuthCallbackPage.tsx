import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState, FullPageLoading } from '../components/ui'
import { exchangeCodeForTokens } from '../lib/auth/cognito-oauth'
import { useAuth } from '../lib/auth/AuthContext'
import { decodeJwtPayload } from '../lib/auth/jwt'
import { useOAuthCallbackExchange } from '../lib/auth/useOAuthCallbackExchange'
import { track } from '../lib/analytics/analytics'
import type { ProviderAuthMethod } from '../lib/analytics/analytics'

interface OAuthIdTokenPayload {
  identities?: string
}

// Cognito stamps the federated identity used for this login onto the id token's `identities`
// claim (same shape SettingsLinkCallbackPage reads) — the only place this page can learn which
// provider was actually used, since the redirect back here carries no provider param. Analytics
// must never break the (already-succeeded) sign-in, so any decode failure just skips the event.
function providerFromIdToken(idToken: string): ProviderAuthMethod | undefined {
  try {
    const payload = decodeJwtPayload<OAuthIdTokenPayload>(idToken)
    const identities: Array<{ providerName?: string }> = payload.identities
      ? JSON.parse(payload.identities)
      : []
    const providerName = identities[0]?.providerName?.toLowerCase()
    return providerName === 'google' || providerName === 'microsoft' ? providerName : undefined
  } catch {
    return undefined
  }
}

export function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { applyTokens } = useAuth()

  const { showLoading, failed } = useOAuthCallbackExchange({
    run: async () => {
      const tokens = await exchangeCodeForTokens(new URLSearchParams(window.location.search))
      applyTokens(tokens)
      const method = providerFromIdToken(tokens.id_token)
      if (method) track('login_succeeded', { method })
    },
    onDone: () => navigate('/capture', { replace: true }),
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
