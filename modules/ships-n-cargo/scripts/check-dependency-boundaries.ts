import { readdirSync } from 'node:fs'
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

export type BoundedContextDiscovery =
  | { kind: 'configured' }
  | { kind: 'children'; root: string; sourcePath?: string }

export interface DependencyBoundariesConfig {
  configFile: string
  contextDiscovery: BoundedContextDiscovery
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

interface DiscoveredSourceRoot {
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

const discoverSourceRoots = (
  projectRoot: string,
  discovery: Extract<BoundedContextDiscovery, { kind: 'children' }>
): DiscoveredSourceRoot[] => {
  const childrenRoot = resolveProjectPath(
    projectRoot,
    discovery.root,
    'Bounded-context discovery root'
  )
  const sourcePath = discovery.sourcePath ?? '.'

  return readdirSync(childrenRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((child) => {
      const contextRoot = resolve(childrenRoot, child.name)
      const absolutePath = resolve(contextRoot, sourcePath)
      if (isAbsolute(sourcePath) || !isWithin(absolutePath, contextRoot)) {
        throw new Error(
          `Bounded-context source path for '${child.name}' must be inside its context root: ${sourcePath}`
        )
      }
      return {
        configuredPath: relative(projectRoot, absolutePath) || '.',
        absolutePath
      }
    })
}

const validateDiscoveredSourceRoots = (
  discoveredSourceRoots: readonly DiscoveredSourceRoot[],
  contexts: readonly ResolvedBoundedContext[]
): void => {
  const discoveredPaths = new Set(discoveredSourceRoots.map(({ absolutePath }) => absolutePath))
  const configuredPaths = new Set(contexts.map(({ sourceRoot }) => sourceRoot))

  for (const discoveredSourceRoot of discoveredSourceRoots) {
    if (!configuredPaths.has(discoveredSourceRoot.absolutePath)) {
      throw new Error(
        `Discovered bounded-context source root has no dependency-boundaries configuration: ${discoveredSourceRoot.configuredPath}`
      )
    }
  }

  for (const context of contexts) {
    if (!discoveredPaths.has(context.sourceRoot)) {
      throw new Error(
        `Bounded-context source root '${context.name}' was not discovered: ${context.configuredSourceRoot}`
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
  const contexts = resolveContexts(absoluteProjectRoot, config.boundedContexts)
  if (config.contextDiscovery.kind === 'children') {
    const discoveredSourceRoots = discoverSourceRoots(absoluteProjectRoot, config.contextDiscovery)
    validateDiscoveredSourceRoots(discoveredSourceRoots, contexts)
  }
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
