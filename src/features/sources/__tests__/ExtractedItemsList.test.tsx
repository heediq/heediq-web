import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { ExtractedItem } from '@heediq/shared'
import { ExtractedItemsList } from '../ExtractedItemsList'

function item(overrides: Partial<ExtractedItem>): ExtractedItem {
  return {
    itemId: crypto.randomUUID(),
    sourceId: 's1',
    orgId: 'o1',
    category: 'requirements',
    text: 'Some statement',
    confidence: 0.9,
    status: 'proposed',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ExtractedItemsList', () => {
  it('groups items under a heading per category, in first-seen order', () => {
    render(
      <ExtractedItemsList
        items={[
          item({ category: 'requirements', text: 'Must export CSV' }),
          item({ category: 'decisions', text: 'Use DynamoDB' }),
          item({ category: 'requirements', text: 'Must be mobile-first' }),
        ]}
      />,
    )
    const headings = screen.getAllByRole('heading').map((h) => h.textContent)
    expect(headings).toEqual(['Requirements', 'Decisions'])
    const reqs = screen.getByRole('heading', { name: 'Requirements' }).parentElement!
    expect(within(reqs).getByText('Must export CSV')).toBeInTheDocument()
    expect(within(reqs).getByText('Must be mobile-first')).toBeInTheDocument()
  })

  it('renders provenance quote, confidence, and status badge', () => {
    render(
      <ExtractedItemsList
        items={[item({ text: 'Ship by Q3', sourceQuote: '“...ship by Q3...”', confidence: 0.82, status: 'kept' })]}
      />,
    )
    expect(screen.getByText('“...ship by Q3...”')).toBeInTheDocument()
    expect(screen.getByText('82% confidence')).toBeInTheDocument()
    expect(screen.getByText('Kept')).toBeInTheDocument()
  })

  it('omits the quote when there is no sourceQuote', () => {
    const { container } = render(<ExtractedItemsList items={[item({ sourceQuote: undefined })]} />)
    expect(container.querySelector('blockquote')).toBeNull()
  })
})
