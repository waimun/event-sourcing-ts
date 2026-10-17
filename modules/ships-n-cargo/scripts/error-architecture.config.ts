import type { ErrorArchitectureConfig } from './check-error-architecture'

const config = {
  configFile: 'tsconfig.json',
  scopes: [
    {
      name: 'ships-n-cargo',
      sourceRoot: 'src',
      errorKernelFile: 'src/shared/errors/kernel.ts'
    }
  ]
} satisfies ErrorArchitectureConfig

export default config
