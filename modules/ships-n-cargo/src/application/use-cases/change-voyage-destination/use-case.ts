import { ChangeVoyageDestination } from '../../../domain/commands/change-voyage-destination'
import {
  ShipNotAtPort,
  VoyageDestinationSameAsOrigin,
  VoyageDestinationUnchanged,
  VoyageRequiredToChangeDestination
} from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import type { VoyageChangeReason } from '../../../domain/voyage-change-reason'
import type { Id } from '../../../shared/domain/id'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

type ChangeVoyageDestinationFailure =
  | ShipNotFound
  | ShipNotAtPort
  | VoyageRequiredToChangeDestination
  | VoyageDestinationSameAsOrigin
  | VoyageDestinationUnchanged
  | ConcurrentCommandConflict

type DomainFailure =
  | ShipNotFound
  | ShipNotAtPort
  | VoyageRequiredToChangeDestination
  | VoyageDestinationSameAsOrigin
  | VoyageDestinationUnchanged

export class ChangeVoyageDestinationUseCase {
  constructor(private readonly journal: EventJournal<string, DomainEvent>) {}

  async change(
    id: Id,
    destination: Port,
    reason: VoyageChangeReason
  ): Promise<Result<void, ChangeVoyageDestinationFailure>> {
    const command = new ChangeVoyageDestination(id, destination, reason)
    return rerunConcurrentCommand<void, DomainFailure>(id.value, async () => {
      const { events, version } = await this.journal.eventsByAggregate(id.value)
      if (events.length === 0) return failure(new ShipNotFound(id.value))

      const ship = Ship.replay(events)
      let destinationChanged: ReturnType<typeof Ship.changeVoyageDestination>
      try {
        destinationChanged = Ship.changeVoyageDestination(command, ship)
      } catch (error) {
        if (
          error instanceof ShipNotAtPort ||
          error instanceof VoyageRequiredToChangeDestination ||
          error instanceof VoyageDestinationSameAsOrigin ||
          error instanceof VoyageDestinationUnchanged
        ) {
          return failure(error)
        }
        throw error
      }

      await this.journal.append(id.value, version, [destinationChanged])
      return success()
    })
  }
}
