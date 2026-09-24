import { RegisterShip } from '../../../domain/commands/register-ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import type { Id } from '../../../shared/domain/id'
import type { Name } from '../../../shared/domain/name'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { IdAlreadyExists } from '../../errors/id-already-exists'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

export class RegisterShipUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async register(
    name: Name,
    id: Id,
    port: Port
  ): Promise<Result<void, IdAlreadyExists | ConcurrentCommandConflict>> {
    const command = new RegisterShip(name, id, port)

    return rerunConcurrentCommand<void, IdAlreadyExists>(id.value, async () => {
      const { events, version } = await this.journal.eventsByAggregate(id.value)
      if (events.length !== 0) return failure(new IdAlreadyExists(id.value))

      const shipRegistered = Ship.register(command)
      await this.journal.append(id.value, version, [shipRegistered])
      return success()
    })
  }
}
