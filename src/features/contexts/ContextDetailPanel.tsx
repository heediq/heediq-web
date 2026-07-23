import { useTranslation } from 'react-i18next'
import { ArrowLeft, FolderPlus } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../../components/ui'
import { useContextDetail, type ContextTreeNode } from './contexts-api'

interface ContextDetailPanelProps {
  contextId: string
  /** The selected node from the tree, used for its child list (the tree is the child source of truth). */
  node?: ContextTreeNode
  onSelectContext: (id: string) => void
  onAddSubContext: (parentId: string) => void
  /** Mobile-only back affordance (hidden on md+ where the tree is always visible). */
  onBack: () => void
}

export function ContextDetailPanel({
  contextId,
  node,
  onSelectContext,
  onAddSubContext,
  onBack,
}: ContextDetailPanelProps) {
  const { t } = useTranslation()
  const query = useContextDetail(contextId)

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('contextLibrary.detail.loadError.title')}
        description={t('contextLibrary.detail.loadError.description')}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const context = query.data.context
  const children = node?.children ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="self-start md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" /> {t('contextLibrary.detail.back')}
        </Button>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-display text-text-primary">{context.name}</h2>
          <Button size="sm" variant="secondary" onClick={() => onAddSubContext(context.contextId)}>
            <FolderPlus className="size-4" /> {t('contextLibrary.detail.addSubContext')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="active">{t(`domains.${context.domain}`)}</Badge>
          <Badge tone="neutral">{t(`contextVisibility.${context.visibility}`)}</Badge>
          {context.status === 'archived' ? (
            <Badge tone="neutral">{t('contextStatus.archived')}</Badge>
          ) : null}
        </div>
      </div>

      {context.description ? (
        <p className="text-body text-text-secondary">{context.description}</p>
      ) : null}

      <dl className="flex flex-col gap-1 text-caption">
        <div className="flex gap-2">
          <dt className="text-text-secondary">{t('contextLibrary.detail.createdLabel')}</dt>
          <dd className="text-text-primary">{new Date(context.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className="text-caption font-medium text-text-secondary">
          {t('contextLibrary.detail.subContexts')}
        </h3>
        {children.length ? (
          <ul className="flex flex-col gap-1">
            {children.map((child) => (
              <li key={child.contextId}>
                <button
                  type="button"
                  onClick={() => onSelectContext(child.contextId)}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-body text-text-secondary transition-colors duration-fast ease-brand hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {child.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('contextLibrary.detail.noSubContexts')} />
        )}
      </div>
    </div>
  )
}
