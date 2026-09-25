import type { Id } from '../../../shared/domain/id'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { ShipHistory, ShipHistoryProjection } from '../../ports/ship-history-projection'
import { failure, type Result, success } from '../../result'

export class GetShipHistoryUseCase {
  constructor(private readonly projection: ShipHistoryProjection) {}

  async execute(id: Id): Promise<Result<ShipHistory, ShipNotFound>> {
    const history = await this.projection.historyFor(id.value)
    return history === undefined ? failure(new ShipNotFound(id.value)) : success(history)
  }
}
