import { DockShip } from '../../../domain/commands/dock-ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { EventJournal } from '../../../domain/events/event-journal'
import type { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import { ISODate } from '../../../shared/domain/date'
import type { Id } from '../../../shared/domain/id'
import { ShipNotFound } from './error'

export class DockShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async dock(id: Id, port: Port, dateTime: ISODate = new ISODate()): Promise<void> {
    const command = new DockShip(id, port, dateTime.value)
    const events = await this.journal.eventsByAggregate(id.value)

    if (events.length === 0) throw new ShipNotFound(id.value)

    const ship = Ship.replay(Ship.uninitialized(), events)
    const shipArrived = Ship.arrive(command, ship)
    await this.journal.append(shipArrived)
  }
}
