import { useTranslation } from 'react-i18next'
import type { DecisionLedgerEntry } from '@heediq/shared'
import { Badge } from '../../components/ui'

// Status → tone. No dedicated warning token (D-072), so `needs_review` (attention) uses the amber
// `active` tone — the same "in-progress/attention" treatment used elsewhere; `open` is neutral.
const statusTone: Record<DecisionLedgerEntry['status'], 'success' | 'active' | 'neutral'> = {
  confirmed: 'success',
  needs_review: 'active',
  open: 'neutral',
}

export function LedgerStatusBadge({ status }: { status: DecisionLedgerEntry['status'] }) {
  const { t } = useTranslation()
  return <Badge tone={statusTone[status]} size="sm">{t(`ledger.status.${status}`)}</Badge>
}
