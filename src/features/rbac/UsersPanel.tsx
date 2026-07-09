import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { Group, Role, User } from '@heediq/shared'
import { Button, ErrorState, Table } from '../../components/ui'
import { AssignmentsModal } from './AssignmentsModal'
import { apiClient } from '../../lib/api-client'

interface ListUsersResponse {
  users: User[]
}

interface ListRolesResponse {
  roles: Role[]
}

interface ListGroupsResponse {
  groups: Group[]
}

export function UsersPanel() {
  const { t } = useTranslation()
  const [assigningUser, setAssigningUser] = useState<User | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<ListUsersResponse>('/users'),
  })

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<ListRolesResponse>('/roles'),
  })

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiClient.get<ListGroupsResponse>('/groups'),
  })

  function openAssignments(user: User) {
    setAssigningUser(user)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {usersQuery.isError ? (
        <ErrorState title={t('rolesSettings.users.loadError')} onRetry={() => void usersQuery.refetch()} />
      ) : (
        <Table
          columnCount={3}
          loading={usersQuery.isLoading}
          empty={usersQuery.data?.users.length === 0}
          emptyContent={t('rolesSettings.users.empty')}
        >
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t('rolesSettings.users.columnEmail')}</Table.HeaderCell>
              <Table.HeaderCell>{t('rolesSettings.users.columnRole')}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          {usersQuery.data ? (
            <Table.Body>
              {usersQuery.data.users.map((user) => (
                <Table.Row key={user.userId}>
                  <Table.Cell>{user.email}</Table.Cell>
                  <Table.Cell>{user.role}</Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openAssignments(user)}>
                        {t('rolesSettings.users.manageButton')}
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          ) : null}
        </Table>
      )}

      <AssignmentsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        user={assigningUser}
        roles={rolesQuery.data?.roles ?? []}
        groups={groupsQuery.data?.groups ?? []}
      />
    </div>
  )
}
