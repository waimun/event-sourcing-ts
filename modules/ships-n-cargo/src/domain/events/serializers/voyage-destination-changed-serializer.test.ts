import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDestinationChanged } from '../voyage-destination-changed'
import { VoyageDestinationChangedSerializer } from './voyage-destination-changed-serializer'

const previousDestination = new Port(new PortName('Singapore'), new Country('SG'))
const destination = new Port(new PortName('Melbourne'), new Country('AU'))

test('round trips version-one event-specific data with supplied metadata', () => {
  const event = new VoyageDestinationChanged(
    'abc',
    previousDestination,
    destination,
    'Berth unavailable',
    new Date('2024-01-02T03:04:05.000Z'),
    new Date('2024-01-03T04:05:06.000Z')
  )
  const serializer = new VoyageDestinationChangedSerializer()
  const data = serializer.eventToData(event)

  expect(serializer.schemaVersion).toBe(1)
  expect(data).toEqual({
    previousDestination,
    destination,
    reason: 'Berth unavailable'
  })
  expect(
    serializer.eventFromData(
      {
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        recordedAt: event.recordedAt
      },
      data
    )
  ).toEqual(event)
})
