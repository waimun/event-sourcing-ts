import { expect, test } from '@jest/globals'
import { CargoLoadedSerializer } from './cargo-loaded-serializer'
import { CargoLoaded } from '../cargo-loaded'
import { Cargo } from '../../cargo'
import { Name } from '../../../shared/domain/name'

test('return event object from json string', () => {
  const payload = {
    type: 'CargoLoaded',
    aggregateId: 'abc',
    occurredAt: new Date().toISOString(),
    cargo: 'Refactoring Book'
  }

  const serializer = new CargoLoadedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))
  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.cargo.name).toEqual(payload.cargo)
})

test('return json string from event object', () => {
  const serializer = new CargoLoadedSerializer()
  const event = new CargoLoaded('abc', new Cargo(new Name('Refactoring Book')))
  const json = serializer.eventToJson(event)
  const { type, aggregateId, cargo, occurredAt, recordedAt } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(cargo).toEqual(event.cargo.name)
  expect(new Date(occurredAt)).toEqual(event.occurredAt)
  expect(new Date(recordedAt)).toEqual(event.recordedAt)
})
