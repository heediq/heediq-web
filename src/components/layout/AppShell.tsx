import type { ReactNode } from 'react'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
