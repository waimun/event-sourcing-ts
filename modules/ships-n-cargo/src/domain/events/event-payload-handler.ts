import {
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../errors/event-payload-handler'
import type { DomainEvent } from './domain-event'
import type { EventSerializable } from './serializers/event-serializable'

// biome-ignore lint/suspicious/noExplicitAny: A heterogeneous registry intentionally erases each serializer's event subtype.
type RegisteredEventSerializer = EventSerializable<any, any>

interface EventEnvelope {
  readonly type: string
  readonly schemaVersion: number
  readonly aggregateId: string
  readonly occurredAt: string
  readonly recordedAt: string
  readonly data: unknown
}

export class EventPayloadHandler {
  private readonly handlers: Map<string, RegisteredEventSerializer>

  constructor() {
    this.handlers = new Map<string, RegisteredEventSerializer>()
  }

  register<TEvent extends DomainEvent, TData>(
    type: TEvent['type'],
    serializer: EventSerializable<TEvent, TData>
  ): void {
    if (type !== serializer.eventType) {
      throw new EventSerializerTypeMismatch(type, serializer.eventType)
    }

    this.handlers.set(type, serializer)
  }

  private byType(type: string): RegisteredEventSerializer {
    const serializer = this.handlers.get(type)

    if (serializer === undefined) throw new EventSerializerNotFound(type)

    return serializer
  }

  serialize(event: DomainEvent): string {
    const serializer = this.byType(event.type)

    return JSON.stringify({
      type: event.type,
      schemaVersion: serializer.schemaVersion,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: serializer.toData(event)
    })
  }

  deserialize(payload: string): DomainEvent {
    const envelope = JSON.parse(payload) as EventEnvelope
    const serializer = this.byType(String(envelope.type))

    return serializer.toEvent(
      {
        aggregateId: envelope.aggregateId,
        occurredAt: new Date(envelope.occurredAt),
        recordedAt: new Date(envelope.recordedAt)
      },
      envelope.data
    )
  }
}
