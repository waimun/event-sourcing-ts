import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { type ErrorArchitectureConfig, runErrorArchitecture } from './check-error-architecture'

const fixtureRoot = join(tmpdir(), `error-architecture-launcher-${process.pid}`)

const writeFixture = (path: string, contents: string): void => {
  const target = join(fixtureRoot, path)
  mkdirSync(join(target, '..'), { recursive: true })
  writeFileSync(target, contents)
}

beforeAll(() => {
  writeFixture('single/tsconfig.json', JSON.stringify({ compilerOptions: { module: 'preserve' } }))
  writeFixture(
    'single/src/shared/errors/kernel.ts',
    "export abstract class BaseError extends Error { readonly code = 'BASE_ERROR' }"
  )
  writeFixture(
    'single/src/invalid.ts',
    `const failure: Error = new Error('unexpected')
throw failure`
  )

  writeFixture(
    'multiple/tsconfig.json',
    JSON.stringify({ compilerOptions: { module: 'preserve' } })
  )
  writeFixture(
    'multiple/contexts/cargo/src/errors/kernel.ts',
    "export abstract class BaseError extends Error { readonly cargoCode = 'CARGO_ERROR' }"
  )
  writeFixture(
    'multiple/contexts/cargo/src/invalid.ts',
    `export class CargoFailure extends Error {}`
  )
  writeFixture(
    'multiple/contexts/cargo/src/valid.ts',
    `import { BaseError } from './errors/kernel'
class ExpectedCargoFailure extends BaseError {}
throw new ExpectedCargoFailure()`
  )
  writeFixture(
    'multiple/contexts/orders/src/errors/kernel.ts',
    "export abstract class BaseError extends Error { readonly orderCode = 'ORDER_ERROR' }"
  )
  writeFixture(
    'multiple/contexts/orders/src/invalid.ts',
    `const failure: Error = new Error('unexpected')
throw failure`
  )
  writeFixture(
    'multiple/contexts/orders/src/valid.ts',
    `import { BaseError } from './errors/kernel'
class ExpectedOrderFailure extends BaseError {}
throw new ExpectedOrderFailure()`
  )
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

test('runs one explicitly configured src scope', () => {
  const diagnostics: string[] = []
  const config = {
    configFile: 'tsconfig.json',
    scopes: [
      {
        name: 'single-context',
        sourceRoot: 'src',
        errorKernelFile: 'src/shared/errors/kernel.ts'
      }
    ]
  } satisfies ErrorArchitectureConfig

  expect(
    runErrorArchitecture(config, {
      projectRoot: join(fixtureRoot, 'single'),
      report: diagnostics.push.bind(diagnostics)
    })
  ).toBe(1)
  expect(diagnostics).toEqual([
    "[single-context] invalid.ts:2:1 [error-architecture/throw-base-error] Thrown value of type 'Error' is not assignable to BaseError."
  ])
})

test('aggregates independently governed scopes in configuration order', () => {
  const diagnostics: string[] = []
  const config = {
    configFile: 'tsconfig.json',
    scopes: [
      {
        name: 'orders',
        sourceRoot: 'contexts/orders/src',
        errorKernelFile: 'contexts/orders/src/errors/kernel.ts'
      },
      {
        name: 'cargo',
        sourceRoot: 'contexts/cargo/src',
        errorKernelFile: 'contexts/cargo/src/errors/kernel.ts'
      }
    ]
  } satisfies ErrorArchitectureConfig

  expect(
    runErrorArchitecture(config, {
      projectRoot: join(fixtureRoot, 'multiple'),
      report: diagnostics.push.bind(diagnostics)
    })
  ).toBe(1)
  expect(diagnostics).toEqual([
    "[orders] invalid.ts:2:1 [error-architecture/throw-base-error] Thrown value of type 'Error' is not assignable to BaseError.",
    "[cargo] invalid.ts:1:14 [error-architecture/no-native-error-subclass] Class 'CargoFailure' extends the native Error hierarchy without belonging to BaseError."
  ])
})

test('fails closed when no source scopes are configured', () => {
  expect(() =>
    runErrorArchitecture(
      { configFile: 'tsconfig.json', scopes: [] },
      {
        projectRoot: fixtureRoot,
        check: () => {
          throw new Error('analyzer should not run')
        }
      }
    )
  ).toThrow('Error architecture configuration must declare at least one source scope')
})
