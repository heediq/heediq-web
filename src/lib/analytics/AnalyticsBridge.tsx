import { useCallback } from 'react'
import type { WsEventPayloadMap } from '@heediq/shared'
import { useWsEvent } from '../ws/useWsEvent'
import { track } from './analytics'

/**
 * Render-null, app-level bridge that turns backend-driven WS milestones into analytics events,
 * without coupling any one funnel to a specific screen. Feature components keep their own WS
 * reactions (query invalidation, streaming UI) — the WS layer fans one event out to every
 * subscriber (D-110), so this is purely additive. Mount inside `WsProvider`.
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
  useWsEvent(
    'chat_complete',
    useCallback(
      (payload: WsEventPayloadMap['chat_complete']) =>
        track('chat_response_received', { conversationId: payload.conversationId }),
      [],
    ),
  )
  useWsEvent(
    'ledger_ready',
    useCallback(
      (payload: WsEventPayloadMap['ledger_ready']) =>
        track('ledger_reconciled', { contextId: payload.contextId }),
      [],
    ),
  )
  return null
}
