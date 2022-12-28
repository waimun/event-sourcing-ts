import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { DockShipDto } from './dock-ship-dto'
import { DockShip } from '../../../domain/commands/dock-ship'
import { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import { ShipNotFound } from './error'

export class DockShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor (journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  dock (request: DockShipDto): void {
    const command = new DockShip(request.id, new Port(request.port.name, request.port.country), request.dateTime)
    const events = this.journal.eventsById(request.id)

    if (events.length === 0) throw new ShipNotFound(request.id)

    const ship = Ship.replay(Ship.uninitialized(), events)
    const shipArrived = Ship.arrive(command, ship)
    this.journal.appendEvents(request.id, shipArrived)
  }
}
