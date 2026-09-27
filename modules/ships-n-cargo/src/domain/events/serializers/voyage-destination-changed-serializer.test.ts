import { expect, test } from 'vitest'
import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDestinationChanged } from '../voyage-destination-changed'
import { VoyageDestinationChangedSerializer } from './voyage-destination-changed-serializer'

const previousDestination = new Port(new PortName('Singapore'), new Country('SG'))
const destination = new Port(new PortName('Melbourne'), new Country('AU'))

test('round trips a destination change with both destinations and its reason', () => {
  const event = new VoyageDestinationChanged(
    'abc',
    previousDestination,
    destination,
    'Berth unavailable',
    new Date('2024-01-02T03:04:05.000Z'),
    new Date('2024-01-03T04:05:06.000Z')
  )
  const serializer = new VoyageDestinationChangedSerializer()
  const json = serializer.eventToJson(event)

  expect(JSON.parse(json)).toMatchObject({
    previousDestinationName: previousDestination.name,
    previousDestinationCountry: previousDestination.country,
    destinationName: destination.name,
    destinationCountry: destination.country,
    reason: 'Berth unavailable'
  })
  expect(serializer.eventFromJson(json)).toEqual(event)
})
