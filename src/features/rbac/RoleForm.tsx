import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PERMISSIONS, type Permission, type Role } from '@heediq/shared'
import { Button, Checkbox, Input, Modal } from '../../components/ui'

export interface RoleFormValues {
  name: string
  permissions: Permission[]
}

interface RoleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role
  onSubmit: (values: RoleFormValues) => Promise<void>
  submitting: boolean
}

export function RoleForm({ open, onOpenChange, role, onSubmit, submitting }: RoleFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(role?.name ?? '')
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? [])
  const [nameError, setNameError] = useState<string | undefined>(undefined)

  function togglePermission(permission: Permission, checked: boolean) {
    setPermissions((prev) => (checked ? [...prev, permission] : prev.filter((p) => p !== permission)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError(t('rolesSettings.form.nameRequired'))
      return
    }
    setNameError(undefined)
    await onSubmit({ name: name.trim(), permissions })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <Modal.Header>
          <Modal.Title>
            {role ? t('rolesSettings.roles.editTitle') : t('rolesSettings.roles.createTitle')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          <Input
            label={t('rolesSettings.form.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            disabled={role?.isSystemRole}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-text-secondary">
              {t('rolesSettings.form.permissionsLabel')}
            </span>
            <div className="flex flex-col gap-2">
              {PERMISSIONS.map((permission) => (
                <Checkbox
                  key={permission}
                  label={t(`rolesSettings.permissions.${permission}`)}
                  checked={permissions.includes(permission)}
                  onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                  disabled={role?.isSystemRole}
                />
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting} disabled={role?.isSystemRole}>
            {role ? t('common.save') : t('common.create')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
