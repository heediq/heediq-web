import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListAuthMethodsResponse } from '@heediq/shared'
import { Badge, Button, Card, ErrorState, LoadingMark } from '../components/ui'
import { VerifyAndSetPasswordForm } from '../features/auth/VerifyAndSetPasswordForm'
import { startProviderLink } from '../lib/auth/cognito-oauth'
import type { LinkableProvider } from '../lib/auth/cognito-oauth'
import { apiClient } from '../lib/api-client'
import type { GetMeResponse } from '../lib/rbac/types'

export function SettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [settingPassword, setSettingPassword] = useState(false)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<GetMeResponse>('/me'),
  })
  const methodsQuery = useQuery({
    queryKey: ['authMethods'],
    queryFn: () => apiClient.get<ListAuthMethodsResponse>('/auth/methods'),
  })

  const activeProviders = new Set(methodsQuery.data?.methods.map((m) => m.provider) ?? [])
  const hasPassword = activeProviders.has('COGNITO')

  async function handlePasswordSet() {
    setSettingPassword(false)
    await queryClient.invalidateQueries({ queryKey: ['authMethods'] })
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 pt-16">
        <h1 className="text-h1">{t('settings.title')}</h1>

        <Card>
          <Card.Header>
            <Card.Title>{t('settings.signInMethods.title')}</Card.Title>
            <Card.Description>{t('settings.signInMethods.description')}</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3">
            {methodsQuery.isLoading || meQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <LoadingMark size="sm" aria-label={t('common.loading')} />
              </div>
            ) : methodsQuery.isError || meQuery.isError || !methodsQuery.data || !meQuery.data ? (
              <ErrorState
                title={t('settings.signInMethods.loadError')}
                onRetry={() => {
                  void methodsQuery.refetch()
                  void meQuery.refetch()
                }}
              />
            ) : (
              <>
                {methodsQuery.data.methods.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {methodsQuery.data.methods.map((method) => (
                      <li key={method.provider} className="flex items-center justify-between">
                        <span className="text-body text-text-primary">
                          {t(`settings.signInMethods.method.${method.provider}`)}
                        </span>
                        <Badge tone="active">{t('settings.signInMethods.active')}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {settingPassword ? (
                  <VerifyAndSetPasswordForm
                    email={meQuery.data.user.email}
                    onBack={() => setSettingPassword(false)}
                    onSuccess={handlePasswordSet}
                  />
                ) : (
                  <>
                    {!hasPassword ? (
                      <Button type="button" variant="secondary" onClick={() => setSettingPassword(true)}>
                        {t('settings.signInMethods.setPassword')}
                      </Button>
                    ) : null}
                    {!activeProviders.has('Google') ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void startProviderLink('Google' satisfies LinkableProvider)}
                      >
                        {t('settings.signInMethods.linkGoogle')}
                      </Button>
                    ) : null}
                    {!activeProviders.has('Microsoft') ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void startProviderLink('Microsoft' satisfies LinkableProvider)}
                      >
                        {t('settings.signInMethods.linkMicrosoft')}
                      </Button>
                    ) : null}
                  </>
                )}
              </>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
