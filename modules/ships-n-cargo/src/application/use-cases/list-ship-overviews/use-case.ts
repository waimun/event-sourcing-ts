import type { ShipOverviewFilter, ShipOverviewQueries } from '../../ports/ship-overview-projection'

export class ListShipOverviewsUseCase {
  constructor(private readonly queries: ShipOverviewQueries) {}

  async execute(filter: ShipOverviewFilter) {
    return Object.freeze({ ships: await this.queries.overviewsMatching(filter) })
  }
}
