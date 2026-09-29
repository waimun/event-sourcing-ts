import { expect, test } from 'vitest'
import { createDefaultApplication } from './composition-root'
import { formatDatabaseStartupFailure } from './startup-failure'

const connectionString = process.env.TEST_DATABASE_URL
const databaseTest = connectionString === undefined ? test.skip : test

databaseTest(
  'formats a real PostgreSQL authentication failure with its recovery hint',
  async () => {
    if (connectionString === undefined) throw new Error('TEST_DATABASE_URL is required')

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
  }
)
