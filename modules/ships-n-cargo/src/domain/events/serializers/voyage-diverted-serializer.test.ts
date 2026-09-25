import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDiverted } from '../voyage-diverted'
import { VoyageDivertedSerializer } from './voyage-diverted-serializer'

const previousDestination = new Port(new PortName('Singapore'), new Country('SG'))
const destination = new Port(new PortName('Melbourne'), new Country('AU'))

test('restores a voyage diversion from JSON', () => {
  const payload = {
    type: 'VoyageDiverted',
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    previousDestinationName: previousDestination.name,
    previousDestinationCountry: previousDestination.country,
    destinationName: destination.name,
    destinationCountry: destination.country
  }

  expect(new VoyageDivertedSerializer().eventFromJson(JSON.stringify(payload))).toEqual(
    new VoyageDiverted(
      payload.aggregateId,
      previousDestination,
      destination,
      new Date(payload.occurredAt),
      new Date(payload.recordedAt)
    )
  )
})

test('serializes the replaced and new destinations', () => {
  const event = new VoyageDiverted('abc', previousDestination, destination)
  const payload = JSON.parse(new VoyageDivertedSerializer().eventToJson(event))

  expect(payload).toMatchObject({
    type: event.type,
    aggregateId: event.aggregateId,
    previousDestinationName: previousDestination.name,
    previousDestinationCountry: previousDestination.country,
    destinationName: destination.name,
    destinationCountry: destination.country
  })
  expect(new Date(payload.occurredAt)).toEqual(event.occurredAt)
  expect(new Date(payload.recordedAt)).toEqual(event.recordedAt)
})
