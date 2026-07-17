import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState, FullPageLoading } from '../components/ui'
import { exchangeLinkCodeForTokens } from '../lib/auth/cognito-oauth'
import { apiClient } from '../lib/api-client'
import { decodeJwtPayload } from '../lib/auth/jwt'
import { useOAuthCallbackExchange } from '../lib/auth/useOAuthCallbackExchange'

interface CognitoIdentity {
  userId: string
  providerName: string
}

interface LinkIdTokenPayload {
  identities?: string
}

export function SettingsLinkCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { showLoading, failed } = useOAuthCallbackExchange({
    run: async () => {
      const tokens = await exchangeLinkCodeForTokens(new URLSearchParams(window.location.search))
      const payload = decodeJwtPayload<LinkIdTokenPayload>(tokens.id_token)
      const identities: CognitoIdentity[] = payload.identities ? JSON.parse(payload.identities) : []
      const identity = identities[0]
      if (!identity) throw new Error('missing_identity')

      await apiClient.post('/settings/link/add-provider', {
        provider: identity.providerName,
        providerUserId: identity.userId,
      })
    },
    onDone: () => navigate('/settings', { replace: true }),
  })

  if (showLoading) {
    return <FullPageLoading aria-label={t('settingsLinkCallback.linking')} />
  }

  if (!failed) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <ErrorState
        title={t('settingsLinkCallback.error.title')}
        description={t('settingsLinkCallback.error.description')}
        retryLabel={t('settingsLinkCallback.error.retry')}
        onRetry={() => navigate('/settings', { replace: true })}
      />
    </div>
  )
}
