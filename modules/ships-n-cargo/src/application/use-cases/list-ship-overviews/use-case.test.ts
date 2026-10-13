import { expect, test, vi } from 'vitest'
import type { ShipOverviewQueries } from '../../ports/ship-overview-projection'
import { ListShipOverviewsUseCase } from './use-case'

test('returns matching materialized ship overviews', async () => {
  const ships = [{ name: 'King Roy', shipId: 'ship-1', status: 'at-sea' as const }]
  const queries = {
    overviewsMatching: vi.fn().mockResolvedValue(ships)
  } as unknown as ShipOverviewQueries
  const filter = { status: 'at-sea' as const }

  await expect(new ListShipOverviewsUseCase(queries).execute(filter)).resolves.toEqual({ ships })
  expect(queries.overviewsMatching).toHaveBeenCalledWith(filter)
})
