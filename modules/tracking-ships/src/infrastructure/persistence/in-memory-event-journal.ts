import { EventJournal } from '../../domain/events/event-journal'
import { DomainEvent } from '../../domain/events/domain-event'
import { EventPayloadHandler } from '../../domain/events/event-payload-handler'
import { Result } from '../../shared/result'

export class InMemoryEventJournal implements EventJournal {
  name: string
  private readonly entries: Map<string, DomainEvent[]>
  private readonly handler: EventPayloadHandler

  constructor (name: string, handler: EventPayloadHandler) {
    this.name = name
    this.entries = new Map<string, DomainEvent[]>()
    this.handler = handler
  }

  append (aggregateId: string, events: DomainEvent[]): void {
    if (this.entries.has(aggregateId)) {
            this.entries.get(aggregateId)?.push(...events)
    } else {
      this.entries.set(aggregateId, events)
    }
  }

  entriesByAggregate (aggregateId: string): DomainEvent[] {
    return this.entries.get(aggregateId) ?? []
  }

  eventFrom (json: string): Result<DomainEvent> {
    const { type } = JSON.parse(json)
    const handler = this.handler.byType(type)

    if (handler.isSuccess) return Result.ok((handler.getValue() as Function)(json))

    return Result.fail(handler.getValue() as Error)
  }
}
