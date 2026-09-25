import { DivertShip } from '../../../domain/commands/divert-ship'
import { ShipNotAtSea, VoyageDestinationUnchanged } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import type { Id } from '../../../shared/domain/id'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

type DivertShipFailure =
  | ShipNotFound
  | ShipNotAtSea
  | VoyageDestinationUnchanged
  | ConcurrentCommandConflict

export class DivertShipUseCase {
  constructor(private readonly journal: EventJournal<string, DomainEvent>) {}

  async divert(id: Id, destination: Port): Promise<Result<void, DivertShipFailure>> {
    const command = new DivertShip(id, destination)
    return rerunConcurrentCommand<void, ShipNotFound | ShipNotAtSea | VoyageDestinationUnchanged>(
      id.value,
      async () => {
        const { events, version } = await this.journal.eventsByAggregate(id.value)
        if (events.length === 0) return failure(new ShipNotFound(id.value))

        const ship = Ship.replay(events)
        let voyageDiverted: ReturnType<typeof Ship.divert>
        try {
          voyageDiverted = Ship.divert(command, ship)
        } catch (error) {
          if (error instanceof ShipNotAtSea || error instanceof VoyageDestinationUnchanged) {
            return failure(error)
          }
          throw error
        }

        await this.journal.append(id.value, version, [voyageDiverted])
        return success()
      }
    )
  }
}
