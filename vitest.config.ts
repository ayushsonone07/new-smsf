import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vitest runs the unit/component tests in a jsdom environment.
// CSS imports are stubbed (css: false) so styles never affect assertions.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@hrm': path.resolve(import.meta.dirname, './src/modules/hrm'),
      '@app': path.resolve(import.meta.dirname, './src/modules/hrm/app'),
      '@features': path.resolve(import.meta.dirname, './src/modules/hrm/features'),
      '@shared': path.resolve(import.meta.dirname, './src/modules/hrm/shared'),
      '@config': path.resolve(import.meta.dirname, './src/modules/hrm/config'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    // Fork workers intermittently time out on the Windows CI/dev environment
    // before test code starts. Reuse one thread worker for deterministic runs.
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
  },
})
