import { useParams } from 'react-router-dom'

export function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-body text-text-secondary">Source detail ({sourceId}) — coming next.</p>
    </div>
  )
}
