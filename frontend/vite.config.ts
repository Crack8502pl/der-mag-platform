import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Pozwól na dostęp z sieci lokalnej
    port: 5173,
    strictPort: true
  },
  build: {
    sourcemap: true // 🆕 Sourcemapy dla debugowania
  }
})
