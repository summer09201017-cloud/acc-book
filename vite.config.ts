import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Local-time build stamp (e.g. "2026-05-12 14:30"). Surfaced in Settings so
// users can verify the build their PWA is on — handy when a phone is stuck
// on a stale service worker.
const buildStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(buildStamp),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' surfaces an in-app banner so the user knows a refresh is
      // available; the previous 'autoUpdate' silently swapped the worker
      // and made it hard to tell why mobile clients kept seeing old UI.
      registerType: 'prompt',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        // Once the user accepts the prompt and the new SW activates, take
        // over any tabs immediately instead of waiting for the next nav.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // recharts pulls in d3-shape / d3-scale and is the biggest single
        // dep. Keep it in its own async chunk so the initial bundle stays
        // small; chart pages already lazy-load these components.
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
  server: {
    // Default to a port that almost never collides; if it is occupied,
    // Vite will auto-bump (strictPort=false). start.bat picks a free port
    // first and overrides via --port to keep its log/open URL accurate.
    port: 9999,
    strictPort: false,
  },
  preview: {
    port: 9998,
    strictPort: false,
  },
})
