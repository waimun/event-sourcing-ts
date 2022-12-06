import { EventJournal } from '../../domain/events/event-journal'
import { DomainEvent } from '../../domain/events/domain-event'
import { EventPayloadHandler } from '../../domain/events/event-payload-handler'

export class InMemoryEventJournal implements EventJournal {
  name: string
  private readonly entries: Map<string, DomainEvent[]>
  private readonly handler: EventPayloadHandler

  constructor (name: string, handler: EventPayloadHandler) {
    this.name = name
    this.entries = new Map<string, DomainEvent[]>()
    this.handler = handler
  }

  append (aggregateId: string, ...events: DomainEvent[]): void {
    if (this.entries.has(aggregateId)) {
      this.entries.get(aggregateId)?.push(...events)
    } else {
      this.entries.set(aggregateId, events)
    }
  }

  entriesByAggregate (aggregateId: string): DomainEvent[] {
    return this.entries.get(aggregateId) ?? []
  }

  eventFrom (json: string): DomainEvent {
    const { type } = JSON.parse(json)
    const handler = this.handler.byType(type)
    return handler.eventFromJson(json)
  }
}
