import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 98.95,
        branches: 96.55,
        functions: 100,
        lines: 98.98
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
