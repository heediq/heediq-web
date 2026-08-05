/**
 * Shared date/time formatting. Compact by design so values fit narrow (mobile) table cells and
 * cards without wrapping — the sprawling default `toLocaleString()` ("8/4/2026, 8:06:33 PM") is a
 * key reason the Sources table overflowed on phones. Locale-aware via the browser's default locale
 * (`undefined`), consistent with the rest of the app.
 */
export function formatDateTime(value: string | number | Date): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Date only, compact ("Aug 4, 2026"). */
export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
