import { expect, test } from 'vitest'
import { EventJournalSchemaIncompatible } from '../adapters/outbound/persistence/errors/event-journal'
import { EventJournalConfigurationInvalid } from './errors/event-journal-configuration-invalid'
import {
  formatDatabaseSetupFailure,
  formatDatabaseStartupFailure,
  formatServerListenFailure
} from './startup-failure'

test('formats database startup failures with a separate hint', () => {
  expect(formatDatabaseStartupFailure(new Error('password authentication failed'))).toBe(
    [
      'Server startup failed',
      '',
      '  password authentication failed',
      '',
      'Hint: Check `SHIPS_N_CARGO_POSTGRESQL_URL` and run `npm run db:setup` before retrying.'
    ].join('\n')
  )
})

test('points invalid event-journal configuration to its environment settings', () => {
  expect(
    formatDatabaseStartupFailure(
      new EventJournalConfigurationInvalid(
        'SHIPS_N_CARGO_POSTGRESQL_URL and SHIPS_N_CARGO_SQLITE_PATH cannot both be set'
      )
    )
  ).toBe(
    [
      'Server startup failed',
      '',
      '  Event journal configuration is invalid: SHIPS_N_CARGO_POSTGRESQL_URL and SHIPS_N_CARGO_SQLITE_PATH cannot both be set',
      '',
      'Hint: Check the event-journal environment settings before retrying.'
    ].join('\n')
  )
})

test('points SQLite startup failures to the configured file path', () => {
  const error = Object.assign(new Error('unable to open database file'), {
    code: 'ERR_SQLITE_ERROR',
    errcode: 14
  })

  expect(formatDatabaseStartupFailure(error)).toBe(
    [
      'Server startup failed',
      '',
      '  unable to open database file',
      '',
      'Hint: Check `SHIPS_N_CARGO_SQLITE_PATH` and access to its parent directory before retrying.'
    ].join('\n')
  )
})

test('does not blame the SQLite path for other SQLite failures', () => {
  const error = Object.assign(new Error('near "BROKEN": syntax error'), {
    code: 'ERR_SQLITE_ERROR',
    errcode: 1
  })

  expect(formatDatabaseStartupFailure(error)).toBe(
    [
      'Server startup failed',
      '',
      '  near "BROKEN": syntax error',
      '',
      'Hint: Check the SQLite database and its schema migrations before retrying.'
    ].join('\n')
  )
})

test('points incompatible SQLite migration versions to its schema migrations', () => {
  const error = new EventJournalSchemaIncompatible(
    'SQLite',
    'applied migration versions [2] are not a prefix of bundled versions [1]'
  )

  expect(formatDatabaseStartupFailure(error)).toBe(
    [
      'Server startup failed',
      '',
      '  SQLite event journal schema is incompatible: applied migration versions [2] are not a prefix of bundled versions [1]',
      '',
      'Hint: Check the SQLite database and its schema migrations before retrying.'
    ].join('\n')
  )
})

test('shows each refused PostgreSQL connection when an aggregate failure has no message', () => {
  const error = new AggregateError([
    Object.assign(new Error('connect ECONNREFUSED ::1:5432'), { code: 'ECONNREFUSED' }),
    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
      code: 'ECONNREFUSED'
    })
  ])

  expect(formatDatabaseStartupFailure(error)).toBe(
    [
      'Server startup failed',
      '',
      '  connect ECONNREFUSED ::1:5432',
      '  connect ECONNREFUSED 127.0.0.1:5432',
      '',
      'Hint: Check that PostgreSQL is running and `SHIPS_N_CARGO_POSTGRESQL_URL` points to it before retrying.'
    ].join('\n')
  )
})

test('formats database setup connection failures with the same nested details and hint', () => {
  const error = new AggregateError([
    Object.assign(new Error('connect ECONNREFUSED ::1:5432'), { code: 'ECONNREFUSED' }),
    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
      code: 'ECONNREFUSED'
    })
  ])

  expect(formatDatabaseSetupFailure(error)).toBe(
    [
      'Database setup failed',
      '',
      '  connect ECONNREFUSED ::1:5432',
      '  connect ECONNREFUSED 127.0.0.1:5432',
      '',
      'Hint: Check that PostgreSQL is running and `SHIPS_N_CARGO_POSTGRESQL_URL` points to it before retrying.'
    ].join('\n')
  )
})

