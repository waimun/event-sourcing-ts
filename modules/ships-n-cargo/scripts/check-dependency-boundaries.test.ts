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
        return options.sourceRoot.includes('orders')
          ? [
              {
                file: 'domain/order.ts',
                line: 1,
                column: 20,
                rule: dependencyBoundaryRules.forbiddenImport,
                message: "Boundary 'domain' must not depend on boundary 'adapters'."
              }
            ]
          : []
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
    "[orders] domain/order.ts:1:20 [dependency-boundaries/no-forbidden-import] Boundary 'domain' must not depend on boundary 'adapters'."
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
