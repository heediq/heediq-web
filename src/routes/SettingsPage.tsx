import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ListAuthMethodsResponse } from '@heediq/shared'
import { Badge, Button, Card, ErrorState, LoadingMark } from '../components/ui'
import { PageContainer, PageHeader } from '../components/layout'
import { VerifyAndSetPasswordForm } from '../features/auth/VerifyAndSetPasswordForm'
import { startProviderLink } from '../lib/auth/cognito-oauth'
import type { LinkableProvider } from '../lib/auth/cognito-oauth'
import { apiClient } from '../lib/api-client'
import type { GetMeResponse } from '../lib/rbac/types'
import { Can } from '../lib/rbac/Can'
import { useAuth } from '../lib/auth/AuthContext'
import { useInstallPrompt } from '../lib/pwa/useInstallPrompt'
import { track } from '../lib/analytics/analytics'
import { fadeUpVariants, fadeXVariants, transition } from '../lib/motion'

export function SettingsPage() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const queryClient = useQueryClient()
  const [settingPassword, setSettingPassword] = useState(false)
  const { canInstall, installed, promptInstall } = useInstallPrompt()

  useEffect(() => {
    track('settings_opened', {})
  }, [])

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<GetMeResponse>('/me'),
  })
  const methodsQuery = useQuery({
    queryKey: ['authMethods'],
    queryFn: () => apiClient.get<ListAuthMethodsResponse>('/auth/methods'),
  })

  const reduceMotion = useReducedMotion()

  const activeProviders = new Set(methodsQuery.data?.methods.map((m) => m.provider) ?? [])
  const hasPassword = activeProviders.has('COGNITO')

  const signInMethodsPhase =
    methodsQuery.isLoading || meQuery.isLoading
      ? 'loading'
      : methodsQuery.isError || meQuery.isError || !methodsQuery.data || !meQuery.data
        ? 'error'
        : 'content'

  async function handlePasswordSet() {
    setSettingPassword(false)
    await queryClient.invalidateQueries({ queryKey: ['authMethods'] })
  }

  return (
    <PageContainer size="prose" gap={4}>
      <PageHeader title={t('settings.title')} />

      <Card>
        <Card.Header>
          <Card.Title>{t('settings.signInMethods.title')}</Card.Title>
          <Card.Description>{t('settings.signInMethods.description')}</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={signInMethodsPhase}
              layout={!reduceMotion}
              variants={reduceMotion ? undefined : fadeUpVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-3"
            >
              {signInMethodsPhase === 'loading' ? (
                <div className="flex justify-center py-4">
                  <LoadingMark size="sm" aria-label={t('common.loading')} />
                </div>
              ) : signInMethodsPhase === 'error' ? (
                <ErrorState
                  title={t('settings.signInMethods.loadError')}
                  onRetry={() => {
                    void methodsQuery.refetch()
                    void meQuery.refetch()
                  }}
                />
              ) : (
                <>
                  {methodsQuery.data && methodsQuery.data.methods.length > 0 ? (
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

                  <AnimatePresence mode="wait" initial={false}>
                    {settingPassword && meQuery.data ? (
                      <motion.div
                        key="set-password"
                        layout={!reduceMotion}
                        variants={reduceMotion ? undefined : fadeXVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={transition}
                      >
                        <VerifyAndSetPasswordForm
                          email={meQuery.data.user.email}
                          onBack={() => setSettingPassword(false)}
                          onSuccess={handlePasswordSet}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="method-actions"
                        layout={!reduceMotion}
                        variants={reduceMotion ? undefined : fadeXVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={transition}
                        className="flex flex-col gap-3"
                      >
                        {!hasPassword ? (
                          <Button type="button" variant="secondary" onClick={() => setSettingPassword(true)}>
                            {t('settings.signInMethods.setPassword')}
                          </Button>
                        ) : null}
                        {!activeProviders.has('Google') ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              track('provider_link_started', { provider: 'google' })
                              void startProviderLink('Google' satisfies LinkableProvider)
                            }}
                          >
                            {t('settings.signInMethods.linkGoogle')}
                          </Button>
                        ) : null}
                        {!activeProviders.has('Microsoft') ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              track('provider_link_started', { provider: 'microsoft' })
                              void startProviderLink('Microsoft' satisfies LinkableProvider)
                            }}
                          >
                            {t('settings.signInMethods.linkMicrosoft')}
                          </Button>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </Card.Content>
      </Card>

      {canInstall || installed ? (
        <Card>
          <Card.Header>
            <Card.Title>{t('settings.install.title')}</Card.Title>
            <Card.Description>{t('settings.install.description')}</Card.Description>
          </Card.Header>
          <Card.Content>
            {installed ? (
              <Badge tone="active">{t('settings.install.installed')}</Badge>
            ) : (
              <Button type="button" variant="secondary" onClick={() => void promptInstall()}>
                {t('settings.install.action')}
              </Button>
            )}
          </Card.Content>
        </Card>
      ) : null}

      <Can permission="org:manage-roles">
        <Card>
          <Card.Header>
            <Card.Title>{t('nav.roles')}</Card.Title>
          </Card.Header>
          <Card.Content>
            <Button asChild variant="secondary">
              <Link to="/settings/roles">{t('nav.roles')}</Link>
            </Button>
          </Card.Content>
        </Card>
      </Can>

      <Can permission="audit:read">
        <Card>
          <Card.Header>
            <Card.Title>{t('nav.auditLog')}</Card.Title>
          </Card.Header>
          <Card.Content>
            <Button asChild variant="secondary">
              <Link to="/org/audit-log">{t('nav.auditLog')}</Link>
            </Button>
          </Card.Content>
        </Card>
      </Can>

      <Card>
        <Card.Header>
          <Card.Title>{t('settings.account.title')}</Card.Title>
          <Card.Description>{t('settings.account.description')}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              track('logout_clicked', {})
              logout()
            }}
          >
            {t('settings.account.logout')}
          </Button>
        </Card.Content>
      </Card>
    </PageContainer>
  )
}
