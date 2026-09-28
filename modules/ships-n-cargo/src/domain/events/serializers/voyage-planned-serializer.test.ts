import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyagePlanned } from '../voyage-planned'
import { VoyagePlannedSerializer } from './voyage-planned-serializer'

const origin = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Singapore'), new Country('SG'))

test('restores a planned voyage from metadata and event-specific data', () => {
  const payload = {
    type: 'VoyagePlanned',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    data: { origin, destination }
  }

  expect(
    new VoyagePlannedSerializer().toEvent(
      {
        aggregateId: payload.aggregateId,
        occurredAt: new Date(payload.occurredAt),
        recordedAt: new Date(payload.recordedAt)
      },
      payload.data
    )
  ).toEqual(
    new VoyagePlanned(
      payload.aggregateId,
      origin,
      destination,
      new Date(payload.occurredAt),
      new Date(payload.recordedAt)
    )
  )
})

test('returns both voyage endpoints as version-one event-specific data', () => {
  const event = new VoyagePlanned('abc', origin, destination)
  const serializer = new VoyagePlannedSerializer()

  expect(serializer.schemaVersion).toBe(1)
  expect(serializer.toData(event)).toEqual({ origin, destination })
})
