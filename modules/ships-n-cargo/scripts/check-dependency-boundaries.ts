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
  requiredSourceRoots: readonly string[]
  boundedContexts: readonly BoundedContextDependencyConfig[]
}

interface DependencyBoundariesLauncherOptions {
  projectRoot?: string
  check?: typeof checkDependencyBoundaries
  format?: (diagnostic: DependencyBoundaryDiagnostic) => string
  report?: (diagnostic: string) => void
}

interface ResolvedBoundedContext extends BoundedContextDependencyConfig {
  configuredSourceRoot: string
  sourceRoot: string
}

interface ResolvedSourceRoot {
  configuredPath: string
  absolutePath: string
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
      configuredSourceRoot: context.sourceRoot,
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

const resolveRequiredSourceRoots = (
  projectRoot: string,
  sourceRoots: readonly string[]
): ResolvedSourceRoot[] => {
  if (sourceRoots.length === 0) {
    throw new Error(
      'Dependency boundaries configuration must declare at least one required source root'
    )
  }

  const absolutePaths = new Set<string>()
  return sourceRoots.map((configuredPath) => {
    const absolutePath = resolveProjectPath(
      projectRoot,
      configuredPath,
      'Required bounded-context source root'
    )
    if (absolutePaths.has(absolutePath)) {
      throw new Error(`Required bounded-context source root is duplicated: ${configuredPath}`)
    }
    absolutePaths.add(absolutePath)
    return { configuredPath, absolutePath }
  })
}

const validateRequiredSourceRoots = (
  requiredSourceRoots: readonly ResolvedSourceRoot[],
  contexts: readonly ResolvedBoundedContext[]
): void => {
  const requiredPaths = new Set(requiredSourceRoots.map(({ absolutePath }) => absolutePath))
  const configuredPaths = new Set(contexts.map(({ sourceRoot }) => sourceRoot))

  for (const requiredSourceRoot of requiredSourceRoots) {
    if (!configuredPaths.has(requiredSourceRoot.absolutePath)) {
      throw new Error(
        `Required bounded-context source root has no dependency-boundaries configuration: ${requiredSourceRoot.configuredPath}`
      )
    }
  }

  for (const context of contexts) {
    if (!requiredPaths.has(context.sourceRoot)) {
      throw new Error(
        `Bounded-context source root '${context.name}' is not declared as required: ${context.configuredSourceRoot}`
      )
    }
  }
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
  const requiredSourceRoots = resolveRequiredSourceRoots(
    absoluteProjectRoot,
    config.requiredSourceRoots
  )
  const contexts = resolveContexts(absoluteProjectRoot, config.boundedContexts)
  validateRequiredSourceRoots(requiredSourceRoots, contexts)
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
