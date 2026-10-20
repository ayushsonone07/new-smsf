import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vitest runs the unit/component tests in a jsdom environment.
// CSS imports are stubbed (css: false) so styles never affect assertions.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
})
