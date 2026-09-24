import { expect, test } from 'vitest'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { Container } from '../../container'
import { ContainerUnloaded } from '../container-unloaded'
import { ContainerUnloadedSerializer } from './container-unloaded-serializer'

test('return event object from json string', () => {
  const payload = {
    type: 'ContainerUnloaded',
    aggregateId: 'abc',
    occurredAt: '2024-01-02T03:04:05.000Z',
    recordedAt: '2024-01-03T04:05:06.000Z',
    container: { containerId: 'container-1', description: 'Refactoring Book' }
  }

  const serializer = new ContainerUnloadedSerializer()
  const event = serializer.eventFromJson(JSON.stringify(payload))
  expect(event.type).toEqual(payload.type)
  expect(event.aggregateId).toEqual(payload.aggregateId)
  expect(event.occurredAt).toEqual(new Date(payload.occurredAt))
  expect(event.recordedAt).toEqual(new Date(payload.recordedAt))
  expect(event.container).toEqual(payload.container)
})

test('return json string from event object', () => {
  const serializer = new ContainerUnloadedSerializer()
  const event = new ContainerUnloaded(
    'abc',
    new Container(new Id('container-1'), new Name('Refactoring Book'))
  )
  const json = serializer.eventToJson(event)
  const { type, aggregateId, container, occurredAt, recordedAt } = JSON.parse(json)

  expect(type).toEqual(event.type)
  expect(aggregateId).toEqual(event.aggregateId)
  expect(container).toEqual(event.container)
  expect(new Date(occurredAt)).toEqual(event.occurredAt)
  expect(new Date(recordedAt)).toEqual(event.recordedAt)
})
