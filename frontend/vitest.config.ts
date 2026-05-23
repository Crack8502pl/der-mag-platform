import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Zbieramy coverage tylko z plików posiadających testy jednostkowe.
      // Komponenty React, hooki i serwisy API wymagają środowiska z mockami
      // i będą objęte testami w dedykowanych zadaniach.
      include: [
        'src/utils/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/utils/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
})
