import type { GlobalEventFeed, GlobalPosition } from '../../../application/ports/event-journal'
import type {
  ShipOverview,
  ShipOverviewFilter,
  ShipOverviewProjection,
  ShipOverviewProjectionBatch,
  ShipOverviewQueries
} from '../../../application/ports/ship-overview-projection'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { applyShipOverviewEvent, copyShipOverview } from './ship-overview'

export class InMemoryShipOverviewProjection implements ShipOverviewProjection, ShipOverviewQueries {
  private checkpoint: GlobalPosition = 0n
  private overviews = new Map<string, ShipOverview>()

  constructor(private readonly feed: GlobalEventFeed<string, DomainEvent>) {}

  async projectNextBatch(batchSize: number): Promise<ShipOverviewProjectionBatch> {
    const entries = await this.feed.globalEventsAfter(this.checkpoint, batchSize)
    const nextOverviews = new Map(this.overviews)

    for (const entry of entries) {
      nextOverviews.set(
        entry.aggregateId,
        applyShipOverviewEvent(nextOverviews.get(entry.aggregateId), entry.event)
      )
    }

    const checkpoint = entries.at(-1)?.position ?? this.checkpoint
    this.overviews = nextOverviews
    this.checkpoint = checkpoint
    return Object.freeze({ checkpoint, projectedEventCount: entries.length })
  }

  async overviewFor(shipId: string): Promise<ShipOverview | undefined> {
    const overview = this.overviews.get(shipId)
    return overview === undefined ? undefined : copyShipOverview(overview)
  }

  async overviewsMatching(filter: ShipOverviewFilter): Promise<readonly ShipOverview[]> {
    return Object.freeze(
      [...this.overviews.values()]
        .filter((overview) =>
          'status' in filter
            ? overview.status === filter.status
            : overview.currentPort?.name === filter.currentPort.name &&
              overview.currentPort.country === filter.currentPort.country
        )
        .sort((left, right) => left.shipId.localeCompare(right.shipId))
        .map(copyShipOverview)
    )
  }
}
