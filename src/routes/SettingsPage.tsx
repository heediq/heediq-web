import { useTranslation } from 'react-i18next'
import { Button, Card } from '../components/ui'
import { startProviderLink } from '../lib/auth/cognito-oauth'
import type { LinkableProvider } from '../lib/auth/cognito-oauth'

export function SettingsPage() {
  const { t } = useTranslation()

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
            <Button
              type="button"
              variant="secondary"
              onClick={() => void startProviderLink('Google' satisfies LinkableProvider)}
            >
              {t('settings.signInMethods.linkGoogle')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void startProviderLink('Microsoft' satisfies LinkableProvider)}
            >
              {t('settings.signInMethods.linkMicrosoft')}
            </Button>
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
