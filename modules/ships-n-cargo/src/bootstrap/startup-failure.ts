const messageFrom = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const indented = (message: string): string =>
  message
    .split('\n')
    .map((line) => (line === '' ? '' : `  ${line}`))
    .join('\n')

const formatStartupFailure = (reason: string, hint: string): string =>
  `Server startup failed\n\n${indented(reason)}\n\nHint: ${hint}`

export const formatDatabaseStartupFailure = (error: unknown): string =>
  formatStartupFailure(
    messageFrom(error),
    'Check `SHIPS_N_CARGO_DATABASE_URL` and run `npm run db:setup` before retrying.'
  )

export const formatServerListenFailure = (error: unknown, port: number): string => {
  const addressInUse =
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE'

  if (addressInUse) {
    return formatStartupFailure(
      `Port ${port} is already in use.`,
      `Stop the process using port ${port} before retrying.`
    )
  }

  return formatStartupFailure(messageFrom(error), 'Check the server configuration before retrying.')
}
