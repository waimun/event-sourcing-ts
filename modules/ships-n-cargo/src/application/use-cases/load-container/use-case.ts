import { LoadContainer } from '../../../domain/commands/load-container'
import { Container } from '../../../domain/container'
import { ContainerAlreadyLoaded, ShipNotAtPort } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Ship } from '../../../domain/ship'
import { ISODate } from '../../../shared/domain/date'
import type { Id } from '../../../shared/domain/id'
import type { Name } from '../../../shared/domain/name'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

export class LoadContainerUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async load(
    id: Id,
    containerId: Id,
    description: Name,
    dateTime: ISODate = new ISODate()
  ): Promise<
    Result<void, ShipNotFound | ContainerAlreadyLoaded | ShipNotAtPort | ConcurrentCommandConflict>
  > {
    const command = new LoadContainer(id, new Container(containerId, description), dateTime.value)
    return rerunConcurrentCommand<void, ShipNotFound | ContainerAlreadyLoaded | ShipNotAtPort>(
      id.value,
      async () => {
        const { events, version } = await this.journal.eventsByAggregate(id.value)

        if (events.length === 0) return failure(new ShipNotFound(id.value))

        const ship = Ship.replay(events)
        let containerLoaded: ReturnType<typeof Ship.loadContainer>
        try {
          containerLoaded = Ship.loadContainer(command, ship)
        } catch (error) {
          if (error instanceof ContainerAlreadyLoaded || error instanceof ShipNotAtPort) {
            return failure(error)
          }
          throw error
        }
        await this.journal.append(id.value, version, [containerLoaded])
        return success()
      }
    )
  }
}
