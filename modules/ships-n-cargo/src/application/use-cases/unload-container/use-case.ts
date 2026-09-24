import { UnloadContainer } from '../../../domain/commands/unload-container'
import { ContainerNotFound, ShipNotAtPort } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Ship } from '../../../domain/ship'
import type { Id } from '../../../shared/domain/id'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

export class UnloadContainerUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async unload(
    id: Id,
    containerId: Id
  ): Promise<
    Result<void, ShipNotFound | ContainerNotFound | ShipNotAtPort | ConcurrentCommandConflict>
  > {
    const command = new UnloadContainer(id, containerId)
    return rerunConcurrentCommand<void, ShipNotFound | ContainerNotFound | ShipNotAtPort>(
      id.value,
      async () => {
        const { events, version } = await this.journal.eventsByAggregate(id.value)

        if (events.length === 0) return failure(new ShipNotFound(id.value))

        const ship = Ship.replay(events)
        let containerUnloaded: ReturnType<typeof Ship.unloadContainer>
        try {
          containerUnloaded = Ship.unloadContainer(command, ship)
        } catch (error) {
          if (error instanceof ContainerNotFound || error instanceof ShipNotAtPort) {
            return failure(error)
          }
          throw error
        }
        await this.journal.append(id.value, version, [containerUnloaded])
        return success()
      }
    )
  }
}
