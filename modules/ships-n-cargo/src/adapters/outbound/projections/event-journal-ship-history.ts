import type { EventJournal } from '../../../application/ports/event-journal'
import type {
  PortSummary,
  ShipHistoryEntry,
  ShipHistoryProjection
} from '../../../application/ports/ship-history-projection'
import { ContainerLoaded } from '../../../domain/events/container-loaded'
import { ContainerUnloaded } from '../../../domain/events/container-unloaded'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipDeparted } from '../../../domain/events/ship-departed'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import type { Port } from '../../../domain/port'
import { UnsupportedShipHistoryEvent } from './errors/ship-history'

const summarizePort = (port: Port): PortSummary =>
  Object.freeze({ name: port.name, country: port.country })

const projectEvent = (event: DomainEvent): ShipHistoryEntry => {
  const occurredAt = event.occurredAt.toISOString()

  if (event instanceof ShipRegistered) {
    return Object.freeze({
      kind: 'ship-registered',
      occurredAt,
      name: event.name,
      port: summarizePort(event.port)
    })
  }
  if (event instanceof ShipArrived) {
    return Object.freeze({
      kind: 'ship-arrived',
      occurredAt,
      port: summarizePort(event.port)
    })
  }
  if (event instanceof ShipDeparted) {
    return Object.freeze({ kind: 'ship-departed', occurredAt })
  }
  if (event instanceof ContainerLoaded || event instanceof ContainerUnloaded) {
    return Object.freeze({
      kind: event instanceof ContainerLoaded ? 'container-loaded' : 'container-unloaded',
      occurredAt,
      containerId: event.container.containerId,
      cargoReference: event.container.cargoReference,
      description: event.container.description
    })
  }

  throw new UnsupportedShipHistoryEvent(event.type)
}

export class EventJournalShipHistoryProjection implements ShipHistoryProjection {
  constructor(private readonly journal: EventJournal<string, DomainEvent>) {}

  async historyFor(shipId: string) {
    const { events } = await this.journal.eventsByAggregate(shipId)
    if (events.length === 0) return undefined

    return Object.freeze({
      shipId,
      history: Object.freeze(events.map(projectEvent))
    })
  }
}
