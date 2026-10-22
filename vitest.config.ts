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
    // Fork workers intermittently time out on the Windows CI/dev environment
    // before test code starts. Reuse one thread worker for deterministic runs.
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
  },
})
