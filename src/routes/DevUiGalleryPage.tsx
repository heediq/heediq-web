import { useState } from 'react'
import { Bell, Folder, FolderTree, Mic } from 'lucide-react'
import {
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  FullPageLoading,
  IdentityProviderButton,
  Input,
  LoadingMark,
  Logo,
  Modal,
  Progress,
  Select,
  Skeleton,
  Spinner,
  Stepper,
  Table,
  Tree,
} from '../components/ui'

export function DevUiGalleryPage() {
  const [checked, setChecked] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [role, setRole] = useState<string | undefined>(undefined)
  const [treeSelected, setTreeSelected] = useState<string | undefined>('proj-a')

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
        <h2 className="text-h2">Progress</h2>
        <div className="flex max-w-sm flex-col gap-3">
          <Progress value={30} aria-label="Upload 30%" />
          <Progress value={72} aria-label="Upload 72%" />
          <Progress value={100} tone="success" aria-label="Upload complete" />
          <Progress value={50} size="sm" aria-label="Thin progress" />
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
        <h2 className="text-h2">FullPageLoading</h2>
        <p className="text-caption text-text-secondary">
          Always min-h-screen; clipped here to fit the gallery.
        </p>
        <div className="relative h-64 overflow-hidden rounded-md border border-border">
          <FullPageLoading aria-label="Loading" />
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
        <h2 className="text-h2">Callout</h2>
        <div className="flex flex-col gap-3">
          <Callout tone="warning" title="This context has unsettled decisions">
            Fill the open entries below, or send anyway.
          </Callout>
          <Callout tone="info" title="Reconciling decisions…">
            We&apos;re rolling up decisions from this source.
          </Callout>
          <Callout tone="danger" title="Reconciliation failed">
            The ledger couldn&apos;t be built. Retry from the source.
          </Callout>
        </div>
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
          <Table columnCount={2}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Role</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row interactive role="button" tabIndex={0}>
                <Table.Cell>Ada Lovelace (interactive row)</Table.Cell>
                <Table.Cell>Admin</Table.Cell>
              </Table.Row>
              <Table.Row interactive role="button" tabIndex={0}>
                <Table.Cell>Alan Turing (interactive row)</Table.Cell>
                <Table.Cell>Member</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">EmptyState</h2>
        <Card>
          <EmptyState
            title="No contexts yet"
            description="Create your first context to start filing sources into it."
            icon={FolderTree}
            action={<Button>Create context</Button>}
          />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Skeleton</h2>
        <Card>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Stepper</h2>
        <Card>
          <Stepper
            aria-label="Example progress"
            current={1}
            steps={[
              { id: 'placement', label: 'Placement' },
              { id: 'items', label: 'Items' },
              { id: 'confirm', label: 'Confirm' },
            ]}
          />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Tree</h2>
        <Card>
          <Tree
            aria-label="Example context tree"
            selectedId={treeSelected}
            onSelect={setTreeSelected}
            defaultExpandedIds={['work']}
            nodes={[
              {
                id: 'work',
                label: 'Work',
                icon: FolderTree,
                children: [
                  { id: 'proj-a', label: 'Project Apollo', icon: Folder },
                  { id: 'proj-b', label: 'Project Beacon', icon: Folder },
                ],
              },
              { id: 'study', label: 'Study', icon: FolderTree },
            ]}
          />
        </Card>
      </section>
    </div>
  )
}
