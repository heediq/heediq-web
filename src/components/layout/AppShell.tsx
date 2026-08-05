import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { BottomTabBar } from './BottomTabBar'

/**
 * The chrome around every authenticated screen: `TopBar` on top, page content in the middle, and —
 * on mobile only — a fixed `BottomTabBar` (D-152). The `<main>` reserves bottom padding on mobile
 * (`pb-bottom-nav` = tab-bar height + safe-area inset) so nothing hides behind the fixed bar; on
 * `md+` the bar is gone and the padding drops away.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col pb-bottom-nav md:pb-0">{children}</main>
      <BottomTabBar />
    </div>
  )
}
