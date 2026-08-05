import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime } from '../format'

// The point of these helpers is a *compact* rendering that fits mobile table cells/cards — so the
// contract we assert is compactness + input flexibility, not an exact locale string (which varies by
// the runner's locale/timezone).
describe('formatDateTime', () => {
  const iso = '2026-08-04T20:06:33.000Z'

  it('accepts an ISO string, a Date, and an epoch millis interchangeably', () => {
    const fromString = formatDateTime(iso)
    const fromDate = formatDateTime(new Date(iso))
    const fromMillis = formatDateTime(new Date(iso).getTime())
    expect(fromString).toBe(fromDate)
    expect(fromString).toBe(fromMillis)
    expect(fromString.length).toBeGreaterThan(0)
  })

  it('drops seconds (compact — no h:mm:ss)', () => {
    // Two colon-separated groups would be hh:mm:ss; the compact form keeps at most hh:mm.
    expect(/:\d{2}:\d{2}/.test(formatDateTime(iso))).toBe(false)
  })
})

describe('formatDate', () => {
  it('renders a date including the 4-digit year and no time', () => {
    const out = formatDate('2026-08-04T20:06:33.000Z')
    expect(out).toMatch(/2026/)
    expect(out).not.toMatch(/:/)
  })
})
