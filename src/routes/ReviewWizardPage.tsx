import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import type { Context, ReviewApprovalRequest } from '@heediq/shared'
import { Badge, Button, Checkbox, EmptyState, ErrorState, Select, Skeleton, Stepper, useToast } from '../components/ui'
import { apiClient } from '../lib/api-client'
import { CreateContextModal } from '../features/contexts/CreateContextModal'
import { LedgerReconcileStep } from '../features/ledger/LedgerReconcileStep'
import { useContextTree, flattenContexts } from '../features/contexts/contexts-api'
import { useSource, useSourceItems, groupByCategory } from '../features/sources/sources-api'
import { track } from '../lib/analytics/analytics'

export function ReviewWizardPage() {
  const { sourceId = '' } = useParams<{ sourceId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const sourceQuery = useSource(sourceId)
  const itemsQuery = useSourceItems(sourceId)
  const treeQuery = useContextTree()

  const [step, setStep] = useState(0)
  const [contextId, setContextId] = useState<string | undefined>(undefined)
  const [discarded, setDiscarded] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)

  const proposal = sourceQuery.data?.source.proposedClassification

  // Funnel: the review wizard was opened for this Source (D-151). Once per Source.
  useEffect(() => {
    if (sourceId) track('review_opened', { sourceId })
  }, [sourceId])

  // Seed the placement from the classifier's proposed existing context, once.
  useEffect(() => {
    if (contextId === undefined && proposal?.proposedContextId) {
      setContextId(proposal.proposedContextId)
    }
  }, [contextId, proposal])

  const reviewMutation = useMutation({
    mutationFn: (body: ReviewApprovalRequest) =>
      apiClient.post<{ keptCount: number; discardedCount: number }>(`/sources/${sourceId}/review`, body),
    onSuccess: async (_data, variables) => {
      track('items_kept', {
        sourceId,
        contextId: variables.contextId,
        keptCount: variables.kept.length,
      })
      await queryClient.invalidateQueries({ queryKey: ['sources'] })
      await queryClient.invalidateQueries({ queryKey: ['contexts'] })
      toast.success(t('reviewWizard.success'))
      // Stay in the wizard and advance to reconciliation (D-137 step 3) instead of leaving.
      setStep(2)
    },
    onError: () => toast.error(t('reviewWizard.error')),
  })

  if (sourceQuery.isPending || itemsQuery.isPending || treeQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (sourceQuery.isError || itemsQuery.isError || treeQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <ErrorState
          title={t('reviewWizard.loadError.title')}
          description={t('reviewWizard.loadError.description')}
          onRetry={() => {
            void sourceQuery.refetch()
            void itemsQuery.refetch()
            void treeQuery.refetch()
          }}
        />
      </div>
    )
  }

  const source = sourceQuery.data.source
  const items = itemsQuery.data.items
  const tree = treeQuery.data.tree

  // Already filed — nothing to review. Only bail at the entry step: once we've filed and advanced to
  // reconciliation (step 2), the source flips to `approved` but we must stay in the wizard.
  if (source.classification === 'approved' && step === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <EmptyState
          title={t('reviewWizard.alreadyFiled.title')}
          description={t('reviewWizard.alreadyFiled.description')}
          action={
            <Button onClick={() => navigate(`/sources/${sourceId}`)}>
              {t('reviewWizard.alreadyFiled.action')}
            </Button>
          }
        />
      </div>
    )
  }

  const contextOptions = flattenContexts(tree).map((n) => ({
    value: n.contextId,
    label: `${'— '.repeat(n.depth)}${n.name}`,
  }))
  const keptIds = items.filter((i) => !discarded.has(i.itemId)).map((i) => i.itemId)
  const groups = groupByCategory(items)

  function toggleItem(itemId: string, keep: boolean) {
    setDiscarded((prev) => {
      const next = new Set(prev)
      if (keep) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const steps = [
    { id: 'placement', label: t('reviewWizard.steps.placement') },
    { id: 'items', label: t('reviewWizard.steps.items') },
    { id: 'ledger', label: t('reviewWizard.steps.ledger') },
  ]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(`/sources/${sourceId}`)}>
          <ArrowLeft className="size-4" /> {t('reviewWizard.cancel')}
        </Button>
        <h1 className="text-display text-text-primary">{t('reviewWizard.title', { title: source.title })}</h1>
        <Stepper aria-label={t('reviewWizard.progress')} steps={steps} current={step} />
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-body text-text-secondary">{t('reviewWizard.placement.intro')}</p>

          {proposal ? (
            <div className="flex flex-col gap-2 rounded-md border border-accent-border bg-accent-bg p-3">
              <span className="text-caption font-medium text-text-secondary">
                {t('reviewWizard.placement.suggestion')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="active">{t(`domains.${proposal.domain}`)}</Badge>
                <span className="text-body text-text-primary">
                  {proposal.newContextName ??
                    flattenContexts(tree).find((n) => n.contextId === proposal.proposedContextId)?.name ??
                    t('reviewWizard.placement.suggestionExisting')}
                </span>
              </div>
            </div>
          ) : null}

          <Select
            label={t('reviewWizard.placement.contextLabel')}
            value={contextId}
            onValueChange={setContextId}
            options={contextOptions}
            placeholder={t('reviewWizard.placement.contextPlaceholder')}
          />
          <Button variant="secondary" className="self-start" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> {t('reviewWizard.placement.createNew')}
          </Button>

          <div className="flex justify-end">
            <Button disabled={!contextId} onClick={() => setStep(1)}>
              {t('reviewWizard.next')}
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-body text-text-secondary">{t('reviewWizard.items.intro')}</p>

          {items.length === 0 ? (
            <EmptyState title={t('reviewWizard.items.empty.title')} description={t('reviewWizard.items.empty.description')} />
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <section key={group.category} className="flex flex-col gap-2">
                  <h3 className="text-caption font-medium uppercase tracking-wide text-text-secondary">
                    {t(`extractionCategories.${group.category}`)}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <li key={item.itemId} className="rounded-md border border-border bg-surface-1 p-3">
                        <Checkbox
                          label={item.text}
                          checked={!discarded.has(item.itemId)}
                          onCheckedChange={(checked) => toggleItem(item.itemId, checked === true)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ArrowLeft className="size-4" /> {t('reviewWizard.back')}
            </Button>
            <Button
              loading={reviewMutation.isPending}
              onClick={() => contextId && reviewMutation.mutate({ contextId, kept: keptIds })}
            >
              {t('reviewWizard.confirm', { count: keptIds.length })}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && contextId && (
        <LedgerReconcileStep
          contextId={contextId}
          sourceId={sourceId}
          onFinish={() => navigate(`/sources/${sourceId}`)}
        />
      )}

      <CreateContextModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        tree={tree}
        defaultName={proposal?.newContextName}
        defaultDomain={proposal?.domain}
        onCreated={(context: Context) => setContextId(context.contextId)}
      />
    </div>
  )
}
