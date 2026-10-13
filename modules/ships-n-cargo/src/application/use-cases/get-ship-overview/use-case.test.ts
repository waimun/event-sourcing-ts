import { expect, test, vi } from 'vitest'
import { Id } from '../../../shared/domain/id'
import type { ShipOverviewQueries } from '../../ports/ship-overview-projection'
import { GetShipOverviewUseCase } from './use-case'

const overview = { name: 'King Roy', shipId: 'ship-1', status: 'at-sea' as const }

test('returns a materialized ship overview', async () => {
  const queries = {
    overviewFor: vi.fn().mockResolvedValue(overview)
  } as unknown as ShipOverviewQueries

  await expect(new GetShipOverviewUseCase(queries).execute(new Id('ship-1'))).resolves.toEqual({
    ok: true,
    value: overview
  })
})

test('returns ship not found when no overview has been projected', async () => {
  const queries = {
    overviewFor: vi.fn().mockResolvedValue(undefined)
  } as unknown as ShipOverviewQueries

  await expect(
    new GetShipOverviewUseCase(queries).execute(new Id('missing'))
  ).resolves.toMatchObject({
    error: { code: 'SHIP_NOT_FOUND' },
    ok: false
  })
})
