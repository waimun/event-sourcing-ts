import { expect, test } from '@jest/globals'
import { CargoUnloadedSerializer } from './cargo-unloaded-serializer'
import { Cargo } from '../../cargo'
import { CargoUnloaded } from '../cargo-unloaded'
import { Name } from '../../../shared/domain/name'

test('return event object from json string', () => {
  const payload = {
    type: 'CargoUnloaded',
    aggregateId: 'abc',
    dateTimeOccurred: new Date().toISOString(),
    cargo: 'Refactoring Book'
  }

  const serializer = new CargoUnloadedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))
  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.dateTimeOccurred).toEqual(new Date(payload.dateTimeOccurred))
  expect(event.cargo.name).toEqual(payload.cargo)
})

test('return json string from event object', () => {
  const serializer = new CargoUnloadedSerializer()
  const event = new CargoUnloaded('abc', new Cargo(new Name('Refactoring Book')))
  const json = serializer.eventToJson(event)
  const { type, aggregateId, cargo, dateTimeOccurred, dateTimeRecorded } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(cargo).toEqual(event.cargo.name)
  expect(new Date(dateTimeOccurred)).toEqual(event.dateTimeOccurred)
  expect(new Date(dateTimeRecorded)).toEqual(event.dateTimeRecorded)
})
