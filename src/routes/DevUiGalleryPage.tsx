import { useState } from 'react'
import { Bell, Mic } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ErrorState,
  IdentityProviderButton,
  Input,
  LoadingMark,
  Logo,
  Modal,
  Select,
  Spinner,
  Table,
} from '../components/ui'

export function DevUiGalleryPage() {
  const [checked, setChecked] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [role, setRole] = useState<string | undefined>(undefined)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <h1 className="text-display">UI kit gallery</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">
            <Mic className="size-4" /> Small
          </Button>
          <Button size="lg">
            <Bell className="size-5" /> Large
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Logo</h2>
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <Logo size="md" />
          <Logo size="lg" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Spinner</h2>
        <div className="flex items-center gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Card</h2>
        <Card>
          <Card.Header>
            <Card.Title>Weekly sync — Jul 2</Card.Title>
            <Card.Description>42 min · transcribed</Card.Description>
          </Card.Header>
          <Card.Content>3 requirements, 2 open questions extracted.</Card.Content>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Badge</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">queued</Badge>
          <Badge tone="active">transcribing</Badge>
          <Badge tone="success">done</Badge>
          <Badge tone="danger">failed</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">LoadingMark</h2>
        <div className="flex flex-wrap items-center gap-8">
          <LoadingMark size="lg" tone="gradient" aria-label="Loading sources" />
          <LoadingMark size="sm" aria-label="Loading" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Input</h2>
        <div className="flex max-w-sm flex-col gap-4">
          <Input label="Email" placeholder="you@company.com" />
          <Input label="Email" hint="We'll never share this" />
          <Input label="Email" error="Enter a valid email address" defaultValue="not-an-email" />
          <Input label="Email" disabled defaultValue="disabled@company.com" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">ErrorState</h2>
        <ErrorState
          title="Could not sign you in"
          description="Something went wrong exchanging your login. Try again."
          onRetry={() => {}}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Checkbox</h2>
        <div className="flex flex-col gap-2">
          <Checkbox label="sources:read" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
          <Checkbox label="sources:write" />
          <Checkbox label="org:manage-roles" disabled />
          <Checkbox label="audit:read" disabled checked />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Select</h2>
        <div className="max-w-sm">
          <Select
            label="Role"
            placeholder="Choose a role"
            value={role}
            onValueChange={setRole}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'member', label: 'Member' },
            ]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Modal open={modalOpen} onOpenChange={setModalOpen}>
          <Modal.Header>
            <Modal.Title>Assign role</Modal.Title>
            <Modal.Description>Pick a role for this user.</Modal.Description>
          </Modal.Header>
          <Modal.Body>Modal body content.</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </Modal.Footer>
        </Modal>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">IdentityProviderButton</h2>
        <div className="flex max-w-sm flex-col gap-2">
          <IdentityProviderButton provider="Google" onClick={() => {}} />
          <IdentityProviderButton provider="Microsoft" onClick={() => {}} />
          <IdentityProviderButton provider="Google" loading onClick={() => {}} />
          <IdentityProviderButton provider="Microsoft" disabled onClick={() => {}} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Table</h2>
        <div className="flex flex-col gap-4">
          <Table columnCount={2}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Role</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row>
                <Table.Cell>Ada Lovelace</Table.Cell>
                <Table.Cell>Admin</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Alan Turing</Table.Cell>
                <Table.Cell>Member</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
          <Table columnCount={2} loading loadingRowCount={2}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Role</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
          </Table>
          <Table columnCount={2} empty emptyContent="No users yet">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Role</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
          </Table>
        </div>
      </section>
    </div>
  )
}
