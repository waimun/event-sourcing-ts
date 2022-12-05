import { EventSerializable } from './serializers/event-serializable'
import { EventSerializerNotFound } from '../errors/event-payload-handler'
import { DomainEvent } from './domain-event'

export class EventPayloadHandler {
  private readonly handlers: Map<string, EventSerializable<any>>

  constructor () {
    this.handlers = new Map<string, EventSerializable<DomainEvent>>()
  }

  register (type: string, serializer: EventSerializable<any>): void {
    this.handlers.set(type, serializer)
  }

  byType (type: string): EventSerializable<DomainEvent> {
    const serializer = this.handlers.get(type)

    if (serializer === undefined) throw new EventSerializerNotFound(type)

    return serializer
  }
}
