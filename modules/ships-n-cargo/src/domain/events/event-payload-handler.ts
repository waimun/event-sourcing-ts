import {
  EventPayloadSchemaVersionInvalid,
  EventPayloadSchemaVersionUnsupported,
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../errors/event-payload-handler'
import type { DomainEvent } from './domain-event'
import type { EventSerializable } from './serializers/event-serializable'

// biome-ignore lint/suspicious/noExplicitAny: A heterogeneous registry intentionally erases each serializer's event subtype.
type RegisteredEventSerializer = EventSerializable<any, any>

interface EventEnvelope {
  readonly type: string
  readonly schemaVersion: unknown
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

  private requireSupportedSchemaVersion(
    eventType: string,
    schemaVersion: unknown,
    serializer: RegisteredEventSerializer
  ): void {
    if (
      typeof schemaVersion !== 'number' ||
      !Number.isInteger(schemaVersion) ||
      schemaVersion <= 0
    ) {
      throw new EventPayloadSchemaVersionInvalid(eventType, schemaVersion)
    }

    if (schemaVersion !== serializer.schemaVersion) {
      throw new EventPayloadSchemaVersionUnsupported(
        eventType,
        schemaVersion,
        serializer.schemaVersion
      )
    }
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
    const eventType = String(envelope.type)
    const serializer = this.byType(eventType)
    this.requireSupportedSchemaVersion(eventType, envelope.schemaVersion, serializer)

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
