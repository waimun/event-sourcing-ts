import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageCancelled } from '../voyage-cancelled'
import { VoyageCancelledSerializer } from './voyage-cancelled-serializer'

const origin = new Port(new PortName('Singapore'), new Country('SG'))
const destination = new Port(new PortName('Melbourne'), new Country('AU'))

test('round trips version-one event-specific data with supplied metadata', () => {
  const event = new VoyageCancelled(
    'abc',
    origin,
    destination,
    'Charterer cancelled',
    new Date('2024-01-02T03:04:05.000Z'),
    new Date('2024-01-03T04:05:06.000Z')
  )
  const serializer = new VoyageCancelledSerializer()
  const data = serializer.eventToData(event)

  expect(serializer.schemaVersion).toBe(1)
  expect(data).toEqual({
    origin,
    destination,
    reason: 'Charterer cancelled'
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
