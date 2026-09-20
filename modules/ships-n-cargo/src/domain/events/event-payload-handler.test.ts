import { expect, test } from 'vitest'
import {
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../errors/event-payload-handler'
import { CargoLoaded } from './cargo-loaded'
import { CargoUnloaded } from './cargo-unloaded'
import { EventPayloadHandler } from './event-payload-handler'
import { CargoLoadedSerializer } from './serializers/cargo-loaded-serializer'
import { CargoUnloadedSerializer } from './serializers/cargo-unloaded-serializer'

test('construct class object', () => {
  const handler = new EventPayloadHandler()
  expect(handler).toBeTruthy()
})

test('event serializer registered successfully', () => {
  const handler = new EventPayloadHandler()
  handler.register(CargoLoaded.eventType, new CargoLoadedSerializer())
  const serializer = handler.byType(CargoLoaded.eventType)
  expect(serializer instanceof CargoLoadedSerializer).toBeTruthy()
})

test('reject serializer registered under a different event type', () => {
  const handler = new EventPayloadHandler()

  expect(() => {
    // @ts-expect-error: Exercise the runtime guard after bypassing the compile-time type match.
    handler.register(CargoLoaded.eventType, new CargoUnloadedSerializer())
  }).toThrow(new EventSerializerTypeMismatch(CargoLoaded.eventType, CargoUnloaded.eventType))
})

test('cannot find serializer registered in the handler', () => {
  const handler = new EventPayloadHandler()
  handler.register(CargoLoaded.eventType, new CargoLoadedSerializer())
  expect(() => handler.byType('UNKNOWN_SERIALIZER')).toThrow(
    new EventSerializerNotFound('UNKNOWN_SERIALIZER')
  )
})
