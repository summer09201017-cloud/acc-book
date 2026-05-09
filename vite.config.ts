import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
