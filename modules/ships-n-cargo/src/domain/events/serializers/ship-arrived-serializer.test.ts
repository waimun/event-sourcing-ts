import { expect, test } from '@jest/globals'
import { ShipArrivedSerializer } from './ship-arrived-serializer'
import { ShipArrived } from '../ship-arrived'
import { Port } from '../../port'
import { Country } from '../../country'
import { PortName } from '../../port-name'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipArrived',
    aggregateId: 'abc',
    occurredAt: new Date().toISOString(),
    portName: 'Harrison',
    portCountry: 'US'
  }

  const serializer = new ShipArrivedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.port.name).toEqual(payload.portName)
  expect(event.port.country).toEqual(payload.portCountry)
})

test('return json string from event object', () => {
  const serializer = new ShipArrivedSerializer()
  const event = new ShipArrived('abc', new Port(new PortName('Harrison'), new Country('US')))
  const json = serializer.eventToJson(event)
  const { type, aggregateId, occurredAt, portName, portCountry } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(occurredAt)).toEqual(event.occurredAt)
  expect(portName).toEqual(event.port.name)
  expect(portCountry).toEqual(event.port.country)
})
