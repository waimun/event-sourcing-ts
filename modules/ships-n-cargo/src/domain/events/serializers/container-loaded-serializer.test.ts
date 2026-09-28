import { expect, test } from 'vitest'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { CargoReference } from '../../cargo-reference'
import { Container } from '../../container'
import { ContainerLoaded } from '../container-loaded'
import { ContainerLoadedSerializer } from './container-loaded-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ContainerLoaded',
    schemaVersion: 1,
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    data: {
      container: {
        containerId: 'container-1',
        cargoReference: 'cargo-1',
        description: 'Refactoring Book'
      }
    }
  }

  const serializer = new ContainerLoadedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))
  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.container).toEqual(payload.data.container)
})

test('return json string from event object', () => {
  const serializer = new ContainerLoadedSerializer()
  const event = new ContainerLoaded(
    'abc',
    new Container(
      new Id('container-1'),
      new CargoReference('cargo-1'),
      new Name('Refactoring Book')
    )
  )
  expect(JSON.parse(serializer.eventToJson(event))).toEqual({
    type: event.type,
    schemaVersion: 1,
    aggregateId: event.aggregateId,
    occurredAt: event.occurredAt.toISOString(),
    recordedAt: event.recordedAt.toISOString(),
    data: { container: event.container }
  })
})
