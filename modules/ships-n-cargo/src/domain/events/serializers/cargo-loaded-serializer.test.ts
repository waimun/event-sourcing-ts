import { expect, test } from '@jest/globals'
import { CargoLoadedSerializer } from './cargo-loaded-serializer'
import { CargoLoaded } from '../cargo-loaded'
import { Cargo } from '../../cargo'

test('return event object from json string', () => {
  const payload = {
    type: 'CargoLoaded',
    aggregateId: 'abc',
    dateTimeOccurred: new Date().toISOString(),
    cargo: 'Refactoring Book'
  }

  const serializer = new CargoLoadedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))
  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.dateTimeOccurred).toEqual(new Date(payload.dateTimeOccurred))
  expect(event.cargo.name).toEqual(payload.cargo)
})

test('return json string from event object', () => {
  const serializer = new CargoLoadedSerializer()
  const event = new CargoLoaded('abc', new Cargo('Refactoring Book'))
  const json = serializer.eventToJson(event)
  const { type, aggregateId, cargo, dateTimeOccurred, dateTimeRecorded } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(cargo).toEqual(event.cargo.name)
  expect(new Date(dateTimeOccurred)).toEqual(event.dateTimeOccurred)
  expect(new Date(dateTimeRecorded)).toEqual(event.dateTimeRecorded)
})
