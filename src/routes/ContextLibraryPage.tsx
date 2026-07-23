import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Folder, Plus } from 'lucide-react'
import { Button, EmptyState, ErrorState, Skeleton, Tree, type TreeNode } from '../components/ui'
import { cn } from '../lib/cn'
import { CreateContextModal } from '../features/contexts/CreateContextModal'
import { ContextDetailPanel } from '../features/contexts/ContextDetailPanel'
import { useContextTree, type ContextTreeNode } from '../features/contexts/contexts-api'

function toTreeNodes(nodes: ContextTreeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    id: n.contextId,
    label: n.name,
    icon: Folder,
    ...(n.children.length && { children: toTreeNodes(n.children) }),
  }))
}

function findNode(nodes: ContextTreeNode[], id: string): ContextTreeNode | undefined {
  for (const n of nodes) {
    if (n.contextId === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return undefined
}

function rootIds(nodes: ContextTreeNode[]): string[] {
  return nodes.map((n) => n.contextId)
}

export function ContextLibraryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { contextId } = useParams<{ contextId: string }>()

  const [createOpen, setCreateOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined)

  const treeQuery = useContextTree()
  const tree = treeQuery.data?.tree ?? []
  const selectedNode = contextId ? findNode(tree, contextId) : undefined

  function selectContext(id: string) {
    navigate(`/contexts/${id}`)
  }

  function openCreate(parentId?: string) {
    setCreateParentId(parentId)
    setCreateOpen(true)
  }

  const treeSection = (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-display text-text-primary">{t('contextLibrary.title')}</h1>
        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="size-4" /> {t('contextLibrary.newContext')}
        </Button>
      </div>

      {treeQuery.isPending ? (
        <div className="flex flex-col gap-2" aria-label={t('common.loading')}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : treeQuery.isError ? (
        <ErrorState
          title={t('contextLibrary.loadError.title')}
          description={t('contextLibrary.loadError.description')}
          onRetry={() => void treeQuery.refetch()}
        />
      ) : tree.length === 0 ? (
        <EmptyState
          icon={Folder}
          title={t('contextLibrary.empty.title')}
          description={t('contextLibrary.empty.description')}
          action={<Button onClick={() => openCreate()}>{t('contextLibrary.empty.action')}</Button>}
        />
      ) : (
        <Tree
          aria-label={t('contextLibrary.treeLabel')}
          nodes={toTreeNodes(tree)}
          selectedId={contextId}
          onSelect={selectContext}
          defaultExpandedIds={rootIds(tree)}
        />
      )}
    </div>
  )

  const detailSection = contextId ? (
    <ContextDetailPanel
      key={contextId}
      contextId={contextId}
      node={selectedNode}
      onSelectContext={selectContext}
      onAddSubContext={(parentId) => openCreate(parentId)}
      onBack={() => navigate('/contexts')}
    />
  ) : (
    <div className="hidden h-full items-center justify-center md:flex">
      <EmptyState
        icon={Folder}
        title={t('contextLibrary.detail.none.title')}
        description={t('contextLibrary.detail.none.description')}
      />
    </div>
  )

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside
        className={cn(
          'border-border md:w-80 md:shrink-0 md:border-r',
          contextId ? 'hidden md:block' : 'block',
        )}
      >
        {treeSection}
      </aside>
      <section className={cn('min-w-0 flex-1', contextId ? 'block' : 'hidden md:block')}>
        {detailSection}
      </section>

      <CreateContextModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        tree={tree}
        defaultParentId={createParentId}
        onCreated={(context) => selectContext(context.contextId)}
      />
    </div>
  )
}
