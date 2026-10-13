import type { GlobalEventFeed, GlobalPosition } from '../../../application/ports/event-journal'
import type {
  ShipOverview,
  ShipOverviewProjection,
  ShipOverviewProjectionBatch
} from '../../../application/ports/ship-overview-projection'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { applyShipOverviewEvent, copyShipOverview } from './ship-overview'

export class InMemoryShipOverviewProjection implements ShipOverviewProjection {
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

  overviewForTesting(shipId: string): ShipOverview | undefined {
    const overview = this.overviews.get(shipId)
    return overview === undefined ? undefined : copyShipOverview(overview)
  }
}
