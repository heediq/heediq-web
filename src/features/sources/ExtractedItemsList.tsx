import { useTranslation } from 'react-i18next'
import type { ExtractedItem, ExtractedItemStatus } from '@heediq/shared'
import { Badge } from '../../components/ui'
import { groupByCategory } from './sources-api'

const STATUS_TONE: Record<ExtractedItemStatus, 'neutral' | 'active' | 'success'> = {
  proposed: 'active',
  kept: 'success',
  discarded: 'neutral',
}

interface ExtractedItemsListProps {
  items: ExtractedItem[]
}

export function ExtractedItemsList({ items }: ExtractedItemsListProps) {
  const { t } = useTranslation()
  const groups = groupByCategory(items)

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.category} className="flex flex-col gap-2">
          <h3 className="text-caption font-medium uppercase tracking-wide text-text-secondary">
            {t(`extractionCategories.${group.category}`)}
          </h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li
                key={item.itemId}
                className="flex flex-col gap-2 rounded-md border border-border bg-surface-1 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-body text-text-primary">{item.text}</p>
                  <Badge tone={STATUS_TONE[item.status]} size="sm" className="shrink-0">
                    {t(`extractedItemStatus.${item.status}`)}
                  </Badge>
                </div>
                {item.sourceQuote ? (
                  <blockquote className="border-l-2 border-border pl-3 text-caption italic text-text-secondary">
                    {item.sourceQuote}
                  </blockquote>
                ) : null}
                <span className="text-caption text-text-secondary">
                  {t('sourceDetail.confidence', { percent: Math.round(item.confidence * 100) })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
