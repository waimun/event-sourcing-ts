import type { DomainEvent } from '../domain-event'

export interface EventSerializable<T extends DomainEvent> {
  readonly eventType: T['type']
  eventFromJson: (json: string) => T
  eventToJson: (event: T) => string
}
