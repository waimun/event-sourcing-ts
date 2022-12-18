import { expect, test } from '@jest/globals'
import { ShipCreatedSerializer } from './ship-created-serializer'
import { ShipCreated } from '../ship-created'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipCreated',
    aggregateId: 'abc',
    dateTimeOccurred: new Date().toISOString(),
    name: 'King Roy'
  }

  const serializer = new ShipCreatedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.dateTimeOccurred).toEqual(new Date(payload.dateTimeOccurred))
  expect(event.name).toEqual(payload.name)
})

test('return json string from event object', () => {
  const serializer = new ShipCreatedSerializer()
  const event = new ShipCreated('abc', 'King Roy')
  const json = serializer.eventToJson(event)
  const { type, aggregateId, dateTimeOccurred, name } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(dateTimeOccurred)).toEqual(event.dateTimeOccurred)
  expect(name).toEqual(event.name)
})
