# PWA / Install Prompt

## Purpose
Installability baseline (D-119): the app is a real installable PWA (manifest + service worker),
plus a UI affordance to trigger the native install prompt on demand. Offline recording, queued
upload, and Wake Lock are explicit backlog items, not covered here.

## Key Files
- `useInstallPrompt.ts` — captures the browser's `beforeinstallprompt` event (Chromium fires it once,
  early, only when installability criteria are met) and exposes `canInstall` / `installed` /
  `promptInstall()` so a UI component can trigger it later instead of relying on the browser's own
  install banner timing.
- `../../routes/SettingsPage.tsx` — renders an "Install app" card using this hook (shown only when
  installable or already installed).
- `../../../vite.config.ts` — `vite-plugin-pwa` config: manifest (name, icons, theme/background
  color, `display: standalone`) + `generateSW` service worker.
- `../../../public/icons/` — the full icon set (favicons, apple-touch, android/maskable, mstile),
  copied from the workspace-root `icons/` folder. `public/favicon.ico` is the classic favicon copy.

## Data Flow / How It Works
1. Vite build runs `vite-plugin-pwa` (`generateSW` mode), which precaches the app shell
   (JS/CSS/HTML/icons/fonts) and emits `sw.js` + `manifest.webmanifest`; `registerType: 'autoUpdate'`
   auto-registers and updates the service worker with no user prompt.
2. On a supporting browser, once installability criteria are met, `beforeinstallprompt` fires;
   `useInstallPrompt` captures it (`event.preventDefault()` suppresses the browser's own mini-infobar)
   and flips `canInstall` to `true`.
3. The Settings "Install app" card calls `promptInstall()`, which replays the captured event's native
   `prompt()` and resolves once the user accepts/dismisses.
4. `appinstalled` (or already running in `display-mode: standalone` / iOS's `navigator.standalone`)
   flips `installed` to `true` and hides the button in favor of an "Installed" badge.

## Contracts
- No new API routes or DB shapes — this is entirely client-side/browser API surface.

## Dependencies
- Upstream: none (browser APIs only).
- Downstream: `SettingsPage.tsx` is the only consumer today.
- Shared surfaces: `public/icons/` is also referenced directly by `index.html`'s `<link>` tags for
  favicon/apple-touch-icon (outside the manifest).

## Testing
`useInstallPrompt.test.ts` dispatches synthetic `beforeinstallprompt`/`appinstalled` events and
asserts `canInstall`/`installed`/`promptInstall()` transitions. `matchMedia` is not implemented by
jsdom by default — `isStandalone()` guards with a `typeof` check rather than assuming it exists.

## Gotchas & Constraints
- **No runtime caching for API calls.** The service worker's `globPatterns` only precaches the app
  shell (`js,css,html,svg,png,ico,woff2`) — API responses (transcripts, recordings) are never cached,
  since they're per-org sensitive data that must always come from the network.
- **`beforeinstallprompt` fires once per page load and only on Chromium-based browsers.** Safari/iOS
  has no install prompt API at all — installation there is manual ("Add to Home Screen"), so
  `canInstall` stays `false` on iOS even when installation is possible; the Settings card simply
  won't show there today.
- If the event fires before `useInstallPrompt` mounts (unlikely in practice, since `SettingsPage` is
  not the entry route), it would be missed — this hook does not persist/replay a pre-mount event.
