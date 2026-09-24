import { Cargo } from '../../../domain/cargo'
import { LoadCargo } from '../../../domain/commands/load-cargo'
import { CargoAlreadyLoaded } from '../../../domain/errors/ship'
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

export class LoadCargoUseCase {
  private readonly journal: EventJournal<string, DomainEvent>

  constructor(journal: EventJournal<string, DomainEvent>) {
    this.journal = journal
  }

  async load(
    id: Id,
    cargoName: Name,
    dateTime: ISODate = new ISODate()
  ): Promise<Result<void, ShipNotFound | CargoAlreadyLoaded | ConcurrentCommandConflict>> {
    const command = new LoadCargo(id, new Cargo(cargoName), dateTime.value)
    return rerunConcurrentCommand<void, ShipNotFound | CargoAlreadyLoaded>(id.value, async () => {
      const { events, version } = await this.journal.eventsByAggregate(id.value)

      if (events.length === 0) return failure(new ShipNotFound(id.value))

      const ship = Ship.replay(events)
      let cargoLoaded: ReturnType<typeof Ship.loadCargo>
      try {
        cargoLoaded = Ship.loadCargo(command, ship)
      } catch (error) {
        if (error instanceof CargoAlreadyLoaded) return failure(error)
        throw error
      }
      await this.journal.append(id.value, version, [cargoLoaded])
      return success()
    })
  }
}
