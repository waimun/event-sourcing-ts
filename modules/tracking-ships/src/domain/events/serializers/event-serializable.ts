import { DomainEvent } from '../domain-event'

export interface EventSerializable<T extends DomainEvent> {
  eventFromJson: (json: string) => T
  eventToJson: (event: T) => string
}
