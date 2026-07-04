import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../Button'

export interface ErrorStateProps {
  title: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({ title, description, onRetry, retryLabel }: ErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="size-8 text-danger" aria-hidden="true" />
      <p className="text-h2 text-text-primary">{title}</p>
      {description ? <p className="text-body text-text-secondary">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel ?? t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
