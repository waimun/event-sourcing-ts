import { PlanVoyage } from '../../../domain/commands/plan-voyage'
import {
  ShipNotAtPort,
  VoyageAlreadyPlanned,
  VoyageDestinationSameAsOrigin
} from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Port } from '../../../domain/port'
import { Ship } from '../../../domain/ship'
import type { Id } from '../../../shared/domain/id'
import type { ConcurrentCommandConflict } from '../../errors/concurrent-command-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { rerunConcurrentCommand } from '../../rerun-concurrent-command'
import { failure, type Result, success } from '../../result'

type PlanVoyageFailure =
  | ShipNotFound
  | ShipNotAtPort
  | VoyageAlreadyPlanned
  | VoyageDestinationSameAsOrigin
  | ConcurrentCommandConflict

export class PlanVoyageUseCase {
  constructor(private readonly journal: EventJournal<string, DomainEvent>) {}

  async plan(id: Id, destination: Port): Promise<Result<void, PlanVoyageFailure>> {
    const command = new PlanVoyage(id, destination)
    return rerunConcurrentCommand<
      void,
      ShipNotFound | ShipNotAtPort | VoyageAlreadyPlanned | VoyageDestinationSameAsOrigin
    >(id.value, async () => {
      const { events, version } = await this.journal.eventsByAggregate(id.value)
      if (events.length === 0) return failure(new ShipNotFound(id.value))

      const ship = Ship.replay(events)
      let voyagePlanned: ReturnType<typeof Ship.planVoyage>
      try {
        voyagePlanned = Ship.planVoyage(command, ship)
      } catch (error) {
        if (
          error instanceof ShipNotAtPort ||
          error instanceof VoyageAlreadyPlanned ||
          error instanceof VoyageDestinationSameAsOrigin
        ) {
          return failure(error)
        }
        throw error
      }

      await this.journal.append(id.value, version, [voyagePlanned])
      return success()
    })
  }
}
