import { Result } from '../../../shared/result'
import { EventJournal } from '../../../domain/events/event-journal'
import { Ship } from '../../../domain/ship'
import { CreateShip } from '../../../domain/commands/create-ship'
import { DomainEvent } from '../../../domain/events/domain-event'

export interface CreateShipRequest {
  id: string
  name: string
}

export class CreateShipUseCase {
  private readonly journal: EventJournal

  constructor (journal: EventJournal) {
    this.journal = journal
  }

  create (request: CreateShipRequest): Result<void> {
    const commandCreated: Result<CreateShip> = CreateShip.command(request.name, request.id)

    if (commandCreated.isFailure) return Result.fail(commandCreated.getValue() as Error)

    const command = commandCreated.getValue() as CreateShip

    const idExists = this.journal.entriesByAggregate(command.id).length !== 0

    if (idExists) return Result.fail(new Error('cannot create ship; id exists'))

    const commandEvents = Ship.create(command, Ship.uninitialized())

    if (commandEvents.isFailure) return Result.fail(new Error('cannot create ship; internal error'))

    this.journal.append(command.id, commandEvents.getValue() as DomainEvent[])

    return Result.ok(undefined)
  }
}