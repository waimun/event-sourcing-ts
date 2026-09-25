import { expect, test, vi } from 'vitest'
import { Id } from '../../../shared/domain/id'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { ShipHistoryProjection } from '../../ports/ship-history-projection'
import { GetShipHistoryUseCase } from './use-case'

test('returns projected ship history', async () => {
  const history = { shipId: 'ship-1', history: [] }
  const projection: ShipHistoryProjection = {
    historyFor: vi.fn().mockResolvedValue(history)
  }

  await expect(new GetShipHistoryUseCase(projection).execute(new Id('ship-1'))).resolves.toEqual({
    ok: true,
    value: history
  })
})

test('returns ship not found when no history has been projected', async () => {
  const projection: ShipHistoryProjection = {
    historyFor: vi.fn().mockResolvedValue(undefined)
  }

  await expect(new GetShipHistoryUseCase(projection).execute(new Id('missing'))).resolves.toEqual({
    ok: false,
    error: new ShipNotFound('missing')
  })
})
