import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { createDefaultApplication } from './composition-root'
import { formatDatabaseSetupFailure, formatDatabaseStartupFailure } from './startup-failure'

const connectionString = process.env.TEST_POSTGRESQL_URL
const databaseTest = connectionString === undefined ? test.skip : test

databaseTest(
  'formats a real PostgreSQL authentication failure with its recovery hint',
  async () => {
    if (connectionString === undefined) throw new Error('TEST_POSTGRESQL_URL is required')

    const invalidConnectionUrl = new URL(connectionString)
    invalidConnectionUrl.password = 'invalid-password-for-startup-hint-test'

    let startupError: unknown
    try {
      const runtime = await createDefaultApplication({
        SHIPS_N_CARGO_POSTGRESQL_URL: invalidConnectionUrl.toString()
      })
      await runtime.close()
    } catch (error) {
      startupError = error
    }

    if (startupError === undefined) {
      throw new Error('PostgreSQL accepted the intentionally invalid password')
    }

    const formattedFailure = formatDatabaseStartupFailure(startupError)
    expect(formattedFailure).toContain('password authentication failed')
    expect(formattedFailure).toContain(
      'Hint: Check `SHIPS_N_CARGO_POSTGRESQL_URL` and run `npm run db:setup` before retrying.'
    )

    const formattedSetupFailure = formatDatabaseSetupFailure(startupError)
    expect(formattedSetupFailure).toContain('password authentication failed')
    expect(formattedSetupFailure).toContain(
      'Hint: Check the credentials in `SHIPS_N_CARGO_POSTGRESQL_URL` before retrying.'
    )
  }
)

test('formats a real SQLite cannot-open failure with its path recovery hint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ships-n-cargo-sqlite-startup-'))

  try {
    let startupError: unknown
    try {
      await createDefaultApplication({
        SHIPS_N_CARGO_SQLITE_PATH: join(directory, 'missing', 'journal.sqlite')
      })
    } catch (error) {
      startupError = error
    }

    expect(startupError).toMatchObject({ code: 'ERR_SQLITE_ERROR', errcode: 14 })
    const formattedFailure = formatDatabaseStartupFailure(startupError)
    expect(formattedFailure).toContain('unable to open database file')
    expect(formattedFailure).toContain(
      'Hint: Check `SHIPS_N_CARGO_SQLITE_PATH` and access to its parent directory before retrying.'
    )
  } finally {
    await rm(directory, { recursive: true })
  }
})

test('formats a real corrupt SQLite database failure with its database recovery hint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ships-n-cargo-sqlite-startup-'))
  const databasePath = join(directory, 'corrupt.sqlite')

  try {
    await writeFile(databasePath, 'this is not a SQLite database')

    let startupError: unknown
    try {
      await createDefaultApplication({ SHIPS_N_CARGO_SQLITE_PATH: databasePath })
    } catch (error) {
      startupError = error
    }

    expect(startupError).toMatchObject({ code: 'ERR_SQLITE_ERROR', errcode: 26 })
    const formattedFailure = formatDatabaseStartupFailure(startupError)
    expect(formattedFailure).toContain('file is not a database')
    expect(formattedFailure).toContain(
      'Hint: Check the SQLite database and its schema migrations before retrying.'
    )
  } finally {
    await rm(directory, { recursive: true })
  }
})
