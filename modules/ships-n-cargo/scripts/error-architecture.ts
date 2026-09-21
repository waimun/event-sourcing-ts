import { isAbsolute, relative, resolve, sep } from 'node:path'
import {
  type ClassDeclaration,
  isClassDeclaration,
  isThrowStatement,
  type Node,
  type SourceFile
} from 'typescript/unstable/ast'
import { API, type Checker, type Program, SymbolFlags, type Type } from 'typescript/unstable/sync'

export const errorArchitectureRules = {
  nativeSubclass: 'error-architecture/no-native-error-subclass',
  thrownValue: 'error-architecture/throw-base-error'
} as const

export interface ErrorArchitectureDiagnostic {
  file: string
  line: number
  column: number
  rule: (typeof errorArchitectureRules)[keyof typeof errorArchitectureRules]
  message: string
}

interface ErrorArchitectureOptions {
  configFile: string
  sourceRoot: string
  errorKernelFile: string
}

const excludedDirectoryNames = new Set([
  '__fixtures__',
  '__tests__',
  'fixture',
  'fixtures',
  'test',
  'tests'
])

const isProductionSource = (fileName: string, sourceRoot: string): boolean => {
  const pathFromSourceRoot = relative(sourceRoot, fileName)
  if (
    pathFromSourceRoot === '' ||
    pathFromSourceRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromSourceRoot)
  ) {
    return false
  }

  const segments = pathFromSourceRoot.split(sep)
  const name = segments.at(-1) ?? ''

  return (
    !segments.some((segment) => excludedDirectoryNames.has(segment)) &&
    !name.endsWith('.d.ts') &&
    !/\.(?:fixture|spec|test)\.tsx?$/.test(name) &&
    /\.tsx?$/.test(name)
  )
}

const classType = (declaration: ClassDeclaration, checker: Checker): Type | undefined => {
  if (declaration.name === undefined) return undefined
  const symbol = checker.getSymbolAtLocation(declaration.name)
  return symbol === undefined ? undefined : checker.getDeclaredTypeOfSymbol(symbol)
}

const inheritsFrom = (type: Type, ancestor: Type, visited = new Set<number>()): boolean => {
  if (type.id === ancestor.id) return true
  if (visited.has(type.id)) return false
  visited.add(type.id)

  return type.getBaseTypes()?.some((baseType) => inheritsFrom(baseType, ancestor, visited)) ?? false
}

const namedClass = (sourceFile: SourceFile, className: string): ClassDeclaration | undefined => {
  let found: ClassDeclaration | undefined

  const visit = (node: Node): undefined => {
    if (isClassDeclaration(node) && node.name?.text === className) found = node
    if (found === undefined) node.forEachChild(visit)
    return undefined
  }

  sourceFile.forEachChild(visit)
  return found
}

const addDiagnostic = (
  diagnostics: ErrorArchitectureDiagnostic[],
  sourceRoot: string,
  sourceFile: SourceFile,
  node: Node,
  rule: ErrorArchitectureDiagnostic['rule'],
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
  sourceRoot: string,
  errorKernelFile: string
): ErrorArchitectureDiagnostic[] => {
  const kernelSource = program.getSourceFile(errorKernelFile)
  if (kernelSource === undefined) {
    throw new Error(`Error kernel is not part of the TypeScript project: ${errorKernelFile}`)
  }

  const baseErrorDeclaration = namedClass(kernelSource, 'BaseError')
  const baseErrorType =
    baseErrorDeclaration === undefined ? undefined : classType(baseErrorDeclaration, checker)
  if (baseErrorDeclaration === undefined || baseErrorType === undefined) {
    throw new Error(`BaseError class was not found in the error kernel: ${errorKernelFile}`)
  }

  const nativeErrorSymbol = checker.resolveName(
    'Error',
    SymbolFlags.Type,
    baseErrorDeclaration,
    false
  )
  if (nativeErrorSymbol === undefined) {
    throw new Error('The TypeScript project does not provide the native Error type')
  }
  const nativeErrorType = checker.getDeclaredTypeOfSymbol(nativeErrorSymbol)
  const diagnostics: ErrorArchitectureDiagnostic[] = []

  for (const fileName of [...program.getSourceFileNames()].sort()) {
    if (!isProductionSource(fileName, sourceRoot)) continue
    const sourceFile = program.getSourceFile(fileName)
    if (sourceFile === undefined) continue

    const visit = (node: Node): undefined => {
      if (isThrowStatement(node)) {
        const thrownType = checker.getTypeAtLocation(node.expression)
        if (thrownType === undefined || !checker.isTypeAssignableTo(thrownType, baseErrorType)) {
          const typeName = thrownType === undefined ? 'unknown' : checker.typeToString(thrownType)
          addDiagnostic(
            diagnostics,
            sourceRoot,
            sourceFile,
            node,
            errorArchitectureRules.thrownValue,
            `Thrown value of type '${typeName}' is not assignable to BaseError.`
          )
        }
      }

      if (isClassDeclaration(node) && resolve(sourceFile.fileName) !== errorKernelFile) {
        const declaredType = classType(node, checker)
        if (
          declaredType !== undefined &&
          inheritsFrom(declaredType, nativeErrorType) &&
          !inheritsFrom(declaredType, baseErrorType)
        ) {
          addDiagnostic(
            diagnostics,
            sourceRoot,
            sourceFile,
            node.name ?? node,
            errorArchitectureRules.nativeSubclass,
            `Class '${node.name?.text ?? '<anonymous>'}' extends the native Error hierarchy without belonging to BaseError.`
          )
        }
      }

      node.forEachChild(visit)
      return undefined
    }

    sourceFile.forEachChild(visit)
  }

  return diagnostics
}

export const checkErrorArchitecture = ({
  configFile,
  sourceRoot,
  errorKernelFile
}: ErrorArchitectureOptions): ErrorArchitectureDiagnostic[] => {
  const absoluteConfigFile = resolve(configFile)
  const absoluteSourceRoot = resolve(sourceRoot)
  const absoluteErrorKernelFile = resolve(errorKernelFile)
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

      return analyzeProgram(
        project.program,
        project.checker,
        absoluteSourceRoot,
        absoluteErrorKernelFile
      )
    } finally {
      snapshot.dispose()
    }
  } finally {
    api.close()
  }
}

export const formatErrorArchitectureDiagnostic = (
  diagnostic: ErrorArchitectureDiagnostic
): string =>
  `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} [${diagnostic.rule}] ${diagnostic.message}`
