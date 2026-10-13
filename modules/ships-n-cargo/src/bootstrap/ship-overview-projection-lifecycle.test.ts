import { afterEach, describe, expect, test, vi } from 'vitest'
import type { ShipOverviewProjection } from '../application/ports/ship-overview-projection'
import { ShipOverviewProjectionLifecycle } from './ship-overview-projection-lifecycle'

const projectionWith = (
  projectNextBatch: ShipOverviewProjection['projectNextBatch']
): ShipOverviewProjection => ({ projectNextBatch })

const allowProjectionToRun = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
}

describe('ship overview projection lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('drains full batches immediately and polls after catching up', async () => {
    vi.useFakeTimers()
    const projectNextBatch = vi
      .fn<ShipOverviewProjection['projectNextBatch']>()
      .mockResolvedValueOnce({ checkpoint: 100n, projectedEventCount: 100 })
      .mockResolvedValue({ checkpoint: 101n, projectedEventCount: 1 })
    const lifecycle = new ShipOverviewProjectionLifecycle(projectionWith(projectNextBatch))

    lifecycle.start(vi.fn())
    await allowProjectionToRun()

    expect(projectNextBatch).toHaveBeenCalledTimes(2)
    expect(projectNextBatch).toHaveBeenCalledWith(100)

    await vi.advanceTimersByTimeAsync(99)
    expect(projectNextBatch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(projectNextBatch).toHaveBeenCalledTimes(3)

    await lifecycle.stop()
  })

  test('reports a projection failure and retries it without stopping the loop', async () => {
    vi.useFakeTimers()
    const failure = new Error('database temporarily unavailable')
    const projectNextBatch = vi
      .fn<ShipOverviewProjection['projectNextBatch']>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue({ checkpoint: 4n, projectedEventCount: 0 })
    const reportFailure = vi.fn()
    const lifecycle = new ShipOverviewProjectionLifecycle(projectionWith(projectNextBatch))

    lifecycle.start(reportFailure)
    await allowProjectionToRun()

    expect(reportFailure).toHaveBeenCalledExactlyOnceWith(failure)
    expect(projectNextBatch).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(999)
    expect(projectNextBatch).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    expect(projectNextBatch).toHaveBeenCalledTimes(2)

    await lifecycle.stop()
  })

  test('stops an idle lifecycle promptly and is safe to stop more than once', async () => {
    vi.useFakeTimers()
    const projectNextBatch = vi
      .fn<ShipOverviewProjection['projectNextBatch']>()
      .mockResolvedValue({ checkpoint: 0n, projectedEventCount: 0 })
    const lifecycle = new ShipOverviewProjectionLifecycle(projectionWith(projectNextBatch))

    lifecycle.start(vi.fn())
    lifecycle.start(vi.fn())
    await allowProjectionToRun()

    await expect(Promise.all([lifecycle.stop(), lifecycle.stop()])).resolves.toEqual([
      undefined,
      undefined
    ])
    expect(projectNextBatch).toHaveBeenCalledOnce()
  })

  test('waits for an in-flight batch before stopping', async () => {
    vi.useFakeTimers()
    let finishBatch: (() => void) | undefined
    const projectNextBatch = vi.fn<ShipOverviewProjection['projectNextBatch']>(
      () =>
        new Promise((resolve) => {
          finishBatch = () => resolve({ checkpoint: 1n, projectedEventCount: 1 })
        })
    )
    const lifecycle = new ShipOverviewProjectionLifecycle(projectionWith(projectNextBatch))

    lifecycle.start(vi.fn())
    const stopped = vi.fn()
    const stopping = lifecycle.stop().then(stopped)
    await allowProjectionToRun()

    expect(stopped).not.toHaveBeenCalled()
    finishBatch?.()
    await stopping
    expect(stopped).toHaveBeenCalledOnce()
    expect(projectNextBatch).toHaveBeenCalledOnce()
  })

  test('can be stopped before it starts', async () => {
    const lifecycle = new ShipOverviewProjectionLifecycle(
      projectionWith(vi.fn<ShipOverviewProjection['projectNextBatch']>())
    )

    await expect(lifecycle.stop()).resolves.toBeUndefined()
  })
})
