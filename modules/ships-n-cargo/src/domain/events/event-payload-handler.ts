import {
  EventPayloadSchemaVersionInvalid,
  EventPayloadSchemaVersionUnsupported,
  EventPayloadUpcasterNotFound,
  EventSerializerNotFound,
  EventSerializerTypeMismatch,
  EventUpcasterAlreadyRegistered,
  EventUpcasterSchemaVersionInvalid,
  EventUpcasterTypeMismatch
} from '../errors/event-payload-handler'
import type { DomainEvent } from './domain-event'
import type { EventUpcaster } from './event-upcaster'
import type { EventSerializable } from './serializers/event-serializable'

// biome-ignore lint/suspicious/noExplicitAny: A heterogeneous registry intentionally erases each serializer's event subtype.
type RegisteredEventSerializer = EventSerializable<any, any>

// biome-ignore lint/suspicious/noExplicitAny: A heterogeneous registry intentionally erases each upcaster's data types.
type RegisteredEventUpcaster = EventUpcaster<any, any, any>

interface EventEnvelope {
  readonly type: string
  readonly schemaVersion: unknown
  readonly aggregateId: string
  readonly occurredAt: string
  readonly recordedAt: string
  readonly data: unknown
}

export class EventPayloadHandler {
  private readonly serializers: Map<string, RegisteredEventSerializer>
  private readonly upcasters: Map<string, Map<number, RegisteredEventUpcaster>>

  constructor() {
    this.serializers = new Map<string, RegisteredEventSerializer>()
    this.upcasters = new Map<string, Map<number, RegisteredEventUpcaster>>()
  }

  register<TEvent extends DomainEvent, TData>(
    type: TEvent['type'],
    serializer: EventSerializable<TEvent, TData>
  ): void {
    if (type !== serializer.eventType) {
      throw new EventSerializerTypeMismatch(type, serializer.eventType)
    }

    this.serializers.set(type, serializer)
  }

  registerUpcaster<TEvent extends DomainEvent, TFromData, TToData>(
    type: TEvent['type'],
    upcaster: EventUpcaster<TEvent, TFromData, TToData>
  ): void {
    if (type !== upcaster.eventType) {
      throw new EventUpcasterTypeMismatch(type, upcaster.eventType)
    }

    if (
      !Number.isInteger(upcaster.fromSchemaVersion) ||
      upcaster.fromSchemaVersion <= 0 ||
      upcaster.toSchemaVersion !== upcaster.fromSchemaVersion + 1
    ) {
      throw new EventUpcasterSchemaVersionInvalid(
        type,
        upcaster.fromSchemaVersion,
        upcaster.toSchemaVersion
      )
    }

    let bySchemaVersion = this.upcasters.get(type)
    if (bySchemaVersion === undefined) {
      bySchemaVersion = new Map<number, RegisteredEventUpcaster>()
      this.upcasters.set(type, bySchemaVersion)
    }

    if (bySchemaVersion.has(upcaster.fromSchemaVersion)) {
      throw new EventUpcasterAlreadyRegistered(type, upcaster.fromSchemaVersion)
    }

    bySchemaVersion.set(upcaster.fromSchemaVersion, upcaster)
  }

  private byType(type: string): RegisteredEventSerializer {
    const serializer = this.serializers.get(type)

    if (serializer === undefined) throw new EventSerializerNotFound(type)

    return serializer
  }

  private requireSchemaVersion(
    eventType: string,
    schemaVersion: unknown,
    serializer: RegisteredEventSerializer
  ): number {
    if (
      typeof schemaVersion !== 'number' ||
      !Number.isInteger(schemaVersion) ||
      schemaVersion <= 0
    ) {
      throw new EventPayloadSchemaVersionInvalid(eventType, schemaVersion)
    }

    if (schemaVersion > serializer.schemaVersion) {
      throw new EventPayloadSchemaVersionUnsupported(
        eventType,
        schemaVersion,
        serializer.schemaVersion
      )
    }

    return schemaVersion
  }

  private upcast(
    eventType: string,
    schemaVersion: number,
    currentSchemaVersion: number,
    data: unknown
  ): unknown {
    let upcastData = data

    for (let version = schemaVersion; version < currentSchemaVersion; version += 1) {
      const upcaster = this.upcasters.get(eventType)?.get(version)
      if (upcaster === undefined) {
        throw new EventPayloadUpcasterNotFound(eventType, version, currentSchemaVersion)
      }

      upcastData = upcaster.upcast(upcastData)
    }

    return upcastData
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
    const schemaVersion = this.requireSchemaVersion(eventType, envelope.schemaVersion, serializer)
    const data = this.upcast(eventType, schemaVersion, serializer.schemaVersion, envelope.data)

    return serializer.toEvent(
      {
        aggregateId: envelope.aggregateId,
        occurredAt: new Date(envelope.occurredAt),
        recordedAt: new Date(envelope.recordedAt)
      },
      data
    )
  }
}
