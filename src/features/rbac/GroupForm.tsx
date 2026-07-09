import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Group, Role } from '@heediq/shared'
import { Button, Checkbox, Input, Modal } from '../../components/ui'

export interface GroupFormValues {
  name: string
  roleIds: string[]
}

interface GroupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: Group
  roles: Role[]
  onSubmit: (values: GroupFormValues) => Promise<void>
  submitting: boolean
}

export function GroupForm({ open, onOpenChange, group, roles, onSubmit, submitting }: GroupFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(group?.name ?? '')
  const [roleIds, setRoleIds] = useState<string[]>(group?.roleIds ?? [])
  const [nameError, setNameError] = useState<string | undefined>(undefined)

  function toggleRole(roleId: string, checked: boolean) {
    setRoleIds((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError(t('rolesSettings.form.nameRequired'))
      return
    }
    setNameError(undefined)
    await onSubmit({ name: name.trim(), roleIds })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <Modal.Header>
          <Modal.Title>
            {group ? t('rolesSettings.groups.editTitle') : t('rolesSettings.groups.createTitle')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          <Input
            label={t('rolesSettings.form.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-text-secondary">
              {t('rolesSettings.form.rolesLabel')}
            </span>
            <div className="flex flex-col gap-2">
              {roles.map((role) => (
                <Checkbox
                  key={role.roleId}
                  label={role.name}
                  checked={roleIds.includes(role.roleId)}
                  onCheckedChange={(checked) => toggleRole(role.roleId, checked === true)}
                />
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            {group ? t('common.save') : t('common.create')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
