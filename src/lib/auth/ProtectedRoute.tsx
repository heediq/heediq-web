import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { LoadingMark } from '../../components/ui'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingMark size="lg" aria-label={t('common.checkingSession')} />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
