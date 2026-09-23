import { expect, test } from 'vitest'
import { formatDatabaseStartupFailure, formatServerListenFailure } from './startup-failure'

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
