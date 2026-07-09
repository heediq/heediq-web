import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateRoleAssignmentRequest, Group, Role, RoleAssignment, User } from '@heediq/shared'
import { Button, ErrorState, LoadingMark, Modal, Select, useToast } from '../../components/ui'
import { apiClient } from '../../lib/api-client'

interface AssignmentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User
  roles: Role[]
  groups: Group[]
}

interface ListRoleAssignmentsResponse {
  roleAssignments: RoleAssignment[]
}

function assignmentKey(assignment: RoleAssignment): string {
  return assignment.assignmentType === 'role' ? `role:${assignment.roleId}` : `group:${assignment.groupId}`
}

export function AssignmentsModal({ open, onOpenChange, user, roles, groups }: AssignmentsModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string | undefined>(undefined)

  const assignmentsQuery = useQuery({
    queryKey: ['roleAssignments', user?.userId],
    queryFn: () => apiClient.get<ListRoleAssignmentsResponse>(`/users/${user?.userId}/role-assignments`),
    enabled: open && !!user,
  })

  const assignMutation = useMutation({
    mutationFn: (body: CreateRoleAssignmentRequest) =>
      apiClient.post(`/users/${user?.userId}/role-assignments`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roleAssignments', user?.userId] })
      toast.success(t('rolesSettings.users.assignSuccess'))
      setSelected(undefined)
    },
    onError: () => toast.error(t('rolesSettings.users.assignError')),
  })

  const removeMutation = useMutation({
    mutationFn: (assignment: RoleAssignment) =>
      assignment.assignmentType === 'role'
        ? apiClient.delete(`/users/${user?.userId}/role-assignments/role/${assignment.roleId}`)
        : apiClient.delete(`/users/${user?.userId}/role-assignments/group/${assignment.groupId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roleAssignments', user?.userId] })
      toast.success(t('rolesSettings.users.removeSuccess'))
    },
    onError: () => toast.error(t('rolesSettings.users.removeError')),
  })

  const options = [
    ...roles.map((role) => ({ value: `role:${role.roleId}`, label: t('rolesSettings.users.roleOption', { name: role.name }) })),
    ...groups.map((group) => ({ value: `group:${group.groupId}`, label: t('rolesSettings.users.groupOption', { name: group.name }) })),
  ]

  function nameFor(assignment: RoleAssignment): string {
    if (assignment.assignmentType === 'role') {
      return roles.find((r) => r.roleId === assignment.roleId)?.name ?? assignment.roleId
    }
    return groups.find((g) => g.groupId === assignment.groupId)?.name ?? assignment.groupId
  }

  function handleAssign() {
    if (!selected) return
    const [kind, id] = selected.split(':')
    const body: CreateRoleAssignmentRequest =
      kind === 'role' ? { assignmentType: 'role', roleId: id! } : { assignmentType: 'group', groupId: id! }
    assignMutation.mutate(body)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Header>
        <Modal.Title>{t('rolesSettings.users.modalTitle', { email: user?.email ?? '' })}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        {assignmentsQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <LoadingMark size="sm" aria-label={t('common.loading')} />
          </div>
        ) : assignmentsQuery.isError ? (
          <ErrorState title={t('rolesSettings.users.loadAssignmentsError')} onRetry={() => void assignmentsQuery.refetch()} />
        ) : assignmentsQuery.data && assignmentsQuery.data.roleAssignments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {assignmentsQuery.data.roleAssignments.map((assignment) => (
              <li key={assignmentKey(assignment)} className="flex items-center justify-between">
                <span className="text-body text-text-primary">{nameFor(assignment)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={removeMutation.isPending && removeMutation.variables === assignment}
                  onClick={() => removeMutation.mutate(assignment)}
                >
                  {t('common.delete')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-text-secondary">{t('rolesSettings.users.noAssignments')}</p>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label={t('rolesSettings.users.assignLabel')}
              value={selected}
              onValueChange={setSelected}
              options={options}
              placeholder={t('rolesSettings.users.assignPlaceholder')}
            />
          </div>
          <Button type="button" disabled={!selected} loading={assignMutation.isPending} onClick={handleAssign}>
            {t('rolesSettings.users.assignButton')}
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
