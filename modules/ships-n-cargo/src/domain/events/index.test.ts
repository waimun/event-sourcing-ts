import { expect, test } from 'vitest'
import { Name } from '../../shared/domain/name'
import { Cargo } from '../cargo'
import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { CargoLoaded } from './cargo-loaded'
import { CargoUnloaded } from './cargo-unloaded'
import { eventPayloadHandler } from './index'
import { CargoLoadedSerializer } from './serializers/cargo-loaded-serializer'
import { CargoUnloadedSerializer } from './serializers/cargo-unloaded-serializer'
import { ShipArrivedSerializer } from './serializers/ship-arrived-serializer'
import { ShipDepartedSerializer } from './serializers/ship-departed-serializer'
import { ShipRegisteredSerializer } from './serializers/ship-registered-serializer'
import { ShipArrived } from './ship-arrived'
import { ShipDeparted } from './ship-departed'
import { ShipRegistered } from './ship-registered'

test('imported file should have event serializers registered', () => {
  expect(eventPayloadHandler).toBeTruthy()
  expect(
    eventPayloadHandler.byType(CargoLoaded.eventType) instanceof CargoLoadedSerializer
  ).toBeTruthy()
  expect(
    eventPayloadHandler.byType(CargoUnloaded.eventType) instanceof CargoUnloadedSerializer
  ).toBeTruthy()
  expect(
    eventPayloadHandler.byType(ShipArrived.eventType) instanceof ShipArrivedSerializer
  ).toBeTruthy()
  expect(
    eventPayloadHandler.byType(ShipRegistered.eventType) instanceof ShipRegisteredSerializer
  ).toBeTruthy()
  expect(
    eventPayloadHandler.byType(ShipDeparted.eventType) instanceof ShipDepartedSerializer
  ).toBeTruthy()
})

test('every registered serializer preserves event timestamps through a JSON round trip', () => {
  const occurredAt = new Date('2024-01-02T03:04:05.000Z')
  const recordedAt = new Date('2024-01-03T04:05:06.000Z')
  const cargo = new Cargo(new Name('Refactoring Book'))
  const port = new Port(new PortName('Harrison'), new Country('US'))
  const events = [
    new ShipRegistered('abc', 'King Roy', port, occurredAt, recordedAt),
    new ShipDeparted('abc', occurredAt, recordedAt),
    new ShipArrived('abc', port, occurredAt, recordedAt),
    new CargoLoaded('abc', cargo, occurredAt, recordedAt),
    new CargoUnloaded('abc', cargo, occurredAt, recordedAt)
  ]

  for (const event of events) {
    const serializer = eventPayloadHandler.byType(event.type)
    const restored = serializer.eventFromJson(serializer.eventToJson(event))

    expect(restored.type).toEqual(event.type)
    expect(restored.occurredAt).toEqual(occurredAt)
    expect(restored.recordedAt).toEqual(recordedAt)
  }
})
