import { expect, test, vi } from 'vitest'
import type { InvariantError } from '../../shared/errors/kernel'
import {
  EventPayloadSchemaVersionUnsupported,
  EventPayloadUpcasterNotFound,
  EventUpcasterAlreadyRegistered,
  EventUpcasterSchemaVersionInvalid,
  EventUpcasterTypeMismatch
} from '../errors/event-payload-handler'
import { BaseDomainEvent } from './domain-event'
import { EventPayloadHandler } from './event-payload-handler'
import type { EventUpcaster } from './event-upcaster'
import type { EventMetadata, EventSerializable } from './serializers/event-serializable'

const TEST_EVENT_TYPE = 'TestDistanceRecorded'
const OTHER_TEST_EVENT_TYPE = 'OtherTestEvent'

interface DistanceRecordedDataV1 {
  readonly distanceInMetres: number
}

interface DistanceRecordedDataV2 {
  readonly distance: {
    readonly amount: number
    readonly unit: 'm'
  }
}

interface DistanceRecordedDataV3 {
  readonly distance: {
    readonly millimetres: number
  }
}

class TestDistanceRecorded extends BaseDomainEvent<typeof TEST_EVENT_TYPE> {
  static readonly eventType = TEST_EVENT_TYPE
  readonly distanceInMillimetres: number

  constructor(
    aggregateId: string,
    distanceInMillimetres: number,
    occurredAt?: Date,
    recordedAt?: Date
  ) {
    super(TestDistanceRecorded.eventType, aggregateId, occurredAt, recordedAt)
    this.distanceInMillimetres = distanceInMillimetres
    Object.freeze(this)
  }
}

class TestDistanceRecordedSerializer
  implements EventSerializable<TestDistanceRecorded, DistanceRecordedDataV3>
{
  readonly eventType = TestDistanceRecorded.eventType
  readonly schemaVersion = 3

  toEvent(metadata: EventMetadata, data: DistanceRecordedDataV3): TestDistanceRecorded {
    return new TestDistanceRecorded(
      metadata.aggregateId,
      data.distance.millimetres,
      metadata.occurredAt,
      metadata.recordedAt
    )
  }

  toData(event: TestDistanceRecorded): DistanceRecordedDataV3 {
    return { distance: { millimetres: event.distanceInMillimetres } }
  }
}

const occurredAt = new Date('2024-01-02T03:04:05.000Z')
const recordedAt = new Date('2024-01-03T04:05:06.000Z')

const makeHandler = (): EventPayloadHandler => {
  const handler = new EventPayloadHandler()
  handler.register(TestDistanceRecorded.eventType, new TestDistanceRecordedSerializer())
  return handler
}

const makeV1ToV2Upcaster = (
  upcast = (data: DistanceRecordedDataV1): DistanceRecordedDataV2 => ({
    distance: { amount: data.distanceInMetres, unit: 'm' }
  })
): EventUpcaster<TestDistanceRecorded, DistanceRecordedDataV1, DistanceRecordedDataV2> => ({
  eventType: TestDistanceRecorded.eventType,
  fromSchemaVersion: 1,
  toSchemaVersion: 2,
  upcast
})

const makeV2ToV3Upcaster = (
  upcast = (data: DistanceRecordedDataV2): DistanceRecordedDataV3 => ({
    distance: { millimetres: data.distance.amount * 1000 }
  })
): EventUpcaster<TestDistanceRecorded, DistanceRecordedDataV2, DistanceRecordedDataV3> => ({
  eventType: TestDistanceRecorded.eventType,
  fromSchemaVersion: 2,
  toSchemaVersion: 3,
  upcast
})

const payload = (schemaVersion: number, data: unknown): string =>
  JSON.stringify({
    type: TestDistanceRecorded.eventType,
    schemaVersion,
    aggregateId: 'distance-1',
    occurredAt: occurredAt.toISOString(),
    recordedAt: recordedAt.toISOString(),
    data
  })

const expectInvariantError = (action: () => unknown, expected: InvariantError): void => {
  try {
    action()
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

  throw new Error('Expected an invariant error')
}

test('serializes only the current schema without invoking registered upcasters', () => {
  const handler = makeHandler()
  const upcastV1ToV2 = vi.fn(makeV1ToV2Upcaster().upcast)
  const upcastV2ToV3 = vi.fn(makeV2ToV3Upcaster().upcast)
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV1ToV2Upcaster(upcastV1ToV2))
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV2ToV3Upcaster(upcastV2ToV3))

  const serialized = handler.serialize(
    new TestDistanceRecorded('distance-1', 1_200_000, occurredAt, recordedAt)
  )

  expect(JSON.parse(serialized)).toEqual({
    type: TestDistanceRecorded.eventType,
    schemaVersion: 3,
    aggregateId: 'distance-1',
    occurredAt: occurredAt.toISOString(),
    recordedAt: recordedAt.toISOString(),
    data: { distance: { millimetres: 1_200_000 } }
  })
  expect(upcastV1ToV2).not.toHaveBeenCalled()
  expect(upcastV2ToV3).not.toHaveBeenCalled()
})

