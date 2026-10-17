import { isAbsolute, relative, resolve, sep } from 'node:path'
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

interface ResolvedBoundedContext extends BoundedContextDependencyConfig {
  sourceRoot: string
}

const isWithin = (file: string, root: string): boolean => {
  const pathFromRoot = relative(root, file)
  return (
    pathFromRoot === '' ||
    (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot))
  )
}

const resolveProjectPath = (projectRoot: string, path: string, label: string): string => {
  const resolvedPath = resolve(projectRoot, path)
  if (isAbsolute(path) || !isWithin(resolvedPath, projectRoot)) {
    throw new Error(`${label} must be inside the project root: ${path}`)
  }
  return resolvedPath
}

const resolveContexts = (
  projectRoot: string,
  contexts: readonly BoundedContextDependencyConfig[]
): ResolvedBoundedContext[] => {
  const names = new Set<string>()
  const resolved = contexts.map((context) => {
    if (names.has(context.name)) {
      throw new Error(`Bounded-context name is duplicated: ${context.name}`)
    }
    names.add(context.name)

    return {
      ...context,
      sourceRoot: resolveProjectPath(
        projectRoot,
        context.sourceRoot,
        `Bounded-context source root '${context.name}'`
      )
    }
  })

  for (const [index, context] of resolved.entries()) {
    for (const candidate of resolved.slice(index + 1)) {
      if (
        isWithin(context.sourceRoot, candidate.sourceRoot) ||
        isWithin(candidate.sourceRoot, context.sourceRoot)
      ) {
        throw new Error(
          `Bounded-context source roots overlap: '${context.name}' and '${candidate.name}'`
        )
      }
    }
  }

  return resolved
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

  const absoluteProjectRoot = resolve(projectRoot)
  const configFile = resolveProjectPath(
    absoluteProjectRoot,
    config.configFile,
    'TypeScript configuration'
  )
  const contexts = resolveContexts(absoluteProjectRoot, config.boundedContexts)
  const diagnostics = contexts.flatMap((context) =>
    check({
      configFile,
      sourceRoot: context.sourceRoot,
      boundaries: context.boundaries
    }).map((diagnostic) => `[${context.name}] ${format(diagnostic)}`)
  )

  for (const diagnostic of diagnostics) report(diagnostic)
  return diagnostics.length === 0 ? 0 : 1
}

if (import.meta.main) {
  process.exitCode = runDependencyBoundaries(dependencyBoundariesConfig)
}
