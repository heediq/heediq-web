import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    // iOS Safari's non-standard property — no `beforeinstallprompt` there, so this is how an
    // already-installed iOS PWA reports itself.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export interface UseInstallPromptResult {
  canInstall: boolean
  installed: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

// Chromium fires `beforeinstallprompt` once, early, and only if the PWA installability criteria
// (manifest + service worker + HTTPS) are met — we capture and hold it so a UI affordance (the
// Settings "Install app" card) can trigger it later, on demand, instead of the browser's own timing.
export function useInstallPrompt(): UseInstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome
  }

  return { canInstall: deferredPrompt !== null, installed, promptInstall }
}
