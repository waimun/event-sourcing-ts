import { expect, test } from 'vitest'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { CargoReference } from '../../cargo-reference'
import { Container } from '../../container'
import { ContainerUnloaded } from '../container-unloaded'
import { ContainerUnloadedSerializer } from './container-unloaded-serializer'

test('restores an event from metadata and event-specific data', () => {
  const payload = {
    type: 'ContainerUnloaded',
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

  const serializer = new ContainerUnloadedSerializer()
  const event = serializer.eventFromData(
    {
      aggregateId: payload.aggregateId,
      occurredAt: new Date(payload.occurredAt),
      recordedAt: new Date(payload.recordedAt)
    },
    payload.data
  )
  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.container).toEqual(payload.data.container)
})

test('returns version-one event-specific data', () => {
  const serializer = new ContainerUnloadedSerializer()
  const event = new ContainerUnloaded(
    'abc',
    new Container(
      new Id('container-1'),
      new CargoReference('cargo-1'),
      new Name('Refactoring Book')
    )
  )
  expect(serializer.schemaVersion).toBe(1)
  expect(serializer.eventToData(event)).toEqual({ container: event.container })
})
