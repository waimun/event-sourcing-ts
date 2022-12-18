import { expect, test } from '@jest/globals'
import { ShipDepartedSerializer } from './ship-departed-serializer'
import { ShipDeparted } from '../ship-departed'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipDeparted',
    aggregateId: 'abc',
    dateTimeOccurred: new Date().toISOString()
  }

  const serializer = new ShipDepartedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.dateTimeOccurred).toEqual(new Date(payload.dateTimeOccurred))
})

test('return json string from event object', () => {
  const serializer = new ShipDepartedSerializer()
  const event = new ShipDeparted('abc')
  const json = serializer.eventToJson(event)
  const { type, aggregateId, dateTimeOccurred } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(dateTimeOccurred)).toEqual(event.dateTimeOccurred)
})
