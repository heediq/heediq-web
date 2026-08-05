import type { LucideIcon } from 'lucide-react'
import { Inbox, Library, Settings } from 'lucide-react'
import type { Permission } from '@heediq/shared'

/** Stable analytics id for a nav destination (matches `nav_item_clicked`'s `item`, D-154). */
export type NavId = 'sources' | 'contexts' | 'settings'

export interface NavItem {
  id: NavId
  to: string
  /** i18n key for the label — never a literal string (§1a). */
  labelKey: string
  icon: LucideIcon
  /** When set, the item only renders for callers holding this permission (RBAC-gated via `Can`). */
  permission?: Permission
}

/**
 * The single source of truth for primary navigation. Both the desktop `TopBar` and the mobile
 * `BottomTabBar` render from this array, so the two nav surfaces can never drift. Logout is
 * deliberately NOT here — it lives on the Settings page (D-152), not the primary nav.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'sources', to: '/sources', labelKey: 'nav.sources', icon: Inbox },
  { id: 'contexts', to: '/contexts', labelKey: 'nav.contexts', icon: Library, permission: 'context:read' },
  { id: 'settings', to: '/settings', labelKey: 'nav.settings', icon: Settings },
]
