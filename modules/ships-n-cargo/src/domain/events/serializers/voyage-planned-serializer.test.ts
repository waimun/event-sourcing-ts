import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyagePlanned } from '../voyage-planned'
import { VoyagePlannedSerializer } from './voyage-planned-serializer'

const origin = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Singapore'), new Country('SG'))

test('restores a planned voyage from JSON', () => {
  const payload = {
    type: 'VoyagePlanned',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    data: { origin, destination }
  }

  expect(new VoyagePlannedSerializer().eventFromJson(JSON.stringify(payload))).toEqual(
    new VoyagePlanned(
      payload.aggregateId,
      origin,
      destination,
      new Date(payload.occurredAt),
      new Date(payload.recordedAt)
    )
  )
})

test('serializes both voyage endpoints in the version-one envelope', () => {
  const event = new VoyagePlanned('abc', origin, destination)
  const payload = JSON.parse(new VoyagePlannedSerializer().eventToJson(event))

  expect(payload).toEqual({
    type: event.type,
    schemaVersion: 1,
    aggregateId: event.aggregateId,
    occurredAt: event.occurredAt.toISOString(),
    recordedAt: event.recordedAt.toISOString(),
    data: { origin, destination }
  })
})
