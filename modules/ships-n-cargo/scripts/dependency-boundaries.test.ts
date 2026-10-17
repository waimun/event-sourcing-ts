import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  checkDependencyBoundaries,
  type DependencyBoundary,
  dependencyBoundaryRules,
  formatDependencyBoundaryDiagnostic
} from './dependency-boundaries'

const fixtureRoot = join(tmpdir(), `dependency-boundaries-${process.pid}`)
const sourceRoot = join(fixtureRoot, 'src')
const boundaries = [
  { name: 'shared', path: 'shared', allowedDependencies: ['shared'] },
  { name: 'domain', path: 'domain', allowedDependencies: ['shared', 'domain'] },
  {
    name: 'application',
    path: 'application',
    allowedDependencies: ['shared', 'domain', 'application']
  },
  {
    name: 'adapters',
    path: 'adapters',
    allowedDependencies: ['shared', 'domain', 'application', 'adapters']
  },
  {
    name: 'bootstrap',
    path: 'bootstrap',
    allowedDependencies: ['shared', 'domain', 'application', 'adapters', 'bootstrap']
  }
] satisfies readonly DependencyBoundary[]

const writeFixture = (path: string, contents: string): void => {
  const target = join(fixtureRoot, path)
  mkdirSync(join(target, '..'), { recursive: true })
  writeFileSync(target, contents)
}

beforeAll(() => {
  writeFixture('tsconfig.json', JSON.stringify({ compilerOptions: { module: 'preserve' } }))
  writeFixture('outside.ts', 'export const outside = true')
  writeFixture('src/shared/value.ts', 'export const value = true')
  writeFixture('src/domain/model.ts', "export { value } from '../shared/value'")
  writeFixture('src/application/use-case.ts', "export { value } from '../domain/model'")
  writeFixture('src/adapters/adapter.ts', "export { value } from '../application/use-case'")
  writeFixture('src/bootstrap/main.ts', "export { value } from '../adapters/adapter'")
  writeFixture(
    'src/domain/computed-dynamic.ts',
    "const modulePath = '../application/use-case'; void import(modulePath)"
  )
  writeFixture(
    'src/domain/computed-import-type.ts',
    "type ModulePath = '../application/use-case'; export type Application = typeof import(ModulePath)"
  )
  writeFixture(
    'src/domain/computed-require.ts',
    "declare const require: (path: string) => unknown; const modulePath = '../application/use-case'; require(modulePath)"
  )
  writeFixture('src/domain/dynamic.ts', "void import('../application/use-case')")
  writeFixture('src/domain/invalid.ts', "export { value } from '../application/use-case'")
  writeFixture(
    'src/domain/import-type.ts',
    "export type Application = typeof import('../application/use-case')"
  )
  writeFixture(
    'src/domain/literal-require.ts',
    "declare const require: (path: string) => unknown; require('../application/use-case')"
  )
  writeFixture('src/domain/static-template.ts', 'void import(`../application/use-case`)')
  writeFixture('src/domain/unresolved.ts', "export { missing } from './missing'")
  writeFixture('src/shared/invalid.ts', "export { value } from '../domain/model'")
  writeFixture('src/application/outside.ts', "export { outside } from '../../outside'")
  writeFixture('src/unassigned.ts', 'export const unassigned = true')
  writeFixture('src/domain/ignored.test.ts', "export { value } from '../application/use-case'")
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

const analyzeFixture = () =>
  checkDependencyBoundaries({
    configFile: join(fixtureRoot, 'tsconfig.json'),
    sourceRoot,
    boundaries
  })

test('enforces inward dependencies and bounded-context isolation in production source', () => {
  expect(analyzeFixture()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        file: 'application/outside.ts',
        rule: dependencyBoundaryRules.outsideContext
      }),
      expect.objectContaining({
        file: 'domain/import-type.ts',
        rule: dependencyBoundaryRules.forbiddenImport
      }),
      expect.objectContaining({
        file: 'domain/invalid.ts',
        rule: dependencyBoundaryRules.forbiddenImport
      }),
      expect.objectContaining({
        file: 'shared/invalid.ts',
        rule: dependencyBoundaryRules.forbiddenImport
      }),
      expect.objectContaining({
        file: 'unassigned.ts',
        rule: dependencyBoundaryRules.unassignedSource
      })
    ])
  )
})

