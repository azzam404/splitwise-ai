import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API calls in development so auth cookies stay same-origin.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
