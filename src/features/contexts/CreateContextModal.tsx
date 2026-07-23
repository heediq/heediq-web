import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DomainSchema, type Context, type CreateContextRequest, type Domain } from '@heediq/shared'
import { Button, Input, Modal, Select, useToast } from '../../components/ui'
import { apiClient } from '../../lib/api-client'
import { contextKeys, type ContextTreeNode, flattenContexts } from './contexts-api'

interface CreateContextModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The current tree, used to populate the optional parent-context picker. */
  tree: ContextTreeNode[]
  /** Preselect a parent (e.g. "add sub-context" from a selected node). */
  defaultParentId?: string
  /** Prefill the name (e.g. the classifier's proposed `newContextName` in the review wizard). */
  defaultName?: string
  /** Prefill the domain (e.g. the classifier's proposed domain). */
  defaultDomain?: Domain
  /** Called with the created context so the caller can select it. */
  onCreated?: (context: Context) => void
}

const NO_PARENT = '__none__'

export function CreateContextModal({
  open,
  onOpenChange,
  tree,
  defaultParentId,
  defaultName,
  defaultDomain,
  onCreated,
}: CreateContextModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [name, setName] = useState(defaultName ?? '')
  const [domain, setDomain] = useState<Domain>(defaultDomain ?? 'work')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<string>(defaultParentId ?? NO_PARENT)
  const [nameError, setNameError] = useState<string | undefined>(undefined)

  function reset() {
    setName(defaultName ?? '')
    setDomain(defaultDomain ?? 'work')
    setDescription('')
    setParentId(defaultParentId ?? NO_PARENT)
    setNameError(undefined)
  }

  const createMutation = useMutation({
    mutationFn: (body: CreateContextRequest) => apiClient.post<{ context: Context }>('/contexts', body),
    onSuccess: async ({ context }) => {
      await queryClient.invalidateQueries({ queryKey: contextKeys.all })
      toast.success(t('contextLibrary.form.createSuccess'))
      reset()
      onOpenChange(false)
      onCreated?.(context)
    },
    onError: () => toast.error(t('contextLibrary.form.createError')),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (createMutation.isPending) return
    if (!name.trim()) {
      setNameError(t('contextLibrary.form.nameRequired'))
      return
    }
    setNameError(undefined)
    createMutation.mutate({
      name: name.trim(),
      domain,
      ...(description.trim() && { description: description.trim() }),
      ...(parentId !== NO_PARENT && { parentContextId: parentId }),
    })
  }

  const domainOptions = DomainSchema.options.map((d) => ({ value: d, label: t(`domains.${d}`) }))
  const parentOptions = [
    { value: NO_PARENT, label: t('contextLibrary.form.parentNone') },
    ...flattenContexts(tree).map((n) => ({
      value: n.contextId,
      label: `${'— '.repeat(n.depth)}${n.name}`,
    })),
  ]

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <Modal.Header>
          <Modal.Title>{t('contextLibrary.form.createTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-4">
          <Input
            label={t('contextLibrary.form.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            autoFocus
          />
          <Select
            label={t('contextLibrary.form.domainLabel')}
            value={domain}
            onValueChange={(v) => setDomain(v as Domain)}
            options={domainOptions}
          />
          <Input
            label={t('contextLibrary.form.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label={t('contextLibrary.form.parentLabel')}
            value={parentId}
            onValueChange={setParentId}
            options={parentOptions}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            {t('common.create')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
