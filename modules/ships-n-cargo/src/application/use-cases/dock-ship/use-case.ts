import { DockShip } from '../../../domain/commands/dock-ship'
import { ShipMustDockAtVoyageDestination, ShipNotAtSea } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import type { Id } from '../../../shared/domain/id'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

export class DockShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async dock(
    id: Id,
    port: Port
  ): Promise<
    Result<
      void,
      ShipNotFound | ShipNotAtSea | ShipMustDockAtVoyageDestination | ConcurrentCommandConflict
    >
  > {
    const command = new DockShip(id, port)
    return rerunConcurrentCommand<
      void,
      ShipNotFound | ShipNotAtSea | ShipMustDockAtVoyageDestination
    >(id.value, async () => {
      const { events, version } = await this.journal.eventsByAggregate(id.value)

      if (events.length === 0) return failure(new ShipNotFound(id.value))

      const ship = Ship.replay(events)
      let shipArrived: ReturnType<typeof Ship.arrive>
      try {
        shipArrived = Ship.arrive(command, ship)
      } catch (error) {
        if (error instanceof ShipNotAtSea || error instanceof ShipMustDockAtVoyageDestination) {
          return failure(error)
        }
        throw error
      }
      await this.journal.append(id.value, version, [shipArrived])
      return success()
    })
  }
}
