import { CancelVoyage } from '../../../domain/commands/cancel-voyage'
import { ShipNotAtPort, VoyageRequiredToCancel } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Ship } from '../../../domain/ship'
import type { VoyageChangeReason } from '../../../domain/voyage-change-reason'
import type { Id } from '../../../shared/domain/id'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

type CancelVoyageFailure =
  | ShipNotFound
  | ShipNotAtPort
  | VoyageRequiredToCancel
  | ConcurrentCommandConflict

export class CancelVoyageUseCase {
  constructor(private readonly journal: EventJournal<string, DomainEvent>) {}

  async cancel(id: Id, reason: VoyageChangeReason): Promise<Result<void, CancelVoyageFailure>> {
    const command = new CancelVoyage(id, reason)
    return rerunConcurrentCommand<void, ShipNotFound | ShipNotAtPort | VoyageRequiredToCancel>(
      id.value,
      async () => {
        const { events, version } = await this.journal.eventsByAggregate(id.value)
        if (events.length === 0) return failure(new ShipNotFound(id.value))

        const ship = Ship.replay(events)
        let voyageCancelled: ReturnType<typeof Ship.cancelVoyage>
        try {
          voyageCancelled = Ship.cancelVoyage(command, ship)
        } catch (error) {
          if (error instanceof ShipNotAtPort || error instanceof VoyageRequiredToCancel) {
            return failure(error)
          }
          throw error
        }

        await this.journal.append(id.value, version, [voyageCancelled])
        return success()
      }
    )
  }
}
