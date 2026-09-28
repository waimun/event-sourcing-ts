import type { DomainEvent } from '../domain-event'

export interface EventMetadata {
  readonly aggregateId: string
  readonly occurredAt: Date
  readonly recordedAt: Date
}

export interface EventSerializable<T extends DomainEvent, TData = unknown> {
  readonly eventType: T['type']
  readonly schemaVersion: number
  toEvent: (metadata: EventMetadata, data: TData) => T
  toData: (event: T) => TData
}
