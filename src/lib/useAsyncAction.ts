import { useCallback, useRef, useState } from 'react'

/**
 * Standard double-submit guard for any async trigger (button click, form submit).
 * `pendingRef` blocks a re-entrant call synchronously (before React re-renders the
 * disabled UI), while `pending` drives the visible loading state (Button's `loading` prop).
 */
export function useAsyncAction<Args extends unknown[]>(action: (...args: Args) => Promise<void>) {
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  const run = useCallback(
    async (...args: Args) => {
      if (pendingRef.current) return
      pendingRef.current = true
      setPending(true)
      try {
        await action(...args)
      } finally {
        pendingRef.current = false
        setPending(false)
      }
    },
    [action]
  )

  return { run, pending }
}
