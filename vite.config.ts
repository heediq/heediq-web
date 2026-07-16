import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Distinguishes installed PWAs across environments (D-121) — mirrors D-039's non-prod-subdomain-
// prefix convention. `VITE_APP_ENV` is injected per environment in deploy.yml's Build step
// (dev/staging/production); unset locally, so `pnpm dev`/local builds never look like prod.
function appNameFor(appEnv: string | undefined): string {
  switch (appEnv) {
    case 'production':
      return 'Heediq'
    case 'staging':
      return 'Heediq (Staging)'
    case 'dev':
      return 'Heediq (Dev)'
    default:
      return 'Heediq (Local)'
  }
}

// PWA installability baseline (D-119). Precaches the app shell only — API responses (transcripts,
// recordings) are never cached by the service worker, since they're per-org sensitive data and must
// always come from the network. Offline recording / queued upload / Wake Lock stay backlog items.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const appName = appNameFor(env.VITE_APP_ENV)

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: appName,
          short_name: appName,
          description: 'Record, transcribe, and extract requirements from your meetings.',
          start_url: '/',
          display: 'standalone',
          background_color: '#1A1816',
          theme_color: '#1A1816',
          icons: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App-shell precache only (JS/CSS/HTML/fonts/icons) — no runtime caching rule is added for
          // API calls, so every fetch to the backend always hits the network (D-119).
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  }
})
