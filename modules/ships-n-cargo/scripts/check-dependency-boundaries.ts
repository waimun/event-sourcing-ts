import { resolve } from 'node:path'
import {
  checkDependencyBoundaries,
  type DependencyBoundary,
  type DependencyBoundaryDiagnostic,
  formatDependencyBoundaryDiagnostic
} from './dependency-boundaries'
import dependencyBoundariesConfig from './dependency-boundaries.config'

export interface BoundedContextDependencyConfig {
  name: string
  sourceRoot: string
  boundaries: readonly DependencyBoundary[]
}

export interface DependencyBoundariesConfig {
  configFile: string
  boundedContexts: readonly BoundedContextDependencyConfig[]
}

interface DependencyBoundariesLauncherOptions {
  projectRoot?: string
  check?: typeof checkDependencyBoundaries
  format?: (diagnostic: DependencyBoundaryDiagnostic) => string
  report?: (diagnostic: string) => void
}

export const runDependencyBoundaries = (
  config: DependencyBoundariesConfig,
  {
    projectRoot = process.cwd(),
    check = checkDependencyBoundaries,
    format = formatDependencyBoundaryDiagnostic,
    report = console.error
  }: DependencyBoundariesLauncherOptions = {}
): number => {
  if (config.boundedContexts.length === 0) {
    throw new Error('Dependency boundaries configuration must declare at least one bounded context')
  }

  const configFile = resolve(projectRoot, config.configFile)
  const diagnostics = config.boundedContexts.flatMap((context) =>
    check({
      configFile,
      sourceRoot: resolve(projectRoot, context.sourceRoot),
      boundaries: context.boundaries
    }).map((diagnostic) => `[${context.name}] ${format(diagnostic)}`)
  )

  for (const diagnostic of diagnostics) report(diagnostic)
  return diagnostics.length === 0 ? 0 : 1
}

if (import.meta.main) {
  process.exitCode = runDependencyBoundaries(dependencyBoundariesConfig)
}
