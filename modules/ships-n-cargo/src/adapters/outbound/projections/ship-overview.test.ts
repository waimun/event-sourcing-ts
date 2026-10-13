import { describe, expect, test } from 'vitest'
import { CargoReference } from '../../../domain/cargo-reference'
import { Container } from '../../../domain/container'
import { Country } from '../../../domain/country'
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
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { InvalidShipOverviewHistory } from './errors/ship-overview'
import { applyShipOverviewEvent, copyShipOverview } from './ship-overview'

const port = (name = 'Kingston') => new Port(new PortName(name), new Country('US'))
const registration = (id = 'ship-1') => new ShipRegistered(id, 'King Roy', port())

describe('ship overview event projection', () => {
  test('registers, departs, and arrives a ship', () => {
    const registered = applyShipOverviewEvent(undefined, registration())
    const atSea = applyShipOverviewEvent(registered, new ShipDeparted('ship-1'))
    const arrived = applyShipOverviewEvent(atSea, new ShipArrived('ship-1', port('Miami')))

    expect(registered).toEqual({
      currentPort: { country: 'US', name: 'Kingston' },
      name: 'King Roy',
      shipId: 'ship-1',
      status: 'at-port'
    })
    expect(atSea).toEqual({ name: 'King Roy', shipId: 'ship-1', status: 'at-sea' })
    expect(arrived).toEqual({
      currentPort: { country: 'US', name: 'Miami' },
      name: 'King Roy',
      shipId: 'ship-1',
      status: 'at-port'
    })
    expect(Object.isFrozen(arrived)).toBe(true)
    expect(Object.isFrozen(arrived.currentPort)).toBe(true)
  })

  test('keeps query-irrelevant voyage and cargo events from changing the overview', () => {
    const registered = applyShipOverviewEvent(undefined, registration())
    const origin = port()
    const destination = port('Miami')
    const replacement = port('Boston')
    const container = new Container(
      new Id('container-1'),
      new CargoReference('cargo-1'),
      new Name('Coffee')
    )
    const events = [
      new VoyagePlanned('ship-1', origin, destination),
      new VoyageDiverted('ship-1', destination, replacement, 'Storm'),
      new VoyageDestinationChanged('ship-1', destination, replacement, 'Schedule'),
      new VoyageCancelled('ship-1', origin, destination, 'Maintenance'),
      new ContainerLoaded('ship-1', container),
      new ContainerUnloaded('ship-1', container)
    ]

    for (const event of events) expect(applyShipOverviewEvent(registered, event)).toBe(registered)
  })

  test('rejects events before registration, duplicate registration, and aggregate mismatches', () => {
    expect(() => applyShipOverviewEvent(undefined, new ShipDeparted('ship-1'))).toThrow(
      InvalidShipOverviewHistory
    )
    const registered = applyShipOverviewEvent(undefined, registration())
    expect(() => applyShipOverviewEvent(registered, registration())).toThrow(
      InvalidShipOverviewHistory
    )
    expect(() => applyShipOverviewEvent(registered, new ShipDeparted('ship-2'))).toThrow(
      InvalidShipOverviewHistory
    )
  })

  test('rejects unsupported event types', () => {
    const registered = applyShipOverviewEvent(undefined, registration())
    const unsupported = {
      aggregateId: 'ship-1',
      occurredAt: new Date(),
      recordedAt: new Date(),
      type: 'FutureShipEvent'
    } satisfies DomainEvent

    expect(() => applyShipOverviewEvent(registered, unsupported)).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SHIP_OVERVIEW_HISTORY',
        meta: {
          eventType: 'FutureShipEvent',
          reason: 'event type is not supported',
          shipId: 'ship-1'
        }
      })
    )
  })

  test('copies overview snapshots deeply', () => {
    const overview = applyShipOverviewEvent(undefined, registration())
    const copy = copyShipOverview(overview)

    expect(copy).toEqual(overview)
    expect(copy).not.toBe(overview)
    expect(copy.currentPort).not.toBe(overview.currentPort)
    expect(Object.isFrozen(copy)).toBe(true)
    expect(Object.isFrozen(copy.currentPort)).toBe(true)
    expect(copyShipOverview(applyShipOverviewEvent(overview, new ShipDeparted('ship-1')))).toEqual({
      name: 'King Roy',
      shipId: 'ship-1',
      status: 'at-sea'
    })
  })
})
