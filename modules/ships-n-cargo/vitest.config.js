import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 96.34,
        branches: 91.92,
        functions: 100,
        lines: 95.89
      }
    },
    projects: [
      {
        test: {
          name: 'unit',
          exclude: ['src/**/*.integration.test.ts'],
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts']
        }
      }
    ]
  }
})
