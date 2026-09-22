import { expect, test } from 'vitest'
import { ShipDeparted } from '../ship-departed'
import { ShipDepartedSerializer } from './ship-departed-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipDeparted',
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z'
  }

  const serializer = new ShipDepartedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
})

test('return json string from event object', () => {
  const serializer = new ShipDepartedSerializer()
  const event = new ShipDeparted('abc')
  const json = serializer.eventToJson(event)
  const { type, aggregateId, occurredAt, recordedAt } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(occurredAt)).toEqual(event.occurredAt)
  expect(new Date(recordedAt)).toEqual(event.recordedAt)
})
