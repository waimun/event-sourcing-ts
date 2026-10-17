import { expect, test, vi } from 'vitest'
import {
  type DependencyBoundariesConfig,
  runDependencyBoundaries
} from './check-dependency-boundaries'
import { type DependencyBoundariesOptions, dependencyBoundaryRules } from './dependency-boundaries'

const boundary = { name: 'domain', path: 'domain', allowedDependencies: ['domain'] } as const

test('runs every explicitly configured bounded-context source root in order', () => {
  const diagnostics: string[] = []
  const checked: DependencyBoundariesOptions[] = []
  const config = {
    configFile: 'tsconfig.json',
    boundedContexts: [
      { name: 'orders', sourceRoot: 'contexts/orders/src', boundaries: [boundary] },
      { name: 'cargo', sourceRoot: 'contexts/cargo/src', boundaries: [boundary] }
    ]
  } satisfies DependencyBoundariesConfig

  expect(
    runDependencyBoundaries(config, {
      projectRoot: '/repository',
      check: (options) => {
        checked.push(options)
        return [
          {
            file: options.sourceRoot.includes('orders') ? 'domain/order.ts' : 'domain/cargo.ts',
            line: 1,
            column: 20,
            rule: dependencyBoundaryRules.forbiddenImport,
            message: "Boundary 'domain' must not depend on boundary 'adapters'."
          }
        ]
      },
      report: diagnostics.push.bind(diagnostics)
    })
  ).toBe(1)

  expect(checked).toEqual([
    {
      configFile: '/repository/tsconfig.json',
      sourceRoot: '/repository/contexts/orders/src',
      boundaries: [boundary]
    },
    {
      configFile: '/repository/tsconfig.json',
      sourceRoot: '/repository/contexts/cargo/src',
      boundaries: [boundary]
    }
  ])
  expect(diagnostics).toEqual([
    "[orders] domain/order.ts:1:20 [dependency-boundaries/no-forbidden-import] Boundary 'domain' must not depend on boundary 'adapters'.",
    "[cargo] domain/cargo.ts:1:20 [dependency-boundaries/no-forbidden-import] Boundary 'domain' must not depend on boundary 'adapters'."
  ])
})

test('returns success when every configured context is clean', () => {
  expect(
    runDependencyBoundaries(
      {
        configFile: 'tsconfig.json',
        boundedContexts: [
          { name: 'orders', sourceRoot: 'contexts/orders/src', boundaries: [boundary] }
        ]
      },
      { check: () => [], report: vi.fn() }
    )
  ).toBe(0)
})

test('fails closed when no bounded contexts are configured', () => {
  expect(() =>
    runDependencyBoundaries(
      { configFile: 'tsconfig.json', boundedContexts: [] },
      { check: vi.fn(() => []) }
    )
  ).toThrow('Dependency boundaries configuration must declare at least one bounded context')
})

test('rejects source roots and TypeScript configuration outside the project root', () => {
  const check = vi.fn(() => [])

  expect(() =>
    runDependencyBoundaries(
      {
        configFile: 'tsconfig.json',
        boundedContexts: [{ name: 'orders', sourceRoot: '../orders/src', boundaries: [boundary] }]
      },
      { projectRoot: '/repository', check }
    )
  ).toThrow("Bounded-context source root 'orders' must be inside the project root: ../orders/src")
  expect(() =>
    runDependencyBoundaries(
      {
        configFile: '../tsconfig.json',
        boundedContexts: [{ name: 'orders', sourceRoot: 'src', boundaries: [boundary] }]
      },
      { projectRoot: '/repository', check }
    )
  ).toThrow('TypeScript configuration must be inside the project root: ../tsconfig.json')
  expect(check).not.toHaveBeenCalled()
})

test('rejects duplicate names and overlapping bounded-context source roots before analysis', () => {
  const check = vi.fn(() => [])

  expect(() =>
    runDependencyBoundaries(
      {
        configFile: 'tsconfig.json',
        boundedContexts: [
          { name: 'orders', sourceRoot: 'contexts/orders/src', boundaries: [boundary] },
          { name: 'orders', sourceRoot: 'contexts/cargo/src', boundaries: [boundary] }
        ]
      },
      { projectRoot: '/repository', check }
    )
  ).toThrow('Bounded-context name is duplicated: orders')
  expect(() =>
    runDependencyBoundaries(
      {
        configFile: 'tsconfig.json',
        boundedContexts: [
          { name: 'orders', sourceRoot: 'contexts', boundaries: [boundary] },
          { name: 'cargo', sourceRoot: 'contexts/cargo/src', boundaries: [boundary] }
        ]
      },
      { projectRoot: '/repository', check }
    )
  ).toThrow("Bounded-context source roots overlap: 'orders' and 'cargo'")
  expect(check).not.toHaveBeenCalled()
})
