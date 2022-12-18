import { expect, test } from '@jest/globals'
import { EventPayloadHandler } from './event-payload-handler'
import { CargoLoaded } from './cargo-loaded'
import { CargoLoadedSerializer } from './serializers/cargo-loaded-serializer'
import { EventSerializerNotFound } from '../errors/event-payload-handler'

test('construct class object', () => {
  const handler = new EventPayloadHandler()
  expect(handler).toBeTruthy()
})

test('event serializer registered successfully', () => {
  const handler = new EventPayloadHandler()
  handler.register(CargoLoaded.name, new CargoLoadedSerializer())
  const serializer = handler.byType(CargoLoaded.name)
  expect(serializer instanceof CargoLoadedSerializer).toBeTruthy()
})

test('cannot find serializer registered in the handler', () => {
  const handler = new EventPayloadHandler()
  handler.register(CargoLoaded.name, new CargoLoadedSerializer())
  expect(() => handler.byType('UNKNOWN_SERIALIZER'))
    .toThrow(new EventSerializerNotFound('UNKNOWN_SERIALIZER'))
})
