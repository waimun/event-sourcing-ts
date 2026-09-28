import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipArrived } from '../ship-arrived'
import { ShipArrivedSerializer } from './ship-arrived-serializer'

test('restores an event from metadata and event-specific data', () => {
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
  const event = serializer.eventFromData(
    {
      aggregateId: payload.aggregateId,
      occurredAt: new Date(payload.occurredAt),
      recordedAt: new Date(payload.recordedAt)
    },
    payload.data
  )

  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.port).toEqual(payload.data.port)
})

test('returns version-one event-specific data', () => {
  const serializer = new ShipArrivedSerializer()
  const event = new ShipArrived('abc', new Port(new PortName('Harrison'), new Country('US')))
  expect(serializer.schemaVersion).toBe(1)
  expect(serializer.eventToData(event)).toEqual({ port: event.port })
})
