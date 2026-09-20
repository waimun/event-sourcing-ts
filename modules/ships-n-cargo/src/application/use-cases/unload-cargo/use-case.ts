import { Cargo } from '../../../domain/cargo'
import { UnloadCargo } from '../../../domain/commands/unload-cargo'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { EventJournal } from '../../../domain/events/event-journal'
import { Ship } from '../../../domain/ship'
import { ISODate } from '../../../shared/domain/date'
import type { Id } from '../../../shared/domain/id'
import type { Name } from '../../../shared/domain/name'
import { ShipNotFound } from '../unload-cargo/error'

export class UnloadCargoUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async unload(id: Id, cargoName: Name, dateTime: ISODate = new ISODate()): Promise<void> {
    const command = new UnloadCargo(id, new Cargo(cargoName), dateTime.value)
    const events = await this.journal.eventsByAggregate(id.value)

    if (events.length === 0) throw new ShipNotFound(id.value)

    const ship = Ship.replay(Ship.uninitialized(), events)
    const cargoUnloaded = Ship.unloadCargo(command, ship)
    await this.journal.append(cargoUnloaded)
  }
}
