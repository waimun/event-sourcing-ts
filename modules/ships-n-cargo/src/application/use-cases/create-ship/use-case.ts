import { EventJournal } from '../../../domain/events/event-journal'
import { Ship } from '../../../domain/ship'
import { CreateShip } from '../../../domain/commands/create-ship'
import { IdAlreadyExists } from './error'
import { DomainEvent } from '../../../domain/events/domain-event'
import { EntryAlreadyExists } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name } from '../../../shared/domain/name'
import { Id } from '../../../shared/domain/id'

export class CreateShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor (journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async create (name: Name, id: Id): Promise<void> {
    try {
      const command = new CreateShip(name, id)
      const shipCreated = Ship.create(command, Ship.uninitialized())
      await this.journal.newEntry(command.id, shipCreated)
    } catch (e) {
      if (e instanceof EntryAlreadyExists) throw new IdAlreadyExists(id.value)
      throw e
    }
  }
}
