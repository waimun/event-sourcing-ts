import { Cargo } from '../../../domain/cargo'
import { LoadCargo } from '../../../domain/commands/load-cargo'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Ship } from '../../../domain/ship'
import { ISODate } from '../../../shared/domain/date'
import type { Id } from '../../../shared/domain/id'
import type { Name } from '../../../shared/domain/name'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'

export class LoadCargoUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async load(id: Id, cargoName: Name, dateTime: ISODate = new ISODate()): Promise<void> {
    const command = new LoadCargo(id, new Cargo(cargoName), dateTime.value)
    const events = await this.journal.eventsByAggregate(id.value)

    if (events.length === 0) throw new ShipNotFound(id.value)

    const ship = Ship.replay(Ship.uninitialized(), events)
    const cargoLoaded = Ship.loadCargo(command, ship)
    await this.journal.append(cargoLoaded)
  }
}
