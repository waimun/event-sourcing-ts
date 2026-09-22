import { CreateShip } from '../../../domain/commands/create-ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Ship } from '../../../domain/ship'
import type { Id } from '../../../shared/domain/id'
import type { Name } from '../../../shared/domain/name'
import { IdAlreadyExists } from '../../errors/id-already-exists'
import type { EventJournal } from '../../ports/event-journal'
import { failure, type Result, success } from '../../result'

export class CreateShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async create(name: Name, id: Id): Promise<Result<void, IdAlreadyExists>> {
    const command = new CreateShip(name, id)

    const { events, version } = await this.journal.eventsByAggregate(id.value)
    if (events.length !== 0) return failure(new IdAlreadyExists(id.value))

    const shipCreated = Ship.create(command, Ship.uninitialized())
    await this.journal.append(id.value, version, [shipCreated])
    return success()
  }
}
