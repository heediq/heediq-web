import { Bell, Mic } from 'lucide-react'
import { Badge, Button, Card, ErrorState, Input, LoadingMark, Spinner } from '../components/ui'

export function DevUiGalleryPage() {
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
    </div>
  )
}
