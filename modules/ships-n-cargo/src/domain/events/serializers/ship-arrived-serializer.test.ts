import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipArrived } from '../ship-arrived'
import { ShipArrivedSerializer } from './ship-arrived-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipArrived',
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    portName: 'Harrison',
    portCountry: 'US'
  }

  const serializer = new ShipArrivedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.port.name).toEqual(payload.portName)
  expect(event.port.country).toEqual(payload.portCountry)
})

test('return json string from event object', () => {
  const serializer = new ShipArrivedSerializer()
  const event = new ShipArrived('abc', new Port(new PortName('Harrison'), new Country('US')))
  const json = serializer.eventToJson(event)
  const { type, aggregateId, occurredAt, recordedAt, portName, portCountry } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(occurredAt)).toEqual(event.occurredAt)
  expect(new Date(recordedAt)).toEqual(event.recordedAt)
  expect(portName).toEqual(event.port.name)
  expect(portCountry).toEqual(event.port.country)
})
