import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Callout } from './Callout'

describe('Callout', () => {
  it('renders a title and children with a status role', () => {
    render(
      <Callout tone="warning" title="Unsettled decisions">
        <span>fill them in</span>
      </Callout>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Unsettled decisions')).toBeInTheDocument()
    expect(screen.getByText('fill them in')).toBeInTheDocument()
  })

  it('renders a default icon per tone and hides it from assistive tech', () => {
    const { container } = render(<Callout tone="danger" title="Failed" />)
    const icon = container.querySelector('svg')
    expect(icon).toBeTruthy()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('omits the icon when icon={null}', () => {
    const { container } = render(<Callout tone="info" title="Note" icon={null} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
