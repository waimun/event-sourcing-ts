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

const hasConnectionFailure = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false

  if ('code' in error && connectionFailureCodes.has(String(error.code))) return true
  if (error instanceof AggregateError && error.errors.some(hasConnectionFailure)) return true

  return 'cause' in error && hasConnectionFailure(error.cause)
}

const connectionFailureHint =
  'Check that PostgreSQL is running and `SHIPS_N_CARGO_DATABASE_URL` points to it before retrying.'

const databaseHint = (error: unknown, fallback: string): string =>
  hasConnectionFailure(error) ? connectionFailureHint : fallback

const formatFailure = (title: string, error: unknown, hint: string): string =>
  `${title}\n\n${indented(messageFrom(error))}\n\nHint: ${hint}`

export const formatDatabaseStartupFailure = (error: unknown): string =>
  formatFailure(
    'Server startup failed',
    error,
    databaseHint(
      error,
      'Check `SHIPS_N_CARGO_DATABASE_URL` and run `npm run db:setup` before retrying.'
    )
  )

export const formatDatabaseSetupFailure = (error: unknown): string =>
  formatFailure(
    'Database setup failed',
    error,
    databaseHint(
      error,
      'Check `SHIPS_N_CARGO_DATABASE_URL` and the database setup SQL before retrying.'
    )
  )

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
