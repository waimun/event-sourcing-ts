import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  checkErrorArchitecture,
  errorArchitectureRules,
  formatErrorArchitectureDiagnostic
} from './error-architecture'

const fixtureRoot = join(tmpdir(), `ships-n-cargo-error-architecture-${process.pid}`)
const sourceRoot = join(fixtureRoot, 'src')

const writeFixture = (path: string, contents: string): void => {
  const target = join(fixtureRoot, path)
  mkdirSync(join(target, '..'), { recursive: true })
  writeFileSync(target, contents)
}

beforeAll(() => {
  writeFixture('tsconfig.json', JSON.stringify({ compilerOptions: { module: 'preserve' } }))
  writeFixture(
    'src/shared/errors/kernel.ts',
    `export abstract class BaseError extends Error {
      readonly code = 'BASE_ERROR'
    }
    export abstract class DomainError extends BaseError {}`
  )
  writeFixture(
    'src/valid.ts',
    `import { BaseError as KernelError } from './shared/errors/kernel.ts'
    class KnownFailure extends KernelError {}
    const failure: KernelError = new KnownFailure('known')
    throw failure`
  )
  writeFixture(
    'src/invalid-native.ts',
    `const NativeError = Error
    export class RogueFailure extends NativeError {}`
  )
  writeFixture(
    'src/invalid-throw.ts',
    `const failure: Error = new Error('unexpected')
    throw failure`
  )
  writeFixture(
    'src/rethrow.ts',
    `try {
      void 0
    } catch (error) {
      throw error
    }`
  )
  writeFixture(
    'src/error-shaped.ts',
    `export class ErrorShaped {
      name = 'ErrorShaped'
      message = 'not an Error subclass'
    }`
  )
  writeFixture('src/example.test.ts', `throw new Error('allowed in a test')`)
  writeFixture(
    'src/fixtures/failure.ts',
    `class FixtureFailure extends Error {}
    throw new FixtureFailure('allowed in a fixture')`
  )
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

test('uses resolved types and ignores test fixtures', () => {
  const diagnostics = checkErrorArchitecture({
    configFile: join(fixtureRoot, 'tsconfig.json'),
    sourceRoot,
    errorKernelFile: join(sourceRoot, 'shared/errors/kernel.ts')
  })

  expect(diagnostics).toEqual([
    expect.objectContaining({
      file: 'invalid-native.ts',
      line: 2,
      column: 18,
      rule: errorArchitectureRules.nativeSubclass
    }),
    expect.objectContaining({
      file: 'invalid-throw.ts',
      line: 2,
      column: 5,
      rule: errorArchitectureRules.thrownValue
    })
  ])
})

test('formats actionable lint diagnostics', () => {
  expect(
    formatErrorArchitectureDiagnostic({
      file: 'example.ts',
      line: 4,
      column: 7,
      rule: errorArchitectureRules.thrownValue,
      message: 'Thrown value is not assignable to BaseError.'
    })
  ).toBe(
    'example.ts:4:7 [error-architecture/throw-base-error] Thrown value is not assignable to BaseError.'
  )
})