test('fails closed for computed module references and checks static dynamic forms', () => {
  expect(analyzeFixture()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        file: 'domain/computed-dynamic.ts',
        rule: dependencyBoundaryRules.dynamicModuleReference
      }),
      expect.objectContaining({
        file: 'domain/computed-import-type.ts',
        rule: dependencyBoundaryRules.dynamicModuleReference
      }),
      expect.objectContaining({
        file: 'domain/computed-require.ts',
        rule: dependencyBoundaryRules.dynamicModuleReference
      }),
      expect.objectContaining({
        file: 'domain/dynamic.ts',
        rule: dependencyBoundaryRules.forbiddenImport
      }),
      expect.objectContaining({
        file: 'domain/literal-require.ts',
        rule: dependencyBoundaryRules.forbiddenImport
      }),
      expect.objectContaining({
        file: 'domain/static-template.ts',
        rule: dependencyBoundaryRules.forbiddenImport
      })
    ])
  )
})

test('fails closed when a relative module reference cannot be resolved', () => {
  expect(analyzeFixture()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        file: 'domain/unresolved.ts',
        rule: dependencyBoundaryRules.unresolvedModuleReference
      })
    ])
  )
})

test('keeps tests outside the governed production source policy', () => {
  expect(analyzeFixture()).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ file: 'domain/ignored.test.ts' })])
  )
})

test('rejects invalid boundary configuration', () => {
  const check = (configuredBoundaries: readonly DependencyBoundary[]): void => {
    checkDependencyBoundaries({
      configFile: join(fixtureRoot, 'tsconfig.json'),
      sourceRoot,
      boundaries: configuredBoundaries
    })
  }

  expect(() => check([])).toThrow('Dependency boundaries must declare at least one boundary')
  expect(() =>
    check([
      { name: 'domain', path: 'domain', allowedDependencies: ['domain'] },
      { name: 'domain', path: 'shared', allowedDependencies: ['domain'] }
    ])
  ).toThrow('Dependency boundary name is duplicated: domain')
  expect(() =>
    check([{ name: 'domain', path: 'domain', allowedDependencies: ['missing'] }])
  ).toThrow("Dependency boundary 'domain' allows unknown boundary 'missing'")
  expect(() =>
    check([{ name: 'outside', path: '../outside', allowedDependencies: ['outside'] }])
  ).toThrow('Dependency boundary must be inside its source root: ../outside')
  expect(() =>
    check([
      {
        name: 'absolute',
        path: join(sourceRoot, 'domain'),
        allowedDependencies: ['absolute']
      }
    ])
  ).toThrow(`Dependency boundary must be inside its source root: ${join(sourceRoot, 'domain')}`)
  expect(() =>
    check([
      {
        name: 'domain',
        path: 'domain',
        allowedDependencies: ['domain', 'domain']
      }
    ])
  ).toThrow("Dependency boundary 'domain' duplicates allowed dependency 'domain'")
  expect(() =>
    check([
      { name: 'domain', path: 'domain', allowedDependencies: ['domain'] },
      { name: 'nested', path: 'domain/nested', allowedDependencies: ['nested'] }
    ])
  ).toThrow("Dependency boundaries overlap: 'domain' and 'nested'")
  expect(() =>
    checkDependencyBoundaries({
      configFile: join(fixtureRoot, 'tsconfig.json'),
      sourceRoot: join(fixtureRoot, 'missing'),
      boundaries: [{ name: 'domain', path: 'domain', allowedDependencies: ['domain'] }]
    })
  ).toThrow('Bounded-context source root is not part of the TypeScript project')
})

test('formats actionable lint diagnostics', () => {
  expect(
    formatDependencyBoundaryDiagnostic({
      file: 'domain/model.ts',
      line: 3,
      column: 20,
      rule: dependencyBoundaryRules.forbiddenImport,
      message: "Boundary 'domain' must not depend on boundary 'adapters'."
    })
  ).toBe(
    "domain/model.ts:3:20 [dependency-boundaries/no-forbidden-import] Boundary 'domain' must not depend on boundary 'adapters'."
  )
})
