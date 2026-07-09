import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'

export interface ToastItem {
  id: string
  tone: 'success' | 'danger'
  message: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (tone: ToastItem['tone'], message: string) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (tone: ToastItem['tone'], message: string) => {
      const id = String(nextId.current++)
      setToasts((prev) => [...prev, { id, tone, message }])
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    },
    [dismissToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}

export function useToast(): { success: (message: string) => void; error: (message: string) => void } {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return {
    success: (message: string) => ctx.showToast('success', message),
    error: (message: string) => ctx.showToast('danger', message),
  }
}

function Toaster() {
  const ctx = useContext(ToastContext)
  const { t } = useTranslation()
  if (!ctx || ctx.toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {ctx.toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            'flex items-center gap-2 rounded-md border px-4 py-3 text-body shadow-lg',
            toast.tone === 'success'
              ? 'border-success-border bg-success-bg text-success'
              : 'border-danger-border bg-danger-bg text-danger'
          )}
        >
          {toast.tone === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label={t('common.dismiss')}
            onClick={() => ctx.dismissToast(toast.id)}
            className="ml-2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
