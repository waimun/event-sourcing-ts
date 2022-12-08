import { EventJournal } from '../../../domain/events/event-journal'
import { Ship } from '../../../domain/ship'
import { CreateShip } from '../../../domain/commands/create-ship'
import { IdAlreadyExists } from './error'
import { DomainEvent } from '../../../domain/events/domain-event'
import { EntryAlreadyExists } from '../../../infrastructure/persistence/in-memory-event-journal'

export interface CreateShipRequest {
  id: string
  name: string
}

export class CreateShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor (journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  create (request: CreateShipRequest): void {
    try {
      const command = new CreateShip(request.name, request.id)
      const shipCreated = Ship.create(command, Ship.uninitialized())
      this.journal.newEntry(command.id, shipCreated)
    } catch (e) {
      if (e instanceof EntryAlreadyExists) throw new IdAlreadyExists(request.id)
      throw e
    }
  }
}
