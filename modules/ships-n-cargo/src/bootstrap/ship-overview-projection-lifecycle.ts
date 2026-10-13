import type { ShipOverviewProjection } from '../application/ports/ship-overview-projection'

const batchSize = 100
const idleDelayMilliseconds = 100
const retryDelayMilliseconds = 1_000

const wait = async (delayMilliseconds: number, signal: AbortSignal): Promise<void> => {
  if (signal.aborted) return

  await new Promise<void>((resolve) => {
    const finish = (): void => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timeout = setTimeout(finish, delayMilliseconds)
    signal.addEventListener('abort', finish, { once: true })
  })
}

export type ReportProjectionFailure = (error: unknown) => void

export class ShipOverviewProjectionLifecycle {
  private abortController: AbortController | undefined
  private task: Promise<void> | undefined

  constructor(private readonly projection: ShipOverviewProjection) {}

  start(reportFailure: ReportProjectionFailure): void {
    if (this.task !== undefined) return

    this.abortController = new AbortController()
    this.task = this.run(this.abortController.signal, reportFailure)
  }

  async stop(): Promise<void> {
    this.abortController?.abort()
    await this.task
  }

  private async run(signal: AbortSignal, reportFailure: ReportProjectionFailure): Promise<void> {
    while (!signal.aborted) {
      try {
        const batch = await this.projection.projectNextBatch(batchSize)
        if (batch.projectedEventCount === batchSize) continue
        await wait(idleDelayMilliseconds, signal)
      } catch (error) {
        reportFailure(error)
        await wait(retryDelayMilliseconds, signal)
      }
    }
  }
}