test('points PostgreSQL authentication failures to the configured credentials', () => {
  const error = Object.assign(new Error('password authentication failed for user "ships"'), {
    code: '28P01'
  })

  expect(formatDatabaseSetupFailure(error)).toBe(
    [
      'Database setup failed',
      '',
      '  password authentication failed for user "ships"',
      '',
      'Hint: Check the credentials in `SHIPS_N_CARGO_POSTGRESQL_URL` before retrying.'
    ].join('\n')
  )
})

test('points a missing PostgreSQL database to the configured database name', () => {
  const error = Object.assign(new Error('database "ships" does not exist'), { code: '3D000' })

  expect(formatDatabaseSetupFailure(error)).toBe(
    [
      'Database setup failed',
      '',
      '  database "ships" does not exist',
      '',
      'Hint: Check the database name in `SHIPS_N_CARGO_POSTGRESQL_URL` before retrying.'
    ].join('\n')
  )
})

test('points insufficient PostgreSQL privileges to migration permissions', () => {
  const error = Object.assign(new Error('permission denied for schema ships_n_cargo'), {
    code: '42501'
  })

  expect(formatDatabaseSetupFailure(error)).toBe(
    [
      'Database setup failed',
      '',
      '  permission denied for schema ships_n_cargo',
      '',
      'Hint: Ensure the user in `SHIPS_N_CARGO_POSTGRESQL_URL` can apply schema migrations before retrying.'
    ].join('\n')
  )
})

test('points other database setup failures to the PostgreSQL schema migrations', () => {
  expect(formatDatabaseSetupFailure(new Error('migration rejected'))).toBe(
    [
      'Database setup failed',
      '',
      '  migration rejected',
      '',
      'Hint: Check the PostgreSQL event journal schema migrations before retrying.'
    ].join('\n')
  )
})

test('recognizes a PostgreSQL code nested inside an aggregate setup failure', () => {
  const error = new AggregateError([
    Object.assign(new Error('password authentication failed for user "ships"'), {
      code: '28P01'
    })
  ])

  expect(formatDatabaseSetupFailure(error)).toContain(
    'Hint: Check the credentials in `SHIPS_N_CARGO_POSTGRESQL_URL` before retrying.'
  )
})

test('recognizes a connection failure retained as the cause of a higher-level error', () => {
  const connectionFailure = Object.assign(new Error('getaddrinfo ENOTFOUND database'), {
    code: 'ENOTFOUND'
  })
  const error = new Error('could not initialize the database pool', { cause: connectionFailure })

  expect(formatDatabaseStartupFailure(error)).toBe(
    [
      'Server startup failed',
      '',
      '  could not initialize the database pool',
      '',
      'Hint: Check that PostgreSQL is running and `SHIPS_N_CARGO_POSTGRESQL_URL` points to it before retrying.'
    ].join('\n')
  )
})

test('safely formats a non-error database setup failure', () => {
  expect(formatDatabaseSetupFailure('setup rejected')).toBe(
    [
      'Database setup failed',
      '',
      '  setup rejected',
      '',
      'Hint: Check the PostgreSQL event journal schema migrations before retrying.'
    ].join('\n')
  )
})

test('indents every line in a multi-line database failure', () => {
  expect(
    formatDatabaseStartupFailure(new Error('schema is incompatible\n\nExpected columns:'))
  ).toBe(
    [
      'Server startup failed',
      '',
      '  schema is incompatible',
      '',
      '  Expected columns:',
      '',
      'Hint: Check `SHIPS_N_CARGO_POSTGRESQL_URL` and run `npm run db:setup` before retrying.'
    ].join('\n')
  )
})

test('explains how to recover when the server port is already in use', () => {
  const error = Object.assign(new Error('listen EADDRINUSE: address already in use'), {
    code: 'EADDRINUSE'
  })

  expect(formatServerListenFailure(error, 3000)).toBe(
    [
      'Server startup failed',
      '',
      '  Port 3000 is already in use.',
      '',
      'Hint: Stop the process using port 3000 before retrying.'
    ].join('\n')
  )
})

test('formats unexpected listen failures without exposing an object representation', () => {
  expect(formatServerListenFailure(new Error('permission denied'), 3000)).toBe(
    [
      'Server startup failed',
      '',
      '  permission denied',
      '',
      'Hint: Check the server configuration before retrying.'
    ].join('\n')
  )
})
