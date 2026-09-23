import { InfrastructureError, InvariantError } from '../../../../shared/error'

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

export class EventJournalSchemaIncompatible extends InfrastructureError {
  constructor(details: string) {
    super({
      code: 'EVENT_JOURNAL_SCHEMA_INCOMPATIBLE',
      message: `PostgreSQL event journal schema is incompatible: ${details}`,
      meta: { details }
    })
  }
}
