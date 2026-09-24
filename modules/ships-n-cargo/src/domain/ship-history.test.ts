import { expect, test } from 'vitest'
import { Id } from '../shared/domain/id'
import { Name } from '../shared/domain/name'
import { Container } from './container'
import { Country } from './country'
import { InvalidShipHistory } from './errors/ship'
import { ContainerLoaded } from './events/container-loaded'
import { ContainerUnloaded } from './events/container-unloaded'
import { BaseDomainEvent, type DomainEvent } from './events/domain-event'
import { ShipArrived } from './events/ship-arrived'
import { ShipDeparted } from './events/ship-departed'
import { ShipRegistered } from './events/ship-registered'
import { Port } from './port'
import { PortName } from './port-name'
import { Ship } from './ship'
import { AtPort, AtSea } from './ship-location'

const port = (name = 'Kingston') => new Port(new PortName(name), new Country('US'))
const container = (containerId = 'container-1', description = 'Refactoring Book') =>
  new Container(new Id(containerId), new Name(description))
const registered = (id = '123') => new ShipRegistered(id, 'King Roy', port())
const replay = (events: readonly DomainEvent[]) => {
  const ship = Ship.replay(events)
  expect(ship).toBeDefined()
  return ship as Ship
}

class UnknownShipEvent extends BaseDomainEvent<'UnknownShipEvent'> {
  constructor(aggregateId: string) {
    super('UnknownShipEvent', aggregateId)
  }
}

const malformed = (type: DomainEvent['type']): DomainEvent => ({
  type,
  aggregateId: '123',
  occurredAt: new Date(),
  recordedAt: new Date(),
  asJson: () => '{}'
})

test('domain events, port payloads, and locations cannot be changed', () => {
  const occurredAt = new Date('2026-09-23T12:00:00.000Z')
  const recordedAt = new Date('2026-09-23T12:01:00.000Z')
  const event = new ShipRegistered('123', 'King Roy', port(), occurredAt, recordedAt)
  const ship = replay([event])

  occurredAt.setUTCFullYear(1999)
  event.occurredAt.setUTCFullYear(1998)

  expect(Object.isFrozen(event)).toBe(true)
  expect(Object.isFrozen(event.port)).toBe(true)
  expect(Object.isFrozen(ship.location)).toBe(true)
  expect(event.occurredAt).toEqual(new Date('2026-09-23T12:00:00.000Z'))
  expect(event.recordedAt).toEqual(new Date('2026-09-23T12:01:00.000Z'))
  expect(() => {
    ;(event as { aggregateId: string }).aggregateId = '456'
  }).toThrow(TypeError)
  expect(() => {
    ;(event.port as { name: string }).name = 'Changed'
  }).toThrow(TypeError)
})

test('replayed aggregate state exposes an immutable container view', () => {
  const ship = replay([registered(), new ContainerLoaded('123', container())])
  expect(Object.isFrozen(ship)).toBe(true)
  expect(Object.isFrozen(ship.containers)).toBe(true)
  expect(Object.isFrozen(ship.containers[0])).toBe(true)
  expect(() =>
    (ship.containers as Container[]).push(container('container-2', 'Domain Driven Design'))
  ).toThrow(TypeError)
})

test('replays the complete at-port to at-sea lifecycle', () => {
  const events = [
    registered(),
    new ContainerLoaded('123', container()),
    new ShipDeparted('123'),
    new ShipArrived('123', port('Boston')),
    new ContainerUnloaded('123', container())
  ]
  const ship = replay(events)

  expect(ship.location).toEqual(new AtPort(port('Boston')))
  expect(ship.containers).toEqual([])
})

test('an empty history represents an absent ship', () => {
  expect(Ship.replay([])).toBeUndefined()
})

test('rejects event types the aggregate does not understand', () => {
  expect(() => Ship.replay([new UnknownShipEvent('123')])).toThrow(InvalidShipHistory)
})

test.each([
  ShipRegistered.eventType,
  ShipDeparted.eventType,
  ShipArrived.eventType,
  ContainerLoaded.eventType,
  ContainerUnloaded.eventType
])('rejects a malformed %s payload', (eventType) => {
  expect(() => Ship.replay([malformed(eventType)])).toThrow(InvalidShipHistory)
})

test.each([
  new ShipDeparted('123'),
  new ShipArrived('123', port()),
  new ContainerLoaded('123', container()),
  new ContainerUnloaded('123', container())
])('rejects $type before registration', (event) => {
  expect(() => Ship.replay([event])).toThrow(InvalidShipHistory)
})

test('rejects duplicate registration and events from another aggregate stream', () => {
  expect(() => Ship.replay([registered(), registered()])).toThrow(InvalidShipHistory)
  expect(() => Ship.replay([registered(), new ShipDeparted('456')])).toThrow(InvalidShipHistory)
})

test('rejects movement that breaks the at-port and at-sea cycle', () => {
  expect(() => Ship.replay([registered(), new ShipArrived('123', port('Boston'))])).toThrow(
    InvalidShipHistory
  )
  expect(() =>
    Ship.replay([registered(), new ShipDeparted('123'), new ShipDeparted('123')])
  ).toThrow(InvalidShipHistory)

  const atSea = replay([registered(), new ShipDeparted('123')])
  expect(atSea.location).toBeInstanceOf(AtSea)
})

test('rejects container events that violate identity or location rules', () => {
  expect(() =>
    Ship.replay([
      registered(),
      new ContainerLoaded('123', container()),
      new ContainerLoaded('123', container('container-1', 'A changed description'))
    ])
  ).toThrow(InvalidShipHistory)
  expect(() => Ship.replay([registered(), new ContainerUnloaded('123', container())])).toThrow(
    InvalidShipHistory
  )
  expect(() =>
    Ship.replay([registered(), new ShipDeparted('123'), new ContainerLoaded('123', container())])
  ).toThrow(InvalidShipHistory)
  expect(() =>
    Ship.replay([
      registered(),
      new ContainerLoaded('123', container()),
      new ShipDeparted('123'),
      new ContainerUnloaded('123', container())
    ])
  ).toThrow(InvalidShipHistory)
})

test('allows distinct container identities to share a description', () => {
  const ship = replay([
    registered(),
    new ContainerLoaded('123', container('container-1')),
    new ContainerLoaded('123', container('container-2'))
  ])

  expect(ship.containers.map(({ containerId }) => containerId)).toEqual([
    'container-1',
    'container-2'
  ])
})
