import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { WsEventEnvelopeSchema } from '@heediq/shared'
import { wsUrl } from '../api-client'
import { getIdToken } from '../auth/token-store'
import { useAuth } from '../auth/AuthContext'

// Untyped at this internal storage layer — useWsEvent.ts is the typed boundary callers use, so
// adding a WsEventPayloadMap entry never requires touching this provider.
type WsEventHandler = (payload: unknown) => void

interface WsContextValue {
  subscribe: (type: string, handler: WsEventHandler) => () => void
}

const WsContext = createContext<WsContextValue | null>(null)

const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30_000

export function WsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const listenersRef = useRef(new Map<string, Set<WsEventHandler>>())
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS)

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false

    function connect() {
      const token = getIdToken()
      if (!token) return

      const socket = new WebSocket(`${wsUrl()}?token=${encodeURIComponent(token)}`)
      socketRef.current = socket

      socket.onopen = () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS
      }

      socket.onmessage = (event) => {
        const parsed = WsEventEnvelopeSchema.safeParse(safeJsonParse(event.data))
        if (!parsed.success) return

        const handlers = listenersRef.current.get(parsed.data.type)
        handlers?.forEach((handler) => handler(parsed.data.payload))
      }

      socket.onclose = () => {
        socketRef.current = null
        if (cancelled) return

        reconnectTimerRef.current = setTimeout(connect, reconnectDelayRef.current)
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [status])

  const value = useMemo<WsContextValue>(
    () => ({
      subscribe: (type, handler) => {
        const handlers = listenersRef.current.get(type) ?? new Set()
        handlers.add(handler)
        listenersRef.current.set(type, handlers)

        return () => {
          handlers.delete(handler)
        }
      },
    }),
    [],
  )

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>
}

export function useWsContext(): WsContextValue {
  const ctx = useContext(WsContext)
  if (!ctx) throw new Error('useWsContext must be used within a WsProvider')
  return ctx
}

function safeJsonParse(raw: unknown): unknown {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
