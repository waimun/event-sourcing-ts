import { resolve } from 'node:path'
import {
  checkErrorArchitecture,
  type ErrorArchitectureDiagnostic,
  formatErrorArchitectureDiagnostic
} from './error-architecture'
import errorArchitectureConfig from './error-architecture.config'

export interface ErrorArchitectureScope {
  name: string
  sourceRoot: string
  errorKernelFile: string
}

export interface ErrorArchitectureConfig {
  configFile: string
  scopes: readonly ErrorArchitectureScope[]
}

interface ErrorArchitectureLauncherOptions {
  projectRoot?: string
  check?: typeof checkErrorArchitecture
  format?: (diagnostic: ErrorArchitectureDiagnostic) => string
  report?: (diagnostic: string) => void
}

export const runErrorArchitecture = (
  config: ErrorArchitectureConfig,
  {
    projectRoot = process.cwd(),
    check = checkErrorArchitecture,
    format = formatErrorArchitectureDiagnostic,
    report = console.error
  }: ErrorArchitectureLauncherOptions = {}
): number => {
  if (config.scopes.length === 0) {
    throw new Error('Error architecture configuration must declare at least one source scope')
  }

  const configFile = resolve(projectRoot, config.configFile)
  const diagnostics = config.scopes.flatMap((scope) =>
    check({
      configFile,
      sourceRoot: resolve(projectRoot, scope.sourceRoot),
      errorKernelFile: resolve(projectRoot, scope.errorKernelFile)
    }).map((diagnostic) => `[${scope.name}] ${format(diagnostic)}`)
  )

  for (const diagnostic of diagnostics) {
    report(diagnostic)
  }

  return diagnostics.length === 0 ? 0 : 1
}

if (import.meta.main) {
  process.exitCode = runErrorArchitecture(errorArchitectureConfig)
}
