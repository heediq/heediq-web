import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Table } from './Table'

function SampleTable() {
  return (
    <Table columnCount={2}>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Name</Table.HeaderCell>
          <Table.HeaderCell>Role</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Ada</Table.Cell>
          <Table.Cell>Admin</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  )
}

describe('Table', () => {
  it('renders headers and rows', () => {
    render(<SampleTable />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders skeleton rows when loading, hiding real content', () => {
    render(
      <Table loading loadingRowCount={2} columnCount={2}>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Role</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()
  })

  it('renders the empty state content when empty', () => {
    render(
      <Table empty columnCount={2} emptyContent="No users yet">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Role</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>
    )
    expect(screen.getByText('No users yet')).toBeInTheDocument()
  })
})
