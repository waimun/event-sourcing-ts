import { expect, test } from 'vitest'
import {
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../errors/event-payload-handler'
import { ContainerLoaded } from './container-loaded'
import { ContainerUnloaded } from './container-unloaded'
import { EventPayloadHandler } from './event-payload-handler'
import { ContainerLoadedSerializer } from './serializers/container-loaded-serializer'
import { ContainerUnloadedSerializer } from './serializers/container-unloaded-serializer'

test('construct class object', () => {
  const handler = new EventPayloadHandler()
  expect(handler).toBeTruthy()
})

test('event serializer registered successfully', () => {
  const handler = new EventPayloadHandler()
  handler.register(ContainerLoaded.eventType, new ContainerLoadedSerializer())
  const serializer = handler.byType(ContainerLoaded.eventType)
  expect(serializer instanceof ContainerLoadedSerializer).toBeTruthy()
})

test('reject serializer registered under a different event type', () => {
  const handler = new EventPayloadHandler()

  expect(() => {
    // @ts-expect-error: Exercise the runtime guard after bypassing the compile-time type match.
    handler.register(ContainerLoaded.eventType, new ContainerUnloadedSerializer())
  }).toThrow(
    new EventSerializerTypeMismatch(ContainerLoaded.eventType, ContainerUnloaded.eventType)
  )
})

test('cannot find serializer registered in the handler', () => {
  const handler = new EventPayloadHandler()
  handler.register(ContainerLoaded.eventType, new ContainerLoadedSerializer())
  expect(() => handler.byType('UNKNOWN_SERIALIZER')).toThrow(
    new EventSerializerNotFound('UNKNOWN_SERIALIZER')
  )
})
