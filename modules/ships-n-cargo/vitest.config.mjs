import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dir: 'src',
    coverage: {
      enabled: true,
      include: ['src/**/*.ts']
    }
  }
})
