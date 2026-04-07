import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Sprawdź czy certyfikaty istnieją
const certPath = path.resolve(__dirname, '../backend/certs/cert.pem')
const keyPath = path.resolve(__dirname, '../backend/certs/key.pem')
const certsExist = fs.existsSync(certPath) && fs.existsSync(keyPath)

if (!certsExist) {
  console.warn('⚠️  SSL certificates not found!')
  console.warn('   Run: cd backend && ./scripts/generate-certs.sh 192.168.2.38')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 🆕 CRITICAL - ensure relative paths work on any domain

  // RAM optimization: limit esbuild pre-bundling work
  optimizeDeps: {
    force: false,
    esbuildOptions: {
      target: 'es2020'
    }
  },

  server: {
    host: '0.0.0.0', // Pozwól na dostęp z sieci lokalnej
    port: 5173,
    strictPort: true,
    https: certsExist ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    } : undefined,
    cors:  true, // 🆕 Enable CORS in Vite dev server
    // RAM optimization: disable polling watcher
    watch: {
      usePolling: false
    },
    hmr: {
      protocol: certsExist ? 'wss' : 'ws', // 🆕 Use WebSocket Secure when HTTPS enabled
      host: 'localhost',
      overlay: true
    }
  },
  build: {
    target: 'es2020',
    sourcemap: true, // 🆕 Sourcemapy dla debugowania
    minify: 'esbuild',
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
