import { InfrastructureError, InvariantError } from '../../../../shared/errors/kernel'

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

export const MAX_GLOBAL_FEED_BATCH_SIZE = 1_000

export class InvalidGlobalPosition extends InvariantError {
  constructor(position: bigint) {
    super({
      code: 'INVALID_GLOBAL_POSITION',
      message: `Global position must be nonnegative: ${position}`,
      meta: { position: position.toString() }
    })
  }
}

export class InvalidGlobalFeedBatchSize extends InvariantError {
  constructor(batchSize: number) {
    super({
      code: 'INVALID_GLOBAL_FEED_BATCH_SIZE',
      message: `Global feed batch size must be a positive safe integer no greater than ${MAX_GLOBAL_FEED_BATCH_SIZE}: ${batchSize}`,
      meta: { batchSize, maximum: MAX_GLOBAL_FEED_BATCH_SIZE }
    })
  }
}

export const validateGlobalFeedRead = (position: bigint, batchSize: number): void => {
  if (position < 0n) throw new InvalidGlobalPosition(position)
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_GLOBAL_FEED_BATCH_SIZE) {
    throw new InvalidGlobalFeedBatchSize(batchSize)
  }
}

export class EventJournalSchemaIncompatible extends InfrastructureError {
  constructor(database: string, details: string) {
    const separator = details.includes('\n') ? '.\n\n' : ': '
    super({
      code: 'EVENT_JOURNAL_SCHEMA_INCOMPATIBLE',
      message: `${database} event journal schema is incompatible${separator}${details}`,
      meta: { database, details }
    })
  }
}
