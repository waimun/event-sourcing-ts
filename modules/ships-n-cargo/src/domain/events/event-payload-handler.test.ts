import { expect, test } from 'vitest'
import { Id } from '../../shared/domain/id'
import { Name } from '../../shared/domain/name'
import type { InvariantError } from '../../shared/errors/kernel'
import { CargoReference } from '../cargo-reference'
import { Container } from '../container'
import {
  EventPayloadSchemaVersionInvalid,
  EventPayloadSchemaVersionUnsupported,
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

const envelope = {
  type: ContainerLoaded.eventType,
  aggregateId: 'abc',
  occurredAt: occurredAt.toISOString(),
  recordedAt: recordedAt.toISOString(),
  data: { container }
}

const expectDeserializationError = (payload: string, expected: InvariantError): void => {
  try {
    makeHandler().deserialize(payload)
  } catch (error) {
    expect(error).toMatchObject({
      name: expected.name,
      code: expected.code,
      kind: expected.kind,
      message: expected.message,
      meta: expected.meta
    })
    return
  }

  throw new Error('Expected event payload deserialization to fail')
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
    ...envelope,
    schemaVersion: 1
  })

  expect(makeHandler().deserialize(payload)).toEqual(
    new ContainerLoaded('abc', container, occurredAt, recordedAt)
  )
})

test('rejects an event payload without a schema version', () => {
  const payload = JSON.stringify(envelope)

  expectDeserializationError(
    payload,
    new EventPayloadSchemaVersionInvalid(ContainerLoaded.eventType, undefined)
  )
})

test.each([
  ['a string', '1'],
  ['null', null],
  ['a boolean', true],
  ['a non-integer number', 1.5],
  ['zero', 0],
  ['a negative number', -1]
])('rejects an event payload whose schema version is %s', (_description, schemaVersion) => {
  const payload = JSON.stringify({ ...envelope, schemaVersion })

  expectDeserializationError(
    payload,
    new EventPayloadSchemaVersionInvalid(ContainerLoaded.eventType, schemaVersion)
  )
})

test('rejects a valid schema version that the event serializer does not support', () => {
  const payload = JSON.stringify({ ...envelope, schemaVersion: 2 })

  expectDeserializationError(
    payload,
    new EventPayloadSchemaVersionUnsupported(ContainerLoaded.eventType, 2, 1)
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
