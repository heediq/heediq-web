import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { Logo } from '../ui'
import { Can } from '../../lib/rbac/Can'
import { cn } from '../../lib/cn'
import { track } from '../../lib/analytics/analytics'
import { NAV_ITEMS, type NavItem } from './nav-items'

/**
 * The app header. Responsive by construction (D-152):
 * - **Mobile (<md):** wordmark only. Primary nav lives in the `BottomTabBar`; logout lives on the
 *   Settings page — so nothing here can collide with the wordmark the way the old single-row bar did.
 * - **md+:** the wordmark plus the full horizontal nav, rendered from the shared `NAV_ITEMS`.
 */
function DesktopNavLink({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={item.to}
      onClick={() => track('nav_item_clicked', { item: item.id, surface: 'top' })}
      className={({ isActive }) =>
        cn(
          'inline-flex h-8 items-center rounded-md px-3 text-caption font-medium',
          'transition-colors duration-base ease-brand hover:bg-surface-1',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
          isActive ? 'text-accent' : 'text-text-primary',
        )
      }
    >
      {t(item.labelKey)}
    </NavLink>
  )
}

export function TopBar() {
  const { t } = useTranslation()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
      <Link
        to="/sources"
        aria-label={t('nav.home')}
        className="flex items-center gap-2 text-h2 text-text-primary"
      >
        <Logo size="sm" />
        {t('home.title')}
      </Link>
      <nav aria-label={t('nav.primary')} className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map((item) =>
          item.permission ? (
            <Can key={item.id} permission={item.permission}>
              <DesktopNavLink item={item} />
            </Can>
          ) : (
            <DesktopNavLink key={item.id} item={item} />
          ),
        )}
      </nav>
    </header>
  )
}
