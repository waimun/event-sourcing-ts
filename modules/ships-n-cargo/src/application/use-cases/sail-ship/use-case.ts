import { SailShip } from '../../../domain/commands/sail-ship'
import { ShipNotAtPort } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Ship } from '../../../domain/ship'
import { ISODate } from '../../../shared/domain/date'
import type { Id } from '../../../shared/domain/id'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

export class SailShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async sail(
    id: Id,
    dateTime: ISODate = new ISODate()
  ): Promise<Result<void, ShipNotFound | ShipNotAtPort | ConcurrentCommandConflict>> {
    const command = new SailShip(id, dateTime.value)
    return rerunConcurrentCommand<void, ShipNotFound | ShipNotAtPort>(id.value, async () => {
      const { events, version } = await this.journal.eventsByAggregate(id.value)

      if (events.length === 0) return failure(new ShipNotFound(id.value))

      const ship = Ship.replay(events)
      let shipDeparted: ReturnType<typeof Ship.depart>
      try {
        shipDeparted = Ship.depart(command, ship)
      } catch (error) {
        if (error instanceof ShipNotAtPort) return failure(error)
        throw error
      }
      await this.journal.append(id.value, version, [shipDeparted])
      return success()
    })
  }
}
