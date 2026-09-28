import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipArrived } from '../ship-arrived'
import { ShipArrivedSerializer } from './ship-arrived-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ShipArrived',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    data: {
      port: { name: 'Harrison', country: 'US' }
    }
  }

  const serializer = new ShipArrivedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.port).toEqual(payload.data.port)
})

test('return json string from event object', () => {
  const serializer = new ShipArrivedSerializer()
  const event = new ShipArrived('abc', new Port(new PortName('Harrison'), new Country('US')))
  expect(JSON.parse(serializer.eventToJson(event))).toEqual({
    type: event.type,
    schemaVersion: 1,
    aggregateId: event.aggregateId,
    occurredAt: event.occurredAt.toISOString(),
    recordedAt: event.recordedAt.toISOString(),
    data: { port: event.port }
  })
})
