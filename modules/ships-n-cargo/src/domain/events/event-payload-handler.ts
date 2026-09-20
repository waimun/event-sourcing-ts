import {
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../errors/event-payload-handler'
import type { DomainEvent } from './domain-event'
import type { EventSerializable } from './serializers/event-serializable'

// biome-ignore lint/suspicious/noExplicitAny: A heterogeneous registry intentionally erases each serializer's event subtype.
type RegisteredEventSerializer = EventSerializable<any>

export class EventPayloadHandler {
  private readonly handlers: Map<string, RegisteredEventSerializer>

  constructor() {
    this.handlers = new Map<string, RegisteredEventSerializer>()
  }

  register<TEvent extends DomainEvent>(
    type: TEvent['type'],
    serializer: EventSerializable<TEvent>
  ): void {
    if (type !== serializer.eventType) {
      throw new EventSerializerTypeMismatch(type, serializer.eventType)
    }

    this.handlers.set(type, serializer)
  }

  byType(type: string): EventSerializable<DomainEvent> {
    const serializer = this.handlers.get(type)

    if (serializer === undefined) throw new EventSerializerNotFound(type)

    return serializer
  }
}
