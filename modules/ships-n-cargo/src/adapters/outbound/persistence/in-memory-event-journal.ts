import { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import type { EventJournal, EventStream } from '../../../application/ports/event-journal'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Name } from '../../../shared/domain/name'
import { InvariantError } from '../../../shared/error'

export class InMemoryEventJournal implements EventJournal<string, DomainEvent> {
  readonly name: string
  private readonly entries: Map<string, DomainEvent[]>

  constructor(name: Name) {
    this.name = name.value
    this.entries = new Map<string, DomainEvent[]>()
  }

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)

    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const current = this.entries.get(id) ?? []
    if (current.length !== expectedVersion)
      throw new JournalVersionConflict(id, expectedVersion, current.length)

    this.entries.set(id, [...current, ...events])
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    const events = this.entries.get(id) ?? []
    return { events: [...events], version: events.length }
  }
}

export class InvalidExpectedVersion extends InvariantError {
  constructor(expectedVersion: number) {
    super({
      code: 'INVALID_EXPECTED_VERSION',
      message: `Expected version must be a nonnegative safe integer: ${expectedVersion}`
    })
  }
}

export class AggregateIdMismatch extends InvariantError {
  constructor(aggregateId: string) {
    super({
      code: 'AGGREGATE_ID_MISMATCH',
      message: `All appended events must belong to aggregate '${aggregateId}'`,
      meta: { aggregateId }
    })
  }
}

export class EventIsRequired extends InvariantError {
  constructor() {
    super({
      code: 'EVENT_REQUIRED',
      message: 'At least one event is required to create a new entry or append to an existing entry'
    })
  }
}
