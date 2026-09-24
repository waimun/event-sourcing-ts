import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipRegistered } from '../ship-registered'
import { ShipRegisteredSerializer } from './ship-registered-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipRegistered',
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    name: 'King Roy',
    portName: 'Kingston',
    portCountry: 'US'
  }

  const serializer = new ShipRegisteredSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.name).toEqual(payload.name)
  expect(event.port).toEqual(
    new Port(new PortName(payload.portName), new Country(payload.portCountry))
  )
})

test('return json string from event object', () => {
  const serializer = new ShipRegisteredSerializer()
  const event = new ShipRegistered(
    'abc',
    'King Roy',
    new Port(new PortName('Kingston'), new Country('US'))
  )
  const json = serializer.eventToJson(event)
  const { type, aggregateId, occurredAt, recordedAt, name, portName, portCountry } =
    JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(new Date(occurredAt)).toEqual(event.occurredAt)
  expect(new Date(recordedAt)).toEqual(event.recordedAt)
  expect(name).toEqual(event.name)
  expect(portName).toEqual(event.port.name)
  expect(portCountry).toEqual(event.port.country)
})
