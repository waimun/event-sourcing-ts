import { expect, test } from 'vitest'
import { Name } from '../shared/domain/name'
import { Cargo } from './cargo'
import { Country } from './country'
import { InvalidShipHistory } from './errors/ship'
import { CargoLoaded } from './events/cargo-loaded'
import { CargoUnloaded } from './events/cargo-unloaded'
import type { DomainEvent } from './events/domain-event'
import { ShipArrived } from './events/ship-arrived'
import { ShipCreated } from './events/ship-created'
import { ShipDeparted } from './events/ship-departed'
import { UnitTestCreated } from './events/unit-test-created'
import { Port } from './port'
import { PortName } from './port-name'
import { Ship } from './ship'

const port = (name: string = 'Kingston') => new Port(new PortName(name), new Country('US'))
const cargo = (name: string = 'Refactoring Book') => new Cargo(new Name(name))
const created = (id: string = '123') => new ShipCreated(id, 'King Roy')
const initializedAtPort = () =>
  Ship.replay(Ship.uninitialized(), [created(), new ShipArrived('123', port())])

test('domain events and their payloads cannot be changed after construction', () => {
  const occurredAt = new Date('2026-09-23T12:00:00.000Z')
  const recordedAt = new Date('2026-09-23T12:01:00.000Z')
  const event = new ShipArrived('123', port(), occurredAt, recordedAt)

  occurredAt.setUTCFullYear(1999)
  event.occurredAt.setUTCFullYear(1998)

  expect(Object.isFrozen(event)).toBe(true)
  expect(Object.isFrozen(event.port)).toBe(true)
  expect(event.occurredAt).toEqual(new Date('2026-09-23T12:00:00.000Z'))
  expect(event.recordedAt).toEqual(new Date('2026-09-23T12:01:00.000Z'))
  expect(() => {
    ;(event as { aggregateId: string }).aggregateId = '456'
  }).toThrow(TypeError)
  expect(() => {
    ;(event.port as { name: string }).name = 'Changed'
  }).toThrow(TypeError)
})

test('replayed aggregate state exposes an immutable cargo view', () => {
  const ship = Ship.replay(Ship.uninitialized(), [created(), new CargoLoaded('123', cargo())])

  expect(Object.isFrozen(ship)).toBe(true)
  expect(Object.isFrozen(ship.cargo)).toBe(true)
  expect(Object.isFrozen(ship.cargo[0])).toBe(true)
  expect(() => (ship.cargo as Cargo[]).push(cargo('Domain Driven Design'))).toThrow(TypeError)
  expect(ship.cargo.map((item) => item.name)).toEqual(['Refactoring Book'])
})

test('replays a valid persisted event sequence', () => {
  const events = [
    created(),
    new ShipArrived('123', port()),
    new CargoLoaded('123', cargo()),
    new ShipDeparted('123'),
    new ShipArrived('123', port('Boston')),
    new CargoUnloaded('123', cargo())
  ]

  const ship = Ship.replay(Ship.uninitialized(), events)

  expect(ship.id).toBe('123')
  expect(ship.port.name).toBe('Boston')
  expect(ship.cargo).toEqual([])
})

test('rejects event types the aggregate does not understand', () => {
  expect(() => Ship.replay(Ship.uninitialized(), [new UnitTestCreated('123')])).toThrow(
    InvalidShipHistory
  )
})

test('rejects a known event type with a malformed payload', () => {
  const malformed = {
    type: ShipCreated.eventType,
    aggregateId: '123',
    occurredAt: new Date(),
    recordedAt: new Date(),
    asJson: () => '{}'
  } satisfies DomainEvent

  expect(() => Ship.replay(Ship.uninitialized(), [malformed])).toThrow(InvalidShipHistory)
})

test('rejects operations before creation and duplicate creation', () => {
  expect(() => Ship.replay(Ship.uninitialized(), [new ShipArrived('123', port())])).toThrow(
    InvalidShipHistory
  )
  expect(() => Ship.replay(Ship.uninitialized(), [created(), created()])).toThrow(
    InvalidShipHistory
  )
})

test('rejects an event from a different aggregate stream', () => {
  expect(() =>
    Ship.replay(Ship.uninitialized(), [created(), new ShipArrived('456', port())])
  ).toThrow(InvalidShipHistory)
})

test('rejects impossible movement in the current lifecycle', () => {
  expect(() => Ship.replay(Ship.uninitialized(), [created(), new ShipDeparted('123')])).toThrow(
    InvalidShipHistory
  )
  expect(() => Ship.apply(initializedAtPort(), new ShipDeparted('123'))).not.toThrow()
})

test('rejects duplicate loads and unloading absent cargo', () => {
  expect(() =>
    Ship.replay(Ship.uninitialized(), [
      created(),
      new CargoLoaded('123', cargo()),
      new CargoLoaded('123', cargo('REFACTORING BOOK'))
    ])
  ).toThrow(InvalidShipHistory)
  expect(() =>
    Ship.replay(Ship.uninitialized(), [created(), new CargoUnloaded('123', cargo())])
  ).toThrow(InvalidShipHistory)
})
