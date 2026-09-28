import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipRegistered } from '../ship-registered'
import { ShipRegisteredSerializer } from './ship-registered-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipRegistered',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    data: {
      name: 'King Roy',
      port: { name: 'Kingston', country: 'US' }
    }
  }

  const serializer = new ShipRegisteredSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.name).toEqual(payload.data.name)
  expect(event.port).toEqual(
    new Port(new PortName(payload.data.port.name), new Country(payload.data.port.country))
  )
})

test('return json string from event object', () => {
  const serializer = new ShipRegisteredSerializer()
  const event = new ShipRegistered(
    'abc',
    'King Roy',
    new Port(new PortName('Kingston'), new Country('US'))
  )
  expect(JSON.parse(serializer.eventToJson(event))).toEqual({
    type: event.type,
    schemaVersion: 1,
    aggregateId: event.aggregateId,
    occurredAt: event.occurredAt.toISOString(),
    recordedAt: event.recordedAt.toISOString(),
    data: {
      name: event.name,
      port: event.port
    }
  })
})
