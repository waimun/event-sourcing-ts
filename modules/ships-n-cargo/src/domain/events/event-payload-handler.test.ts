import { expect, test } from 'vitest'
import { Id } from '../../shared/domain/id'
import { Name } from '../../shared/domain/name'
import { CargoReference } from '../cargo-reference'
import { Container } from '../container'
import {
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../errors/event-payload-handler'
import { ContainerLoaded } from './container-loaded'
import { ContainerUnloaded } from './container-unloaded'
import { EventPayloadHandler } from './event-payload-handler'
import { ContainerLoadedSerializer } from './serializers/container-loaded-serializer'
import { ContainerUnloadedSerializer } from './serializers/container-unloaded-serializer'

const occurredAt = new Date('2024-01-02T03:04:05.000Z')
const recordedAt = new Date('2024-01-03T04:05:06.000Z')
const container = new Container(
  new Id('container-1'),
  new CargoReference('cargo-1'),
  new Name('Refactoring Book')
)

const makeHandler = (): EventPayloadHandler => {
  const handler = new EventPayloadHandler()
  handler.register(ContainerLoaded.eventType, new ContainerLoadedSerializer())
  return handler
}

test('serializes a domain event as a complete versioned envelope', () => {
  const event = new ContainerLoaded('abc', container, occurredAt, recordedAt)

  expect(JSON.parse(makeHandler().serialize(event))).toEqual({
    type: ContainerLoaded.eventType,
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: occurredAt.toISOString(),
    recordedAt: recordedAt.toISOString(),
    data: { container }
  })
})

test('deserializes an opaque versioned envelope through its registered event serializer', () => {
  const payload = JSON.stringify({
    type: ContainerLoaded.eventType,
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: occurredAt.toISOString(),
    recordedAt: recordedAt.toISOString(),
    data: { container }
  })

  expect(makeHandler().deserialize(payload)).toEqual(
    new ContainerLoaded('abc', container, occurredAt, recordedAt)
  )
})

test('rejects a serializer registered under a different event type', () => {
  const handler = new EventPayloadHandler()

  expect(() => {
    // @ts-expect-error: Exercise the runtime guard after bypassing the compile-time type match.
    handler.register(ContainerLoaded.eventType, new ContainerUnloadedSerializer())
  }).toThrow(
    new EventSerializerTypeMismatch(ContainerLoaded.eventType, ContainerUnloaded.eventType)
  )
})

test('cannot deserialize an event without a registered serializer', () => {
  const payload = JSON.stringify({
    type: 'UNKNOWN_SERIALIZER',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: occurredAt.toISOString(),
    recordedAt: recordedAt.toISOString(),
    data: {}
  })

  expect(() => new EventPayloadHandler().deserialize(payload)).toThrow(
    new EventSerializerNotFound('UNKNOWN_SERIALIZER')
  )
})
