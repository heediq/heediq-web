import { useEffect, useState } from 'react'
import { usePerceivedLoading } from '../usePerceivedLoading'
import { useOAuthCallbackGuard } from './useOAuthCallbackGuard'

export interface UseOAuthCallbackExchangeOptions {
  /** Performs the one-time code exchange + any follow-up side effects for a fresh callback. */
  run: () => Promise<void>
  /** Called once the exchange succeeds, or immediately for a duplicate invocation (D-113). */
  onDone: () => void
}

export interface UseOAuthCallbackExchangeResult {
  showLoading: boolean
  failed: boolean
}

/**
 * Shared by every OAuth callback page (D-123 — extract on second duplication). Centralizes the
 * perceived-loading debounce (D-122) together with the `failed` flag it gates on: `showLoading`
 * is `false` both while genuinely loading (before the delay elapses) and after a failure hides
 * it, so callers must never render an error state from `!showLoading` alone — only from `failed`.
 */
export function useOAuthCallbackExchange({
  run,
  onDone,
}: UseOAuthCallbackExchangeOptions): UseOAuthCallbackExchangeResult {
  const [failed, setFailed] = useState(false)
  const { isDuplicate } = useOAuthCallbackGuard()
  const showLoading = usePerceivedLoading(!failed, { delay: 150, minDuration: 600 })

  useEffect(() => {
    let cancelled = false

    if (isDuplicate) {
      onDone()
      return
    }

    run()
      .then(() => {
        if (!cancelled) onDone()
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDuplicate])

  return { showLoading, failed }
}
