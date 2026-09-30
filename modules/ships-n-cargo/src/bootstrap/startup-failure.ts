const messageFrom = (error: unknown): string => {
  if (error instanceof AggregateError && error.message.trim() === '') {
    const nestedMessages = error.errors.map(messageFrom).filter((message) => message.trim() !== '')

    if (nestedMessages.length > 0) return nestedMessages.join('\n')
  }

  return error instanceof Error ? error.message : String(error)
}

const indented = (message: string): string =>
  message
    .split('\n')
    .map((line) => (line === '' ? '' : `  ${line}`))
    .join('\n')

const connectionFailureCodes = new Set([
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT'
])

const hasNestedErrorMatching = (
  error: unknown,
  matches: (candidate: object) => boolean
): boolean => {
  if (typeof error !== 'object' || error === null) return false

  if (matches(error)) return true
  if (
    error instanceof AggregateError &&
    error.errors.some((nestedError) => hasNestedErrorMatching(nestedError, matches))
  )
    return true

  return 'cause' in error && hasNestedErrorMatching(error.cause, matches)
}

const hasConnectionFailure = (error: unknown): boolean =>
  hasNestedErrorMatching(
    error,
    (candidate) => 'code' in candidate && connectionFailureCodes.has(String(candidate.code))
  )

const connectionFailureHint =
  'Check that PostgreSQL is running and `SHIPS_N_CARGO_POSTGRESQL_URL` points to it before retrying.'

const databaseHint = (error: unknown, fallback: string): string =>
  hasConnectionFailure(error) ? connectionFailureHint : fallback

const hasCode = (error: unknown, code: string): boolean =>
  hasNestedErrorMatching(error, (candidate) => 'code' in candidate && candidate.code === code)

const isSqliteCannotOpenFailure = (error: unknown): boolean =>
  hasNestedErrorMatching(
    error,
    (candidate) =>
      'code' in candidate &&
      candidate.code === 'ERR_SQLITE_ERROR' &&
      'errcode' in candidate &&
      candidate.errcode === 14
  )

const isSqliteSchemaFailure = (error: unknown): boolean =>
  hasNestedErrorMatching(error, (candidate) => {
    if (!('code' in candidate) || candidate.code !== 'EVENT_JOURNAL_SCHEMA_INCOMPATIBLE')
      return false
    if (!('meta' in candidate) || typeof candidate.meta !== 'object' || candidate.meta === null)
      return false
    return 'database' in candidate.meta && candidate.meta.database === 'SQLite'
  })

const formatFailure = (title: string, error: unknown, hint: string): string =>
  `${title}\n\n${indented(messageFrom(error))}\n\nHint: ${hint}`

export const formatDatabaseStartupFailure = (error: unknown): string => {
  let hint: string
  if (hasCode(error, 'EVENT_JOURNAL_CONFIGURATION_INVALID')) {
    hint = 'Check the event-journal environment settings before retrying.'
  } else if (isSqliteCannotOpenFailure(error)) {
    hint = 'Check `SHIPS_N_CARGO_SQLITE_PATH` and access to its parent directory before retrying.'
  } else if (hasCode(error, 'ERR_SQLITE_ERROR') || isSqliteSchemaFailure(error)) {
    hint = 'Check the SQLite database and its schema migrations before retrying.'
  } else {
    hint = databaseHint(
      error,
      'Check `SHIPS_N_CARGO_POSTGRESQL_URL` and run `npm run db:setup` before retrying.'
    )
  }
  return formatFailure('Server startup failed', error, hint)
}

const databaseSetupHint = (error: unknown): string => {
  if (hasConnectionFailure(error)) return connectionFailureHint
  if (hasCode(error, '28P01') || hasCode(error, '28000'))
    return 'Check the credentials in `SHIPS_N_CARGO_POSTGRESQL_URL` before retrying.'
  if (hasCode(error, '3D000'))
    return 'Check the database name in `SHIPS_N_CARGO_POSTGRESQL_URL` before retrying.'
  if (hasCode(error, '42501'))
    return 'Ensure the user in `SHIPS_N_CARGO_POSTGRESQL_URL` can apply schema migrations before retrying.'
  return 'Check the PostgreSQL event journal schema migrations before retrying.'
}

export const formatDatabaseSetupFailure = (error: unknown): string =>
  formatFailure('Database setup failed', error, databaseSetupHint(error))

export const formatServerListenFailure = (error: unknown, port: number): string => {
  const addressInUse =
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE'

  if (addressInUse) {
    return formatFailure(
      'Server startup failed',
      `Port ${port} is already in use.`,
      `Stop the process using port ${port} before retrying.`
    )
  }

  return formatFailure(
    'Server startup failed',
    error,
    'Check the server configuration before retrying.'
  )
}
