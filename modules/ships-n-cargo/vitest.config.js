import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 96.34,
        branches: 91.92,
        functions: 100,
        lines: 95.89
      }
    }
  }
})
