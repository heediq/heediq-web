import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'
import { RolesPanel } from '../features/rbac/RolesPanel'
import { GroupsPanel } from '../features/rbac/GroupsPanel'
import { UsersPanel } from '../features/rbac/UsersPanel'

type Tab = 'roles' | 'groups' | 'users'

export function RolesSettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('roles')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-h1">{t('rolesSettings.title')}</h1>

      <div role="tablist" className="flex gap-1 border-b border-border">
        {(['roles', 'groups', 'users'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'px-3 py-2 text-body font-medium border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              tab === value
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {t(`rolesSettings.tabs.${value}`)}
          </button>
        ))}
      </div>

      {tab === 'roles' ? <RolesPanel /> : tab === 'groups' ? <GroupsPanel /> : <UsersPanel />}
    </div>
  )
}