test('upcasts event data through every consecutive version and preserves envelope metadata', () => {
  const handler = makeHandler()
  const upcastV1ToV2 = vi.fn(makeV1ToV2Upcaster().upcast)
  const upcastV2ToV3 = vi.fn(makeV2ToV3Upcaster().upcast)
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV1ToV2Upcaster(upcastV1ToV2))
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV2ToV3Upcaster(upcastV2ToV3))

  const event = handler.deserialize(payload(1, { distanceInMetres: 1200 }))

  expect(event).toEqual(new TestDistanceRecorded('distance-1', 1_200_000, occurredAt, recordedAt))
  expect(upcastV1ToV2).toHaveBeenCalledExactlyOnceWith({ distanceInMetres: 1200 })
  expect(upcastV2ToV3).toHaveBeenCalledExactlyOnceWith({
    distance: { amount: 1200, unit: 'm' }
  })
})

test('starts the upcaster chain at the stored schema version', () => {
  const handler = makeHandler()
  const upcastV1ToV2 = vi.fn(makeV1ToV2Upcaster().upcast)
  const upcastV2ToV3 = vi.fn(makeV2ToV3Upcaster().upcast)
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV1ToV2Upcaster(upcastV1ToV2))
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV2ToV3Upcaster(upcastV2ToV3))

  const event = handler.deserialize(payload(2, { distance: { amount: 1200, unit: 'm' } }))

  expect(event).toEqual(new TestDistanceRecorded('distance-1', 1_200_000, occurredAt, recordedAt))
  expect(upcastV1ToV2).not.toHaveBeenCalled()
  expect(upcastV2ToV3).toHaveBeenCalledExactlyOnceWith({
    distance: { amount: 1200, unit: 'm' }
  })
})

test('fails closed when a consecutive upcaster is missing', () => {
  const handler = makeHandler()
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV1ToV2Upcaster())

  expectInvariantError(
    () => handler.deserialize(payload(1, { distanceInMetres: 1200 })),
    new EventPayloadUpcasterNotFound(TestDistanceRecorded.eventType, 2, 3)
  )
})

test('rejects a stored schema newer than the current serializer', () => {
  expectInvariantError(
    () => makeHandler().deserialize(payload(4, { distance: { millimetres: 1_200_000 } })),
    new EventPayloadSchemaVersionUnsupported(TestDistanceRecorded.eventType, 4, 3)
  )
})

test('rejects an upcaster registered under a different event type', () => {
  const handler = makeHandler()
  const upcaster = { ...makeV1ToV2Upcaster(), eventType: OTHER_TEST_EVENT_TYPE }

  expectInvariantError(
    () => handler.registerUpcaster(TestDistanceRecorded.eventType, upcaster),
    new EventUpcasterTypeMismatch(TestDistanceRecorded.eventType, OTHER_TEST_EVENT_TYPE)
  )
})

test.each([
  ['a zero source version', 0, 1],
  ['a fractional source version', 1.5, 2.5],
  ['a version gap', 1, 3]
])('rejects an upcaster with %s', (_description, fromSchemaVersion, toSchemaVersion) => {
  const handler = makeHandler()
  const upcaster = { ...makeV1ToV2Upcaster(), fromSchemaVersion, toSchemaVersion }

  expectInvariantError(
    () => handler.registerUpcaster(TestDistanceRecorded.eventType, upcaster),
    new EventUpcasterSchemaVersionInvalid(
      TestDistanceRecorded.eventType,
      fromSchemaVersion,
      toSchemaVersion
    )
  )
})

test('rejects two upcasters from the same event schema version', () => {
  const handler = makeHandler()
  handler.registerUpcaster(TestDistanceRecorded.eventType, makeV1ToV2Upcaster())

  expectInvariantError(
    () => handler.registerUpcaster(TestDistanceRecorded.eventType, makeV1ToV2Upcaster()),
    new EventUpcasterAlreadyRegistered(TestDistanceRecorded.eventType, 1)
  )
})
