import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateGroupRequest, Group, Role, UpdateGroupRequest } from '@heediq/shared'
import { Button, ErrorState, Table, useToast } from '../../components/ui'
import { GroupForm, type GroupFormValues } from './GroupForm'
import { apiClient } from '../../lib/api-client'

interface ListGroupsResponse {
  groups: Group[]
}

interface ListRolesResponse {
  roles: Role[]
}

export function GroupsPanel() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined)

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiClient.get<ListGroupsResponse>('/groups'),
  })

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<ListRolesResponse>('/roles'),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateGroupRequest) => apiClient.post<{ group: Group }>('/groups', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success(t('rolesSettings.groups.createSuccess'))
      setFormOpen(false)
    },
    onError: () => toast.error(t('rolesSettings.groups.saveError')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ groupId, body }: { groupId: string; body: UpdateGroupRequest }) =>
      apiClient.patch<{ group: Group }>(`/groups/${groupId}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success(t('rolesSettings.groups.updateSuccess'))
      setFormOpen(false)
      setEditingGroup(undefined)
    },
    onError: () => toast.error(t('rolesSettings.groups.saveError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => apiClient.delete(`/groups/${groupId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success(t('rolesSettings.groups.deleteSuccess'))
    },
    onError: () => toast.error(t('rolesSettings.groups.deleteError')),
  })

  function openCreate() {
    setEditingGroup(undefined)
    setFormOpen(true)
  }

  function openEdit(group: Group) {
    setEditingGroup(group)
    setFormOpen(true)
  }

  async function handleSubmit(values: GroupFormValues) {
    if (editingGroup) {
      await updateMutation.mutateAsync({ groupId: editingGroup.groupId, body: values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  function handleDelete(group: Group) {
    if (!window.confirm(t('rolesSettings.groups.deleteConfirm', { name: group.name }))) return
    deleteMutation.mutate(group.groupId)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>{t('rolesSettings.groups.createButton')}</Button>
      </div>

      {groupsQuery.isError ? (
        <ErrorState title={t('rolesSettings.groups.loadError')} onRetry={() => void groupsQuery.refetch()} />
      ) : (
        <Table
          columnCount={3}
          loading={groupsQuery.isLoading}
          empty={groupsQuery.data?.groups.length === 0}
          emptyContent={t('rolesSettings.groups.empty')}
        >
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t('rolesSettings.groups.columnName')}</Table.HeaderCell>
              <Table.HeaderCell>{t('rolesSettings.groups.columnRoles')}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          {groupsQuery.data ? (
            <Table.Body>
              {groupsQuery.data.groups.map((group) => (
                <Table.Row key={group.groupId}>
                  <Table.Cell>{group.name}</Table.Cell>
                  <Table.Cell>{group.roleIds.length}</Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(group)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(group)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          ) : null}
        </Table>
      )}

      <GroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editingGroup}
        roles={rolesQuery.data?.roles ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
