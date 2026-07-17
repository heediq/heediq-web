import { LoadingMark } from '../LoadingMark'

export interface FullPageLoadingProps {
  'aria-label': string
}

export function FullPageLoading({ 'aria-label': ariaLabel }: FullPageLoadingProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingMark size="lg" aria-label={ariaLabel} />
    </div>
  )
}
