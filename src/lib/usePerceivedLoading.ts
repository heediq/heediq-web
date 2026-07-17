import { useEffect, useRef, useState } from 'react'

export interface UsePerceivedLoadingOptions {
  /** Don't show anything at all until the operation has been active this long (D-122). */
  delay?: number
  /** Once shown, stay visible at least this long even if the operation finishes sooner (D-122). */
  minDuration?: number
}

const DEFAULT_DELAY_MS = 150
const DEFAULT_MIN_DURATION_MS = 500

/**
 * Debounces a raw loading flag into a flicker-free one: nothing shows for operations
 * faster than `delay`, and anything that does show stays up for at least `minDuration`
 * so it always reads as a deliberate, smooth beat rather than a flash (D-122).
 */
export function usePerceivedLoading(
  isActive: boolean,
  { delay = DEFAULT_DELAY_MS, minDuration = DEFAULT_MIN_DURATION_MS }: UsePerceivedLoadingOptions = {}
): boolean {
  const [visible, setVisible] = useState(false)
  const shownAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (isActive) {
      if (shownAtRef.current !== null) return // already visible or about to be; nothing to do

      const showTimer = setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
      }, delay)

      return () => clearTimeout(showTimer)
    }

    if (shownAtRef.current === null) return // never showed (finished within the delay window)

    const elapsed = Date.now() - shownAtRef.current
    const remaining = Math.max(minDuration - elapsed, 0)

    const hideTimer = setTimeout(() => {
      shownAtRef.current = null
      setVisible(false)
    }, remaining)

    return () => clearTimeout(hideTimer)
  }, [isActive, delay, minDuration])

  return visible
}
