import { expect, test } from 'vitest'
import { ShipDeparted } from '../ship-departed'
import { ShipDepartedSerializer } from './ship-departed-serializer'

test('restores an event from metadata and event-specific data', () => {
  const payload = {
    type: 'ShipDeparted',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    data: {}
  }

  const serializer = new ShipDepartedSerializer()
  const event = serializer.eventFromData(
    {
      aggregateId: payload.aggregateId,
      occurredAt: new Date(payload.occurredAt),
      recordedAt: new Date(payload.recordedAt)
    },
    payload.data
  )

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
})

test('returns empty version-one event-specific data', () => {
  const serializer = new ShipDepartedSerializer()
  const event = new ShipDeparted('abc')
  expect(serializer.schemaVersion).toBe(1)
  expect(serializer.eventToData(event)).toEqual({})
})
