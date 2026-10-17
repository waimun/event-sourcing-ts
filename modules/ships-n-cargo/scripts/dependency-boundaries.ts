import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import {
  isCallExpression,
  isExportDeclaration,
  isExternalModuleReference,
  isIdentifier,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportTypeNode,
  isKeywordExpression,
  isLiteralTypeNode,
  isSourceFile,
  isStringLiteral,
  type Node,
  type SourceFile,
  type StringLiteral,
  SyntaxKind
} from 'typescript/unstable/ast'
import { API, type Checker, type Program, type Project } from 'typescript/unstable/sync'

export const dependencyBoundaryRules = {
  forbiddenImport: 'dependency-boundaries/no-forbidden-import',
  outsideContext: 'dependency-boundaries/no-outside-context-import',
  unassignedSource: 'dependency-boundaries/unassigned-source'
} as const

export interface DependencyBoundary {
  name: string
  path: string
  allowedDependencies: readonly string[]
}

export interface DependencyBoundariesOptions {
  configFile: string
  sourceRoot: string
  boundaries: readonly DependencyBoundary[]
}

export interface DependencyBoundaryDiagnostic {
  file: string
  line: number
  column: number
  rule: (typeof dependencyBoundaryRules)[keyof typeof dependencyBoundaryRules]
  message: string
}

interface ResolvedBoundary extends DependencyBoundary {
  root: string
}

const excludedDirectoryNames = new Set([
  '__fixtures__',
  '__tests__',
  'fixture',
  'fixtures',
  'test',
  'tests'
])

const isWithin = (file: string, root: string): boolean => {
  const pathFromRoot = relative(root, file)
  return pathFromRoot === '' || (!pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot))
}

const isProductionSource = (fileName: string, sourceRoot: string): boolean => {
  if (!isWithin(fileName, sourceRoot)) return false
  const pathFromSourceRoot = relative(sourceRoot, fileName)
  const segments = pathFromSourceRoot.split(sep)
  const name = segments.at(-1) ?? ''

  return (
    !segments.some((segment) => excludedDirectoryNames.has(segment)) &&
    !name.endsWith('.d.ts') &&
    !/\.(?:fixture|spec|test)\.tsx?$/.test(name) &&
    /\.tsx?$/.test(name)
  )
}

const resolveBoundaries = (
  sourceRoot: string,
  boundaries: readonly DependencyBoundary[]
): ResolvedBoundary[] => {
  if (boundaries.length === 0) {
    throw new Error('Dependency boundaries must declare at least one boundary')
  }

  const names = new Set<string>()
  const resolved = boundaries.map((boundary) => {
    if (names.has(boundary.name)) {
      throw new Error(`Dependency boundary name is duplicated: ${boundary.name}`)
    }
    names.add(boundary.name)

    const root = resolve(sourceRoot, boundary.path)
    if (!isWithin(root, sourceRoot)) {
      throw new Error(`Dependency boundary must be inside its source root: ${boundary.path}`)
    }

    return { ...boundary, root }
  })

  for (const boundary of resolved) {
    for (const dependency of boundary.allowedDependencies) {
      if (!names.has(dependency)) {
        throw new Error(
          `Dependency boundary '${boundary.name}' allows unknown boundary '${dependency}'`
        )
      }
    }
  }

  for (const [index, boundary] of resolved.entries()) {
    for (const candidate of resolved.slice(index + 1)) {
      if (isWithin(boundary.root, candidate.root) || isWithin(candidate.root, boundary.root)) {
        throw new Error(`Dependency boundaries overlap: '${boundary.name}' and '${candidate.name}'`)
      }
    }
  }

  return resolved
}

const boundaryFor = (
  fileName: string,
  boundaries: readonly ResolvedBoundary[]
): ResolvedBoundary | undefined => boundaries.find((boundary) => isWithin(fileName, boundary.root))

const importedSourceFile = (
  moduleSpecifier: StringLiteral,
  checker: Checker,
  project: Project
): SourceFile | undefined => {
  const symbol = checker.getSymbolAtLocation(moduleSpecifier)
  for (const declaration of symbol?.declarations ?? []) {
    const node = declaration.resolve(project)
    if (node !== undefined && isSourceFile(node)) return node
  }
  return undefined
}

