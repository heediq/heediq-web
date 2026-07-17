import { useCallback, useRef, useState } from 'react'
import { usePerceivedLoading } from './usePerceivedLoading'

/**
 * Standard double-submit guard for any async trigger (button click, form submit).
 * `pendingRef` blocks a re-entrant call synchronously (before React re-renders the
 * disabled UI), while `pending` drives the visible loading state (Button's `loading` prop).
 *
 * `pending` is debounced through `usePerceivedLoading` (D-122) so a sub-150ms action never
 * flashes a spinner, and once shown it stays visible at least 500ms — the double-submit guard
 * itself (`pendingRef`) is unaffected and still blocks a re-entrant call immediately.
 */
export function useAsyncAction<Args extends unknown[]>(action: (...args: Args) => Promise<void>) {
  const [rawPending, setRawPending] = useState(false)
  const pendingRef = useRef(false)
  const pending = usePerceivedLoading(rawPending, { delay: 150, minDuration: 500 })

  const run = useCallback(
    async (...args: Args) => {
      if (pendingRef.current) return
      pendingRef.current = true
      setRawPending(true)
      try {
        await action(...args)
      } finally {
        pendingRef.current = false
        setRawPending(false)
      }
    },
    [action]
  )

  return { run, pending }
}
