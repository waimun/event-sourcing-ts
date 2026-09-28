import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDiverted } from '../voyage-diverted'
import { VoyageDivertedSerializer } from './voyage-diverted-serializer'

const previousDestination = new Port(new PortName('Singapore'), new Country('SG'))
const destination = new Port(new PortName('Melbourne'), new Country('AU'))

test('restores a voyage diversion from metadata and event-specific data', () => {
  const payload = {
    type: 'VoyageDiverted',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    data: {
      previousDestination,
      destination,
      reason: 'Storm on planned route'
    }
  }

  expect(
    new VoyageDivertedSerializer().toEvent(
      {
        aggregateId: payload.aggregateId,
        occurredAt: new Date(payload.occurredAt),
        recordedAt: new Date(payload.recordedAt)
      },
      payload.data
    )
  ).toEqual(
    new VoyageDiverted(
      payload.aggregateId,
      previousDestination,
      destination,
      payload.data.reason,
      new Date(payload.occurredAt),
      new Date(payload.recordedAt)
    )
  )
})

test('returns the replaced and new destinations as version-one event-specific data', () => {
  const event = new VoyageDiverted(
    'abc',
    previousDestination,
    destination,
    'Storm on planned route'
  )
  const serializer = new VoyageDivertedSerializer()

  expect(serializer.schemaVersion).toBe(1)
  expect(serializer.toData(event)).toEqual({
    previousDestination,
    destination,
    reason: 'Storm on planned route'
  })
})
