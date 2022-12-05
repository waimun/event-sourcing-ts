import { expect, test } from '@jest/globals'
import { ShipCreated } from './ship-created'

test('output domain event as JSON', () => {
  const event = new ShipCreated('123', 'King Roy')
  const json = event.asJson()

  expect(json).toBeTruthy()

  const obj = JSON.parse(json)
  expect(obj.type).toEqual(ShipCreated.name)
  expect(obj.aggregateId).toEqual('123')
  expect(obj.dateTimeOccurred).toBeTruthy()
  expect(obj.dateTimeRecorded).toBeTruthy()
})
