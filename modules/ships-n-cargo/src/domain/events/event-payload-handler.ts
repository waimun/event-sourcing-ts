import { EventSerializerNotFound } from '../errors/event-payload-handler'
import type { DomainEvent } from './domain-event'
import type { EventSerializable } from './serializers/event-serializable'

// biome-ignore lint/suspicious/noExplicitAny: A heterogeneous registry intentionally erases each serializer's event subtype.
type RegisteredEventSerializer = EventSerializable<any>

export class EventPayloadHandler {
  private readonly handlers: Map<string, RegisteredEventSerializer>

  constructor() {
    this.handlers = new Map<string, RegisteredEventSerializer>()
  }

  register(type: string, serializer: RegisteredEventSerializer): void {
    this.handlers.set(type, serializer)
  }

  byType(type: string): EventSerializable<DomainEvent> {
    const serializer = this.handlers.get(type)

    if (serializer === undefined) throw new EventSerializerNotFound(type)

    return serializer
  }
}
