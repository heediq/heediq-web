import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PWA installability baseline (D-119). Precaches the app shell only — API responses (transcripts,
// recordings) are never cached by the service worker, since they're per-org sensitive data and must
// always come from the network. Offline recording / queued upload / Wake Lock stay backlog items.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Heediq',
        short_name: 'Heediq',
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
})
