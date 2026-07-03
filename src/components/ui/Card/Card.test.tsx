import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders composed subcomponents', () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Weekly sync</Card.Title>
          <Card.Description>Recorded 2026-07-01</Card.Description>
        </Card.Header>
        <Card.Content>Transcript ready</Card.Content>
      </Card>
    )
    expect(screen.getByRole('heading', { name: 'Weekly sync' })).toBeInTheDocument()
    expect(screen.getByText('Recorded 2026-07-01')).toBeInTheDocument()
    expect(screen.getByText('Transcript ready')).toBeInTheDocument()
  })
})
