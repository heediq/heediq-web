import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Can } from '../../lib/rbac/Can'
import { track } from '../../lib/analytics/analytics'
import { NAV_ITEMS, type NavItem } from './nav-items'

/**
 * Mobile primary navigation (D-152): a fixed bottom tab bar, shown only below `md`. On `md+` it's
 * hidden and the `TopBar` carries the same destinations. Renders from the shared `NAV_ITEMS` so the
 * two surfaces never drift. Tabs are full-height touch targets (≥44px, §7) with a visible active
 * state and a focus-visible ring; the bar pads for the iOS home indicator via `pb-safe`.
 */
function Tab({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={() => track('nav_item_clicked', { item: item.id, surface: 'bottom' })}
      className={({ isActive }) =>
        cn(
          'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 px-2 py-2',
          'text-caption transition-colors duration-base ease-brand',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
          isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
          <span className="leading-none">{t(item.labelKey)}</span>
        </>
      )}
    </NavLink>
  )
}

export function BottomTabBar() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('nav.primary')}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface-0/95 pb-safe backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map((item) =>
        item.permission ? (
          <Can key={item.id} permission={item.permission}>
            <Tab item={item} />
          </Can>
        ) : (
          <Tab key={item.id} item={item} />
        ),
      )}
    </nav>
  )
}
