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

// Vite automatycznie ustawia NODE_ENV=production podczas `vite build`
const isProduction = process.env.NODE_ENV === 'production'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // CRITICAL - ensure relative paths work on any domain

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
    cors: true, // Enable CORS in Vite dev server
    // RAM optimization: disable polling watcher
    watch: {
      usePolling: false
    },
    hmr: {
      protocol: certsExist ? 'wss' : 'ws', // Use WebSocket Secure when HTTPS enabled
      host: 'localhost',
      overlay: true
    }
  },
  build: {
    target: 'es2020',
    // OWASP A05: Sourcemaps wyłączone w produkcji — publicznie dostępne .map pliki
    // ujawniają oryginalny kod TypeScript atakującym.
    // W development sourcemaps są włączone dla wygody debugowania.
    // Jeśli potrzebujesz sourcemaps w produkcji (np. dla Sentry), uploaduj je
    // osobno podczas CI/CD zamiast serwować publicznie.
    sourcemap: !isProduction,
    minify: 'esbuild',
    assetsDir: 'assets', // Ensure assets are in /assets/
    rollupOptions: {
      output: {
        manualChunks(id) {
          // WAŻNE: React + ReactDOM + React Router muszą być w JEDNYM chunku
          // aby uniknąć circular dependency (forwardRef undefined)
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react'
          }
          // Mapy (leaflet) — duże, rzadko używane
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-maps'
          }
          // Excel/PDF — duże, tylko do eksportu
          if (id.includes('node_modules/xlsx') || id.includes('node_modules/exceljs')) {
            return 'vendor-excel'
          }
          if (
            id.includes('node_modules/pdf') ||
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/pdfmake')
          ) {
            return 'vendor-pdf'
          }
          // Pozostałe node_modules
          if (id.includes('node_modules/')) {
            return 'vendor-misc'
          }
          // App chunks — moduły biznesowe
          if (id.includes('/src/components/contracts/') || id.includes('/src/pages/contracts')) {
            return 'module-contracts'
          }
          if (
            id.includes('/src/components/bom/') ||
            id.includes('/src/components/admin/BOM') ||
            id.includes('/src/components/admin/bom')
          ) {
            return 'module-bom'
          }
          if (id.includes('/src/components/network') || id.includes('/src/components/topology')) {
            return 'module-network'
          }
          if (id.includes('/src/components/admin/')) {
            return 'module-admin'
          }
          if (id.includes('/src/components/reports/') || id.includes('/src/pages/reports')) {
            return 'module-reports'
          }
        },
        // Proper asset naming for consistent structure
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
})
