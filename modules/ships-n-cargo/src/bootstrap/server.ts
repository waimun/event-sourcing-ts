/* v8 ignore file -- @preserve */
import { createDefaultApplication } from './composition-root'
import { createGracefulShutdown, registerShutdownSignals } from './graceful-shutdown'
import { formatDatabaseStartupFailure, formatServerListenFailure } from './startup-failure'

const port = 3000

try {
  const runtime = await createDefaultApplication()
  runtime.start((error) => console.error('Ship overview projection failed', error))
  const reportShutdownFailure = (error: unknown): void => {
    console.error(error)
    process.exitCode = 1
  }
  const server = runtime.application.listen(port)
  const shutdown = createGracefulShutdown({
    closeResources: runtime.close,
    httpServer: server,
    reportFailure: reportShutdownFailure
  })
  registerShutdownSignals(shutdown)

  const handleListenError = async (error: Error): Promise<void> => {
    console.error(formatServerListenFailure(error, port))
    process.exitCode = 1
    await shutdown()
  }
  server.once('error', handleListenError)
  server.once('listening', () => {
    server.off('error', handleListenError)
    console.log(`API listening at http://localhost:${port}`)
  })
} catch (error) {
  console.error(formatDatabaseStartupFailure(error))
  process.exitCode = 1
}
