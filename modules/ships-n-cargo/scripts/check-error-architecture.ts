import { resolve } from 'node:path'
import { checkErrorArchitecture, formatErrorArchitectureDiagnostic } from './error-architecture'

const projectRoot = process.cwd()
const diagnostics = checkErrorArchitecture({
  configFile: resolve(projectRoot, 'tsconfig.json'),
  sourceRoot: resolve(projectRoot, 'src'),
  errorKernelFile: resolve(projectRoot, 'src/shared/errors/kernel.ts')
})

if (diagnostics.length > 0) {
  for (const diagnostic of diagnostics) {
    console.error(formatErrorArchitectureDiagnostic(diagnostic))
  }
  process.exitCode = 1
}
