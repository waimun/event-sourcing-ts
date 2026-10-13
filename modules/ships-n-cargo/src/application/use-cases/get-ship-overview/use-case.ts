import type { Id } from '../../../shared/domain/id'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { ShipOverview, ShipOverviewQueries } from '../../ports/ship-overview-projection'
import { failure, type Result, success } from '../../result'

export class GetShipOverviewUseCase {
  constructor(private readonly queries: ShipOverviewQueries) {}

  async execute(id: Id): Promise<Result<ShipOverview, ShipNotFound>> {
    const overview = await this.queries.overviewFor(id.value)
    return overview === undefined ? failure(new ShipNotFound(id.value)) : success(overview)
  }
}
