import type { DomainEvent } from './domain-event'

export interface EventUpcaster<TEvent extends DomainEvent, TFromData = unknown, TToData = unknown> {
  readonly eventType: TEvent['type']
  readonly fromSchemaVersion: number
  readonly toSchemaVersion: number
  upcast: (data: TFromData) => TToData
}
