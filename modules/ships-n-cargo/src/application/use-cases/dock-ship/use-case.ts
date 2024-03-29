import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { DockShip } from '../../../domain/commands/dock-ship'
import { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import { ShipNotFound } from './error'
import { Id } from '../../../shared/domain/id'
import { ISODate } from '../../../shared/domain/date'

export class DockShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor (journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async dock (id: Id, port: Port, dateTime: ISODate = new ISODate()): Promise<void> {
    const command = new DockShip(id, port, dateTime.value)
    const events = await this.journal.eventsByAggregate(id.value)

    if (events.length === 0) throw new ShipNotFound(id.value)

    const ship = Ship.replay(Ship.uninitialized(), events)
    const shipArrived = Ship.arrive(command, ship)
    await this.journal.append(shipArrived)
  }
}
