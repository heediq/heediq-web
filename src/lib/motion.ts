import type { Transition, Variants } from 'framer-motion'

/**
 * Shared motion tokens & variants (D-117). One convention for the whole app:
 * fade + a small axis shift, never a bare opacity-only fade and never a
 * rotation/scale flourish. Durations/easing live here so every transition
 * feels like the same system.
 */

export const motionDuration = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
} as const

export const motionEase = [0.16, 1, 0.3, 1] as const

export const transition: Transition = {
  duration: motionDuration.base,
  ease: motionEase,
}

export const fastTransition: Transition = {
  duration: motionDuration.fast,
  ease: motionEase,
}

/** Page-level transition: fade + small upward drift. Used by AnimatedRoutes. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/** Generic appear/disappear for cards, panels, list items — fade + y shift. */
export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

/** For elements shifting in from the side (step wizards, drawers). */
export const fadeXVariants: Variants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
}

/** Overlay-only fade (modal backdrop, scrims) — no axis shift. */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

/** Modal/dialog content: fade + slight scale, no axis shift. */
export const scaleFadeVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
}

/** Toast entrance: slide up + fade, matching the fadeUp convention. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
}
