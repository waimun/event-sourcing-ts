import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { ISODate } from '../../../shared/domain/date'
import { SailShip } from '../../../domain/commands/sail-ship'
import { Ship } from '../../../domain/ship'
import { ShipNotFound } from './error'

export class SailShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor (journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async sail (id: Id, dateTime: ISODate = new ISODate()): Promise<void> {
    const command = new SailShip(id, dateTime.value)
    const events = await this.journal.eventsByAggregate(id.value)

    if (events.length === 0) throw new ShipNotFound(id.value)

    const ship = Ship.replay(Ship.uninitialized(), events)
    const shipDeparted = Ship.depart(command, ship)
    await this.journal.append(shipDeparted)
  }
}
