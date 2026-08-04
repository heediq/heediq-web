import { Mic, Square } from 'lucide-react'
import { Button } from '../Button'

export type ListenButtonState = 'idle' | 'recording' | 'processing'

export interface ListenButtonProps {
  /** The three-state record control (`03-ui-kit.md` §4 / `04-loading-and-feedback.md` §4). */
  state: ListenButtonState
  /** Visible label for the current state (already resolved through `t()` by the caller). */
  label: string
  /** Accessible name for the current state — screen readers announce the state change (D-075). */
  'aria-label': string
  /** Fired on idle (→ start) and recording (→ stop); ignored while processing (button disabled). */
  onClick: () => void
  className?: string
}

/**
 * The canonical three-state record control (idle → recording → processing), built on the kit `Button`
 * so it inherits every Button state (hover/active/focus-visible/disabled/loading) and the shared motion
 * tokens rather than re-styling them. State drives the affordance:
 * - **idle** — primary Button + mic icon: "Start recording".
 * - **recording** — danger Button + a pulsing stop-square (pulse honors `prefers-reduced-motion`) and a
 *   live label (the caller feeds the elapsed timer into `label`): click to stop.
 * - **processing** — Button in its `loading` state (spinner + disabled), so the recording can't be
 *   double-submitted while it uploads.
 *
 * Copy is never hardcoded here (§1a): the caller passes `label` and `aria-label` per state via `t()`.
 */
export function ListenButton({
  state,
  label,
  'aria-label': ariaLabel,
  onClick,
  className,
}: ListenButtonProps) {
  if (state === 'processing') {
    return (
      <Button loading disabled aria-label={ariaLabel} className={className}>
        {label}
      </Button>
    )
  }

  if (state === 'recording') {
    return (
      <Button variant="danger" onClick={onClick} aria-label={ariaLabel} className={className}>
        <Square
          className="size-4 animate-pulse fill-current motion-reduce:animate-none"
          aria-hidden="true"
        />
        {label}
      </Button>
    )
  }

  return (
    <Button onClick={onClick} aria-label={ariaLabel} className={className}>
      <Mic className="size-4" aria-hidden="true" />
      {label}
    </Button>
  )
}