const moduleSpecifierFor = (node: Node): StringLiteral | undefined => {
  if (
    (isImportDeclaration(node) || isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier
  }

  if (
    isImportEqualsDeclaration(node) &&
    isExternalModuleReference(node.moduleReference) &&
    node.moduleReference.expression !== undefined &&
    isStringLiteral(node.moduleReference.expression)
  ) {
    return node.moduleReference.expression
  }

  if (
    isImportTypeNode(node) &&
    isLiteralTypeNode(node.argument) &&
    isStringLiteral(node.argument.literal)
  ) {
    return node.argument.literal
  }

  if (
    isCallExpression(node) &&
    node.arguments.length === 1 &&
    isStringLiteral(node.arguments[0]) &&
    ((isKeywordExpression(node.expression) && node.expression.kind === SyntaxKind.ImportKeyword) ||
      (isIdentifier(node.expression) && node.expression.text === 'require'))
  ) {
    return node.arguments[0]
  }

  return undefined
}

const addDiagnostic = (
  diagnostics: DependencyBoundaryDiagnostic[],
  sourceRoot: string,
  sourceFile: SourceFile,
  node: Node,
  rule: DependencyBoundaryDiagnostic['rule'],
  message: string
): void => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  diagnostics.push({
    file: relative(sourceRoot, sourceFile.fileName),
    line: position.line + 1,
    column: position.character + 1,
    rule,
    message
  })
}

const analyzeProgram = (
  program: Program,
  checker: Checker,
  project: Project,
  configFile: string,
  sourceRoot: string,
  boundaries: readonly ResolvedBoundary[]
): DependencyBoundaryDiagnostic[] => {
  const diagnostics: DependencyBoundaryDiagnostic[] = []
  const projectRoot = dirname(configFile)

  for (const fileName of [...program.getSourceFileNames()].sort()) {
    if (!isProductionSource(fileName, sourceRoot)) continue
    const sourceFile = program.getSourceFile(fileName)
    if (sourceFile === undefined) continue

    const sourceBoundary = boundaryFor(fileName, boundaries)
    if (sourceBoundary === undefined) {
      addDiagnostic(
        diagnostics,
        sourceRoot,
        sourceFile,
        sourceFile,
        dependencyBoundaryRules.unassignedSource,
        'Source file does not belong to a configured dependency boundary.'
      )
      continue
    }

    const visit = (node: Node): undefined => {
      const moduleSpecifier = moduleSpecifierFor(node)

      if (moduleSpecifier !== undefined) {
        const dependencyFile = importedSourceFile(moduleSpecifier, checker, project)
        if (dependencyFile !== undefined) {
          const dependencyBoundary = boundaryFor(dependencyFile.fileName, boundaries)

          if (
            dependencyBoundary === undefined &&
            (moduleSpecifier.text.startsWith('.') ||
              (isWithin(dependencyFile.fileName, projectRoot) &&
                !dependencyFile.fileName.split(sep).includes('node_modules')))
          ) {
            addDiagnostic(
              diagnostics,
              sourceRoot,
              sourceFile,
              moduleSpecifier,
              dependencyBoundaryRules.outsideContext,
              `Import '${moduleSpecifier.text}' resolves outside the configured bounded context.`
            )
          } else if (
            dependencyBoundary !== undefined &&
            !sourceBoundary.allowedDependencies.includes(dependencyBoundary.name)
          ) {
            addDiagnostic(
              diagnostics,
              sourceRoot,
              sourceFile,
              moduleSpecifier,
              dependencyBoundaryRules.forbiddenImport,
              `Boundary '${sourceBoundary.name}' must not depend on boundary '${dependencyBoundary.name}'.`
            )
          }
        }
      }

      node.forEachChild(visit)
      return undefined
    }

    sourceFile.forEachChild(visit)
  }

  return diagnostics
}

export const checkDependencyBoundaries = ({
  configFile,
  sourceRoot,
  boundaries
}: DependencyBoundariesOptions): DependencyBoundaryDiagnostic[] => {
  const absoluteConfigFile = resolve(configFile)
  const absoluteSourceRoot = resolve(sourceRoot)
  const resolvedBoundaries = resolveBoundaries(absoluteSourceRoot, boundaries)
  const api = new API()

  try {
    const snapshot = api.updateSnapshot({ openProjects: [absoluteConfigFile] })
    try {
      const project = snapshot
        .getProjects()
        .find((candidate) => resolve(candidate.configFileName) === absoluteConfigFile)
      if (project === undefined) {
        throw new Error(`TypeScript project could not be loaded: ${absoluteConfigFile}`)
      }
      if (
        !project.program
          .getSourceFileNames()
          .some((fileName) => isProductionSource(fileName, absoluteSourceRoot))
      ) {
        throw new Error(
          `Bounded-context source root is not part of the TypeScript project: ${absoluteSourceRoot}`
        )
      }

      return analyzeProgram(
        project.program,
        project.checker,
        project,
        absoluteConfigFile,
        absoluteSourceRoot,
        resolvedBoundaries
      )
    } finally {
      snapshot.dispose()
    }
  } finally {
    api.close()
  }
}

export const formatDependencyBoundaryDiagnostic = (
  diagnostic: DependencyBoundaryDiagnostic
): string =>
  `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} [${diagnostic.rule}] ${diagnostic.message}`
