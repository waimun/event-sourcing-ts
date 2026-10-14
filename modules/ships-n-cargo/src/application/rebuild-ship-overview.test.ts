import { expect, test, vi } from 'vitest'
import type { RebuildableShipOverviewProjection } from './ports/ship-overview-projection'
import { rebuildShipOverview, shipOverviewRebuildBatchSize } from './rebuild-ship-overview'

test('clears the projection before replaying the complete feed in bounded batches', async () => {
  const calls: string[] = []
  const resetForRebuild = vi.fn(async () => {
    calls.push('reset')
  })
  const projectNextBatch = vi
    .fn<RebuildableShipOverviewProjection['projectNextBatch']>()
    .mockImplementationOnce(async (batchSize) => {
      calls.push(`project ${batchSize}`)
      return { checkpoint: 100n, projectedEventCount: shipOverviewRebuildBatchSize }
    })
    .mockImplementationOnce(async (batchSize) => {
      calls.push(`project ${batchSize}`)
      return { checkpoint: 103n, projectedEventCount: 3 }
    })
  const projection = { projectNextBatch, resetForRebuild }

  await expect(rebuildShipOverview(projection)).resolves.toEqual({
    checkpoint: 103n,
    projectedEventCount: 103
  })
  expect(calls).toEqual(['reset', 'project 100', 'project 100'])
})

test('still checks the feed after clearing an already-empty projection', async () => {
  const projection: RebuildableShipOverviewProjection = {
    projectNextBatch: vi.fn().mockResolvedValue({ checkpoint: 0n, projectedEventCount: 0 }),
    resetForRebuild: vi.fn()
  }

  await expect(rebuildShipOverview(projection)).resolves.toEqual({
    checkpoint: 0n,
    projectedEventCount: 0
  })
  expect(projection.projectNextBatch).toHaveBeenCalledOnce()
})

test('does not replay when clearing the projection fails', async () => {
  const resetFailure = new Error('reset failed')
  const projection: RebuildableShipOverviewProjection = {
    projectNextBatch: vi.fn(),
    resetForRebuild: vi.fn().mockRejectedValue(resetFailure)
  }

  await expect(rebuildShipOverview(projection)).rejects.toBe(resetFailure)
  expect(projection.projectNextBatch).not.toHaveBeenCalled()
})
