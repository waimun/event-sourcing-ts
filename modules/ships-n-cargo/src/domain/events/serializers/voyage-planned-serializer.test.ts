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
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    originName: origin.name,
    originCountry: origin.country,
    destinationName: destination.name,
    destinationCountry: destination.country
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

test('serializes both voyage endpoints', () => {
  const event = new VoyagePlanned('abc', origin, destination)
  const payload = JSON.parse(new VoyagePlannedSerializer().eventToJson(event))

  expect(payload).toMatchObject({
    type: event.type,
    aggregateId: event.aggregateId,
    originName: origin.name,
    originCountry: origin.country,
    destinationName: destination.name,
    destinationCountry: destination.country
  })
  expect(new Date(payload.occurredAt)).toEqual(event.occurredAt)
  expect(new Date(payload.recordedAt)).toEqual(event.recordedAt)
})
