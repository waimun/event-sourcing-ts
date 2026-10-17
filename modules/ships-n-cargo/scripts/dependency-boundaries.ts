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
  isNoSubstitutionTemplateLiteral,
  isSourceFile,
  isStringLiteral,
  type Node,
  type SourceFile,
  type StringLiteralLikeNode,
  SyntaxKind
} from 'typescript/unstable/ast'
import { API, type Checker, type Program, type Project } from 'typescript/unstable/sync'

export const dependencyBoundaryRules = {
  dynamicModuleReference: 'dependency-boundaries/no-dynamic-module-reference',
  forbiddenImport: 'dependency-boundaries/no-forbidden-import',
  outsideContext: 'dependency-boundaries/no-outside-context-import',
  unresolvedModuleReference: 'dependency-boundaries/no-unresolved-module-reference',
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

const isWithin = (file: string, root: string): boolean => {
  const pathFromRoot = relative(root, file)
  return (
    pathFromRoot === '' ||
    (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot))
  )
}

const isAnalyzedSource = (fileName: string, sourceRoot: string): boolean => {
  if (!isWithin(fileName, sourceRoot)) return false
  const name = relative(sourceRoot, fileName).split(sep).at(-1) ?? ''

  return !name.endsWith('.d.ts') && /\.tsx?$/.test(name)
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
    if (isAbsolute(boundary.path) || !isWithin(root, sourceRoot)) {
      throw new Error(`Dependency boundary must be inside its source root: ${boundary.path}`)
    }

    return { ...boundary, root }
  })

  for (const boundary of resolved) {
    const dependencies = new Set<string>()
    for (const dependency of boundary.allowedDependencies) {
      if (dependencies.has(dependency)) {
        throw new Error(
          `Dependency boundary '${boundary.name}' duplicates allowed dependency '${dependency}'`
        )
      }
      dependencies.add(dependency)

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
  moduleSpecifier: StringLiteralLikeNode,
  importingSourceFile: SourceFile,
  checker: Checker,
  project: Project
): SourceFile | undefined => {
  const symbol = checker.getSymbolAtLocation(moduleSpecifier)
  for (const declaration of symbol?.declarations ?? []) {
    const node = declaration.resolve(project)
    if (node !== undefined && isSourceFile(node)) return node
  }

  if (moduleSpecifier.text.startsWith('.')) {
    const importedPath = resolve(dirname(importingSourceFile.fileName), moduleSpecifier.text)
    const importedPathWithoutExtension = importedPath.replace(/\.[cm]?[jt]sx?$/, '')

    for (const fileName of project.program.getSourceFileNames()) {
      const fileWithoutExtension = fileName.replace(/(?:\.d)?\.[cm]?[jt]sx?$/, '')
      if (
        fileWithoutExtension === importedPathWithoutExtension ||
        fileWithoutExtension === resolve(importedPathWithoutExtension, 'index')
      ) {
        return project.program.getSourceFile(fileName)
      }
    }
  }

  return undefined
}

interface ModuleReference {
  node: Node
  specifier?: StringLiteralLikeNode
}

const stringLiteralLike = (node: Node): node is StringLiteralLikeNode =>
  isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)

const moduleReferenceFor = (node: Node): ModuleReference | undefined => {
  if (
    (isImportDeclaration(node) || isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    isStringLiteral(node.moduleSpecifier)
  ) {
    return { node: node.moduleSpecifier, specifier: node.moduleSpecifier }
  }

  if (isImportEqualsDeclaration(node) && isExternalModuleReference(node.moduleReference)) {
    const expression = node.moduleReference.expression
    return {
      node: expression ?? node.moduleReference,
      specifier: expression !== undefined && isStringLiteral(expression) ? expression : undefined
    }
  }

  if (isImportTypeNode(node)) {
    const argument = node.argument
    return {
      node: argument,
      specifier:
        isLiteralTypeNode(argument) && isStringLiteral(argument.literal)
          ? argument.literal
          : undefined
    }
  }

  if (
    isCallExpression(node) &&
    ((isKeywordExpression(node.expression) && node.expression.kind === SyntaxKind.ImportKeyword) ||
      (isIdentifier(node.expression) && node.expression.text === 'require'))
  ) {
    const argument = node.arguments[0]
    return {
      node: argument ?? node,
      specifier:
        node.arguments.length === 1 && argument !== undefined && stringLiteralLike(argument)
          ? argument
          : undefined
    }
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
    if (!isAnalyzedSource(fileName, sourceRoot)) continue
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
      const moduleReference = moduleReferenceFor(node)

      if (moduleReference !== undefined) {
        const moduleSpecifier = moduleReference.specifier
        if (moduleSpecifier === undefined) {
          addDiagnostic(
            diagnostics,
            sourceRoot,
            sourceFile,
            moduleReference.node,
            dependencyBoundaryRules.dynamicModuleReference,
            'Module references must use exactly one static string literal.'
          )
        } else {
          const dependencyFile = importedSourceFile(moduleSpecifier, sourceFile, checker, project)
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
          } else if (moduleSpecifier.text.startsWith('.')) {
            addDiagnostic(
              diagnostics,
              sourceRoot,
              sourceFile,
              moduleSpecifier,
              dependencyBoundaryRules.unresolvedModuleReference,
              `Relative module reference '${moduleSpecifier.text}' could not be resolved.`
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
          .some((fileName) => isAnalyzedSource(fileName, absoluteSourceRoot))
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
