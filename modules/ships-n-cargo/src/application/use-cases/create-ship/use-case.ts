import { CreateShip } from '../../../domain/commands/create-ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { EventJournal } from '../../../domain/events/event-journal'
import { Ship } from '../../../domain/ship'
import type { Id } from '../../../shared/domain/id'
import type { Name } from '../../../shared/domain/name'
import { IdAlreadyExists } from '../../errors/id-already-exists'

export class CreateShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async create(name: Name, id: Id): Promise<void> {
    const command = new CreateShip(name, id)

    const events = await this.journal.eventsByAggregate(id.value)
    if (events.length !== 0) throw new IdAlreadyExists(id.value)

    const shipCreated = Ship.create(command, Ship.uninitialized())
    await this.journal.append(shipCreated)
  }
}
