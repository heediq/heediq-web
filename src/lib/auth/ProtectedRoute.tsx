import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { FullPageLoading } from '../../components/ui'
import { usePerceivedLoading } from '../usePerceivedLoading'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { status } = useAuth()
  // Keeps showing the loading screen (past the raw status resolving) until it's been up for a
  // full minDuration, and never shows it at all if the session check resolves under 150ms (D-122).
  const showLoading = usePerceivedLoading(status === 'loading', { delay: 150, minDuration: 600 })

  if (showLoading) {
    return <FullPageLoading aria-label={t('common.checkingSession')} />
  }

  if (status === 'anonymous') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
