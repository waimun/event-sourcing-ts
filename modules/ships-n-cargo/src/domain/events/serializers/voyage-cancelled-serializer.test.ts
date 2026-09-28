import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageCancelled } from '../voyage-cancelled'
import { VoyageCancelledSerializer } from './voyage-cancelled-serializer'

const origin = new Port(new PortName('Singapore'), new Country('SG'))
const destination = new Port(new PortName('Melbourne'), new Country('AU'))

test('round trips a cancelled voyage snapshot in the version-one envelope', () => {
  const event = new VoyageCancelled(
    'abc',
    origin,
    destination,
    'Charterer cancelled',
    new Date('2024-01-02T03:04:05.000Z'),
    new Date('2024-01-03T04:05:06.000Z')
  )
  const serializer = new VoyageCancelledSerializer()
  const json = serializer.eventToJson(event)

  expect(JSON.parse(json)).toEqual({
    type: event.type,
    schemaVersion: 1,
    aggregateId: event.aggregateId,
    occurredAt: event.occurredAt.toISOString(),
    recordedAt: event.recordedAt.toISOString(),
    data: {
      origin,
      destination,
      reason: 'Charterer cancelled'
    }
  })
  expect(serializer.eventFromJson(json)).toEqual(event)
})
