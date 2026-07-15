import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingMark } from '../components/ui'
import { exchangeLinkCodeForTokens } from '../lib/auth/cognito-oauth'
import { apiClient } from '../lib/api-client'
import { decodeJwtPayload } from '../lib/auth/jwt'
import { useOAuthCallbackGuard } from '../lib/auth/useOAuthCallbackGuard'

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
  const [failed, setFailed] = useState(false)
  const { isDuplicate } = useOAuthCallbackGuard()

  useEffect(() => {
    let cancelled = false

    if (isDuplicate) {
      // This authorization code was already consumed by an earlier invocation of this exact
      // callback (reload, browser back/forward) — the link already went through server-side;
      // replaying it would only fail since the code is single-use (D-113).
      navigate('/settings', { replace: true })
      return
    }

    async function run() {
      const tokens = await exchangeLinkCodeForTokens(new URLSearchParams(window.location.search))
      const payload = decodeJwtPayload<LinkIdTokenPayload>(tokens.id_token)
      const identities: CognitoIdentity[] = payload.identities ? JSON.parse(payload.identities) : []
      const identity = identities[0]
      if (!identity) throw new Error('missing_identity')

      await apiClient.post('/settings/link/add-provider', {
        provider: identity.providerName,
        providerUserId: identity.userId,
      })
    }

    run()
      .then(() => {
        if (!cancelled) navigate('/settings', { replace: true })
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
          title={t('settingsLinkCallback.error.title')}
          description={t('settingsLinkCallback.error.description')}
          retryLabel={t('settingsLinkCallback.error.retry')}
          onRetry={() => navigate('/settings', { replace: true })}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingMark size="lg" aria-label={t('settingsLinkCallback.linking')} />
    </div>
  )
}
