import { useEffect } from 'react'
import type { WsEventEnvelope } from '@heediq/shared'
import { useWsContext } from './WsProvider'

/**
 * Subscribes to one WS event `type` for the lifetime of the calling component. Features own their
 * own reaction (e.g. queryClient.invalidateQueries) instead of a central dispatcher enumerating
 * every feature's handling (D-110).
 */
export function useWsEvent<T extends WsEventEnvelope['type']>(
  type: T,
  handler: (payload: Extract<WsEventEnvelope, { type: T }>['payload']) => void,
): void {
  const { subscribe } = useWsContext()

  useEffect(() => {
    return subscribe(type, handler as (payload: unknown) => void)
  }, [type, handler, subscribe])
}
