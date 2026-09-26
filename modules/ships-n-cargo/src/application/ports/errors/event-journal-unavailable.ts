import { InfrastructureError } from '../../../shared/errors/kernel'

export type EventJournalOperation = 'append' | 'eventsByAggregate'

export class EventJournalUnavailable extends InfrastructureError {
  constructor(operation: EventJournalOperation, cause: unknown) {
    super({
      code: 'EVENT_JOURNAL_UNAVAILABLE',
      message: `Event journal is unavailable during '${operation}'`,
      meta: { operation },
      cause
    })
  }
}
