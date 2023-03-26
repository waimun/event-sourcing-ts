import { EventJournal } from '../../../domain/events/event-journal'
import { Ship } from '../../../domain/ship'
import { CreateShip } from '../../../domain/commands/create-ship'
import { IdAlreadyExists } from './error'
import { DomainEvent } from '../../../domain/events/domain-event'
import { Name } from '../../../shared/domain/name'
import { Id } from '../../../shared/domain/id'

export class CreateShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor (journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async create (name: Name, id: Id): Promise<void> {
    const command = new CreateShip(name, id)

    const events = await this.journal.eventsByAggregate(id.value)
    if (events.length !== 0) throw new IdAlreadyExists(id.value)

    const shipCreated = Ship.create(command, Ship.uninitialized())
    await this.journal.append(shipCreated)
  }
}
