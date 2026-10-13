import type {
  ShipOverview,
  ShipOverviewPort
} from '../../../application/ports/ship-overview-projection'
import { ContainerLoaded } from '../../../domain/events/container-loaded'
import { ContainerUnloaded } from '../../../domain/events/container-unloaded'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipDeparted } from '../../../domain/events/ship-departed'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import { VoyageCancelled } from '../../../domain/events/voyage-cancelled'
import { VoyageDestinationChanged } from '../../../domain/events/voyage-destination-changed'
import { VoyageDiverted } from '../../../domain/events/voyage-diverted'
import { VoyagePlanned } from '../../../domain/events/voyage-planned'
import type { Port } from '../../../domain/port'
import { InvalidShipOverviewHistory } from './errors/ship-overview'

const summarizePort = (port: Port): ShipOverviewPort =>
  Object.freeze({ country: port.country, name: port.name })

const requireOverview = (overview: ShipOverview | undefined, event: DomainEvent): ShipOverview => {
  if (overview === undefined) {
    throw new InvalidShipOverviewHistory(event.type, event.aggregateId, 'ship is not registered')
  }
  if (overview.shipId !== event.aggregateId) {
    throw new InvalidShipOverviewHistory(
      event.type,
      event.aggregateId,
      `event does not belong to projected ship '${overview.shipId}'`
    )
  }
  return overview
}

export const applyShipOverviewEvent = (
  overview: ShipOverview | undefined,
  event: DomainEvent
): ShipOverview => {
  if (event instanceof ShipRegistered) {
    if (overview !== undefined) {
      throw new InvalidShipOverviewHistory(
        event.type,
        event.aggregateId,
        'ship is already registered'
      )
    }
    return Object.freeze({
      currentPort: summarizePort(event.port),
      name: event.name,
      shipId: event.aggregateId,
      status: 'at-port'
    })
  }

  const current = requireOverview(overview, event)
  if (event instanceof ShipDeparted) {
    return Object.freeze({ name: current.name, shipId: current.shipId, status: 'at-sea' })
  }
  if (event instanceof ShipArrived) {
    return Object.freeze({
      currentPort: summarizePort(event.port),
      name: current.name,
      shipId: current.shipId,
      status: 'at-port'
    })
  }
  if (
    event instanceof VoyagePlanned ||
    event instanceof VoyageDiverted ||
    event instanceof VoyageDestinationChanged ||
    event instanceof VoyageCancelled ||
    event instanceof ContainerLoaded ||
    event instanceof ContainerUnloaded
  ) {
    return current
  }

  throw new InvalidShipOverviewHistory(event.type, event.aggregateId, 'event type is not supported')
}

export const copyShipOverview = (overview: ShipOverview): ShipOverview =>
  Object.freeze({
    ...(overview.currentPort === undefined
      ? {}
      : { currentPort: Object.freeze({ ...overview.currentPort }) }),
    name: overview.name,
    shipId: overview.shipId,
    status: overview.status
  })
