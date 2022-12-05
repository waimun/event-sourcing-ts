import { EventJournal } from '../../../domain/events/event-journal'
import { Ship } from '../../../domain/ship'
import { CreateShip } from '../../../domain/commands/create-ship'
import { IdAlreadyExists } from './error'

export interface CreateShipRequest {
  id: string
  name: string
}

export class CreateShipUseCase {
  private readonly journal: EventJournal

  constructor (journal: EventJournal) {
    this.journal = journal
  }

  create (request: CreateShipRequest): void {
    const command = new CreateShip(request.name, request.id)

    const idExists = this.journal.entriesByAggregate(command.id).length !== 0

    if (idExists) throw new IdAlreadyExists(command.id)

    const shipCreated = Ship.create(command, Ship.uninitialized())

    this.journal.append(command.id, shipCreated)
  }
}
