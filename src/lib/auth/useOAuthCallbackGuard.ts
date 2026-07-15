import { useState } from 'react'

const STORAGE_PREFIX = 'heediq.oauth.consumed.'

/**
 * OAuth authorization codes are single-use. A callback page that exchanges one performs a
 * one-time side effect on mount, but the same URL can be reached more than once (reload,
 * browser back/forward, duplicate navigation) — replaying an already-consumed code always fails
 * even though the original attempt already succeeded server-side. This guard marks the code as
 * consumed in sessionStorage synchronously on first render, so a duplicate invocation can be
 * detected and skipped instead of replaying a doomed exchange (D-113 — root cause, not the
 * error it happened to surface as).
 */
export function useOAuthCallbackGuard(): { isDuplicate: boolean } {
  const [isDuplicate] = useState(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) return false

    const key = `${STORAGE_PREFIX}${code}`
    if (sessionStorage.getItem(key)) return true

    sessionStorage.setItem(key, '1')
    return false
  })

  return { isDuplicate }
}
