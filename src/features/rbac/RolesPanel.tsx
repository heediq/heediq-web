import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateRoleRequest, Role, UpdateRoleRequest } from '@heediq/shared'
import { Badge, Button, ErrorState, Table, useToast } from '../../components/ui'
import { RoleForm, type RoleFormValues } from './RoleForm'
import { apiClient, ApiClientError } from '../../lib/api-client'

interface ListRolesResponse {
  roles: Role[]
}

export function RolesPanel() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined)

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<ListRolesResponse>('/roles'),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateRoleRequest) => apiClient.post<{ role: Role }>('/roles', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success(t('rolesSettings.roles.createSuccess'))
      setFormOpen(false)
    },
    onError: () => toast.error(t('rolesSettings.roles.saveError')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: UpdateRoleRequest }) =>
      apiClient.patch<{ role: Role }>(`/roles/${roleId}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success(t('rolesSettings.roles.updateSuccess'))
      setFormOpen(false)
      setEditingRole(undefined)
    },
    onError: () => toast.error(t('rolesSettings.roles.saveError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => apiClient.delete(`/roles/${roleId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success(t('rolesSettings.roles.deleteSuccess'))
    },
    onError: (err: unknown) => {
      if (err instanceof ApiClientError && err.code === 'CONFLICT') {
        toast.error(t('rolesSettings.roles.systemRoleDeleteError'))
        return
      }
      toast.error(t('rolesSettings.roles.deleteError'))
    },
  })

  function openCreate() {
    setEditingRole(undefined)
    setFormOpen(true)
  }

  function openEdit(role: Role) {
    setEditingRole(role)
    setFormOpen(true)
  }

  async function handleSubmit(values: RoleFormValues) {
    if (editingRole) {
      await updateMutation.mutateAsync({ roleId: editingRole.roleId, body: values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  function handleDelete(role: Role) {
    if (role.isSystemRole) return
    if (!window.confirm(t('rolesSettings.roles.deleteConfirm', { name: role.name }))) return
    deleteMutation.mutate(role.roleId)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>{t('rolesSettings.roles.createButton')}</Button>
      </div>

      {rolesQuery.isError ? (
        <ErrorState title={t('rolesSettings.roles.loadError')} onRetry={() => void rolesQuery.refetch()} />
      ) : (
        <Table
          columnCount={3}
          loading={rolesQuery.isLoading}
          empty={rolesQuery.data?.roles.length === 0}
          emptyContent={t('rolesSettings.roles.empty')}
        >
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t('rolesSettings.roles.columnName')}</Table.HeaderCell>
              <Table.HeaderCell>{t('rolesSettings.roles.columnPermissions')}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          {rolesQuery.data ? (
            <Table.Body>
              {rolesQuery.data.roles.map((role) => (
                <Table.Row key={role.roleId}>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      {role.name}
                      {role.isSystemRole ? <Badge tone="neutral">{role.name}</Badge> : null}
                    </div>
                  </Table.Cell>
                  <Table.Cell>{role.permissions.length}</Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={role.isSystemRole}
                        title={role.isSystemRole ? t('rolesSettings.roles.systemRoleUndeletable') : undefined}
                        onClick={() => handleDelete(role)}
                      >
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

      <RoleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editingRole}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
