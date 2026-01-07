import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 🆕 CRITICAL - ensure relative paths work on any domain
  server: {
    host: '0.0.0.0', // Pozwól na dostęp z sieci lokalnej
    port: 5173,
    strictPort: true,
    cors:  true, // 🆕 Enable CORS in Vite dev server
    hmr: {
      protocol: 'ws', // 🆕 Use WebSocket (not wss)
      host: 'localhost'
    }
  },
  build: {
    sourcemap: true, // 🆕 Sourcemapy dla debugowania
    assetsDir: 'assets', // 🆕 Ensure assets are in /assets/
    rollupOptions: {
      output: {
        manualChunks:  undefined, // 🆕 Single bundle for better mobile performance
        // 🆕 Proper asset naming for consistent structure
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash]. js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
