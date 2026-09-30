import type { Server } from 'node:http'

type HttpServer = Pick<Server, 'close' | 'listening'>

interface ShutdownSignalSource {
  on: (signal: 'SIGINT' | 'SIGTERM', listener: () => void) => unknown
}

interface GracefulShutdownDependencies {
  closeResources: () => Promise<void>
  httpServer: HttpServer
  reportFailure: (error: unknown) => void
}

const closeHttpServer = async (server: HttpServer): Promise<void> => {
  if (!server.listening) return

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export const createGracefulShutdown = ({
  closeResources,
  httpServer,
  reportFailure
}: GracefulShutdownDependencies): (() => Promise<void>) => {
  let shutdown: Promise<void> | undefined

  return () => {
    shutdown ??= (async () => {
      try {
        await closeHttpServer(httpServer)
      } catch (error) {
        reportFailure(error)
      }

      try {
        await closeResources()
      } catch (error) {
        reportFailure(error)
      }
    })()

    return shutdown
  }
}

export const registerShutdownSignals = (
  shutdown: () => Promise<void>,
  signalSource: ShutdownSignalSource = process
): void => {
  signalSource.on('SIGINT', shutdown)
  signalSource.on('SIGTERM', shutdown)
}
