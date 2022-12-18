import { expect, test } from '@jest/globals'
import { ShipArrivedSerializer } from './ship-arrived-serializer'
import { ShipArrived } from '../ship-arrived'
import { Country, Port } from '../../port'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipArrived',
    aggregateId: 'abc',
    dateTimeOccurred: new Date().toISOString(),
    portName: 'Harrison',
    portCountry: 'US'
  }

  const serializer = new ShipArrivedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.dateTimeOccurred).toEqual(new Date(payload.dateTimeOccurred))
  expect(event.port.name).toEqual(payload.portName)
  expect(event.port.country).toEqual(payload.portCountry)
})

test('return json string from event object', () => {
  const serializer = new ShipArrivedSerializer()
  const event = new ShipArrived('abc', new Port('Harrison', Country.US))
  const json = serializer.eventToJson(event)
  const { type, aggregateId, dateTimeOccurred, portName, portCountry } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(dateTimeOccurred)).toEqual(event.dateTimeOccurred)
  expect(portName).toEqual(event.port.name)
  expect(portCountry).toEqual(event.port.country)
})
