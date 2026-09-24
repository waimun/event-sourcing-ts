import { expect, test } from 'vitest'
import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { ShipRegistered } from './ship-registered'

test('output domain event as JSON', () => {
  const event = new ShipRegistered(
    '123',
    'King Roy',
    new Port(new PortName('Kingston'), new Country('US'))
  )
  const json = event.asJson()

  expect(json).toBeTruthy()

  const obj = JSON.parse(json)
  expect(obj.type).toEqual(ShipRegistered.eventType)
  expect(obj.aggregateId).toEqual('123')
  expect(obj.occurredAt).toBeTruthy()
  expect(obj.recordedAt).toBeTruthy()
})
