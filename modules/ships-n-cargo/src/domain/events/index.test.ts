import { expect, test } from 'vitest'
import { Id } from '../../shared/domain/id'
import { Name } from '../../shared/domain/name'
import { CargoReference } from '../cargo-reference'
import { Container } from '../container'
import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { ContainerLoaded } from './container-loaded'
import { ContainerUnloaded } from './container-unloaded'
import { eventPayloadHandler } from './index'
import { ShipArrived } from './ship-arrived'
import { ShipDeparted } from './ship-departed'
import { ShipRegistered } from './ship-registered'
import { VoyageCancelled } from './voyage-cancelled'
import { VoyageDestinationChanged } from './voyage-destination-changed'
import { VoyageDiverted } from './voyage-diverted'
import { VoyagePlanned } from './voyage-planned'

test('every registered serializer preserves event timestamps through a payload round trip', () => {
  const occurredAt = new Date('2024-01-02T03:04:05.000Z')
  const recordedAt = new Date('2024-01-03T04:05:06.000Z')
  const container = new Container(
    new Id('container-1'),
    new CargoReference('cargo-1'),
    new Name('Refactoring Book')
  )
  const port = new Port(new PortName('Harrison'), new Country('US'))
  const events = [
    new ShipRegistered('abc', 'King Roy', port, occurredAt, recordedAt),
    new VoyagePlanned(
      'abc',
      port,
      new Port(new PortName('Boston'), new Country('US')),
      occurredAt,
      recordedAt
    ),
    new VoyageDiverted(
      'abc',
      new Port(new PortName('Boston'), new Country('US')),
      new Port(new PortName('Belmont'), new Country('CA')),
      'Weather changed',
      occurredAt,
      recordedAt
    ),
    new VoyageDestinationChanged(
      'abc',
      new Port(new PortName('Boston'), new Country('US')),
      new Port(new PortName('Belmont'), new Country('CA')),
      'Berth unavailable',
      occurredAt,
      recordedAt
    ),
    new VoyageCancelled(
      'abc',
      port,
      new Port(new PortName('Boston'), new Country('US')),
      'Charterer cancelled',
      occurredAt,
      recordedAt
    ),
    new ShipDeparted('abc', occurredAt, recordedAt),
    new ShipArrived('abc', port, occurredAt, recordedAt),
    new ContainerLoaded('abc', container, occurredAt, recordedAt),
    new ContainerUnloaded('abc', container, occurredAt, recordedAt)
  ]

  for (const event of events) {
    const restored = eventPayloadHandler.deserialize(eventPayloadHandler.serialize(event))

    expect(restored.type).toEqual(event.type)
    expect(restored.occurredAt).toEqual(occurredAt)
    expect(restored.recordedAt).toEqual(recordedAt)
  }
})
