import { expect, test } from 'vitest'
import { ShipCreated } from '../ship-created'
import { ShipCreatedSerializer } from './ship-created-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipCreated',
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    name: 'King Roy'
  }

  const serializer = new ShipCreatedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.name).toEqual(payload.name)
})

test('return json string from event object', () => {
  const serializer = new ShipCreatedSerializer()
  const event = new ShipCreated('abc', 'King Roy')
  const json = serializer.eventToJson(event)
  const { type, aggregateId, occurredAt, recordedAt, name } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(occurredAt)).toEqual(event.occurredAt)
  expect(new Date(recordedAt)).toEqual(event.recordedAt)
  expect(name).toEqual(event.name)
})
