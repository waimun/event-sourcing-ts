import type { Server } from 'node:http'
import { describe, expect, test, vi } from 'vitest'
import { createGracefulShutdown, registerShutdownSignals } from './graceful-shutdown'

const listeningServer = (close: Server['close']): Pick<Server, 'close' | 'listening'> => ({
  close,
  listening: true
})

describe('graceful shutdown', () => {
  test('registers the same shutdown handler for SIGINT and SIGTERM', () => {
    const shutdown = vi.fn(async () => undefined)
    const on = vi.fn()

    registerShutdownSignals(shutdown, { on })

    expect(on).toHaveBeenNthCalledWith(1, 'SIGINT', shutdown)
    expect(on).toHaveBeenNthCalledWith(2, 'SIGTERM', shutdown)
  })

  test('drains the HTTP server before closing resources', async () => {
    const order: string[] = []
    let finishDraining: (() => void) | undefined
    const close = vi.fn((callback?: (error?: Error) => void) => {
      order.push('stop accepting requests')
      finishDraining = () => {
        order.push('requests drained')
        callback?.()
      }
      return undefined as unknown as Server
    }) as Server['close']
    const closeResources = vi.fn(async () => {
      order.push('resources closed')
    })
    const shutdown = createGracefulShutdown({
      closeResources,
      httpServer: listeningServer(close),
      reportFailure: vi.fn()
    })

    const completion = shutdown()
    expect(order).toEqual(['stop accepting requests'])

    finishDraining?.()
    await completion

    expect(order).toEqual(['stop accepting requests', 'requests drained', 'resources closed'])
  })

  test('closes the HTTP server and resources exactly once across concurrent signals', async () => {
    const close = vi.fn((callback?: (error?: Error) => void) => {
      callback?.()
      return undefined as unknown as Server
    }) as Server['close']
    const closeResources = vi.fn(async () => undefined)
    const shutdown = createGracefulShutdown({
      closeResources,
      httpServer: listeningServer(close),
      reportFailure: vi.fn()
    })
    const listeners = new Map<string, () => void>()
    registerShutdownSignals(shutdown, {
      on: (signal, listener) => listeners.set(signal, listener)
    })

    listeners.get('SIGINT')?.()
    listeners.get('SIGTERM')?.()
    listeners.get('SIGINT')?.()
    await shutdown()

    expect(close).toHaveBeenCalledOnce()
    expect(closeResources).toHaveBeenCalledOnce()
  })

  test('closes resources when stopping the HTTP server fails and reports both close failures', async () => {
    const serverFailure = new Error('server close failed')
    const resourceFailure = new Error('resource close failed')
    const close = vi.fn((callback?: (error?: Error) => void) => {
      callback?.(serverFailure)
      return undefined as unknown as Server
    }) as Server['close']
    const closeResources = vi.fn().mockRejectedValue(resourceFailure)
    const reportFailure = vi.fn()
    const shutdown = createGracefulShutdown({
      closeResources,
      httpServer: listeningServer(close),
      reportFailure
    })

    await expect(shutdown()).resolves.toBeUndefined()

    expect(closeResources).toHaveBeenCalledOnce()
    expect(reportFailure).toHaveBeenNthCalledWith(1, serverFailure)
    expect(reportFailure).toHaveBeenNthCalledWith(2, resourceFailure)
  })

  test('skips HTTP close when the server never started and still closes resources', async () => {
    const close = vi.fn() as unknown as Server['close']
    const closeResources = vi.fn(async () => undefined)
    const shutdown = createGracefulShutdown({
      closeResources,
      httpServer: { close, listening: false },
      reportFailure: vi.fn()
    })

    await shutdown()

    expect(close).not.toHaveBeenCalled()
    expect(closeResources).toHaveBeenCalledOnce()
  })
})
