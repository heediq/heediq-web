import { useCallback } from 'react'
import type { WsEventPayloadMap } from '@heediq/shared'
import { useWsEvent } from '../ws/useWsEvent'
import { track } from './analytics'

/**
 * Render-null, app-level bridge that turns the `classification_ready` WS event (a Source finished
 * processing and is ready for review — the funnel's "source ready" milestone, D-151) into a single
 * `source_ready` analytics event, without coupling the funnel to any one screen. Feature components
 * keep their own `classification_ready` reactions (query invalidation) — the WS layer fans one event
 * out to every subscriber (D-110), so this is purely additive. Mount inside `WsProvider`.
 */
export function AnalyticsBridge() {
  useWsEvent(
    'classification_ready',
    useCallback(
      (payload: WsEventPayloadMap['classification_ready']) =>
        track('source_ready', { sourceId: payload.sourceId }),
      [],
    ),
  )
  return null
}
