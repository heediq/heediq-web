import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Logo } from '../ui'
import { useAuth } from '../../lib/auth/AuthContext'

export function TopBar() {
  const { t } = useTranslation()
  const { logout } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <Link to="/sources" className="flex items-center gap-2 text-h2 text-text-primary">
        <Logo size="sm" />
        {t('home.title')}
      </Link>
      <nav className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings">{t('nav.settings')}</Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={logout}>
          {t('nav.logout')}
        </Button>
      </nav>
    </header>
  )
}
