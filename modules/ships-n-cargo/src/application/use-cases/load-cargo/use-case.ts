import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { ISODate } from '../../../shared/domain/date'
import { LoadCargo } from '../../../domain/commands/load-cargo'
import { Cargo } from '../../../domain/cargo'
import { ShipNotFound } from './error'
import { Ship } from '../../../domain/ship'

export class LoadCargoUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor (journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async load (id: Id, cargoName: Name, dateTime: ISODate = new ISODate()): Promise<void> {
    const command = new LoadCargo(id, new Cargo(cargoName), dateTime.value)
    const events = await this.journal.eventsByAggregate(id.value)

    if (events.length === 0) throw new ShipNotFound(id.value)

    const ship = Ship.replay(Ship.uninitialized(), events)
    const cargoLoaded = Ship.loadCargo(command, ship)
    await this.journal.append(cargoLoaded)
  }
}
