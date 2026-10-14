import type { GlobalPosition } from './ports/event-journal'
import type { RebuildableShipOverviewProjection } from './ports/ship-overview-projection'

export interface ShipOverviewRebuildResult {
  readonly checkpoint: GlobalPosition
  readonly projectedEventCount: number
}

export const shipOverviewRebuildBatchSize = 100

export const rebuildShipOverview = async (
  projection: RebuildableShipOverviewProjection
): Promise<ShipOverviewRebuildResult> => {
  await projection.resetForRebuild()

  let checkpoint = 0n
  let projectedEventCount = 0
  let batchEventCount: number

  do {
    const batch = await projection.projectNextBatch(shipOverviewRebuildBatchSize)
    checkpoint = batch.checkpoint
    batchEventCount = batch.projectedEventCount
    projectedEventCount += batchEventCount
  } while (batchEventCount === shipOverviewRebuildBatchSize)

  return Object.freeze({ checkpoint, projectedEventCount })
}
