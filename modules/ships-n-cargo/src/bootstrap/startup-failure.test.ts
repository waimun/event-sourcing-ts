import { expect, test } from 'vitest'
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
      'Hint: Check `SHIPS_N_CARGO_DATABASE_URL` and run `npm run db:setup` before retrying.'
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
      'Hint: Check that PostgreSQL is running and `SHIPS_N_CARGO_DATABASE_URL` points to it before retrying.'
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
      'Hint: Check that PostgreSQL is running and `SHIPS_N_CARGO_DATABASE_URL` points to it before retrying.'
    ].join('\n')
  )
})

test('keeps non-connection database setup failures on their general recovery path', () => {
  expect(formatDatabaseSetupFailure(new Error('permission denied for schema ships_n_cargo'))).toBe(
    [
      'Database setup failed',
      '',
      '  permission denied for schema ships_n_cargo',
      '',
      'Hint: Check `SHIPS_N_CARGO_DATABASE_URL` and the database setup SQL before retrying.'
    ].join('\n')
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
      'Hint: Check that PostgreSQL is running and `SHIPS_N_CARGO_DATABASE_URL` points to it before retrying.'
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
      'Hint: Check `SHIPS_N_CARGO_DATABASE_URL` and the database setup SQL before retrying.'
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
      'Hint: Check `SHIPS_N_CARGO_DATABASE_URL` and run `npm run db:setup` before retrying.'
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
