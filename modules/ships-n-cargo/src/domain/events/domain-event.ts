export interface DomainEvent<TType extends string = string> {
  occurredAt: Date
  recordedAt: Date
  readonly type: TType
  aggregateId: string
  asJson: () => string
}

export abstract class BaseDomainEvent<TType extends string = string> implements DomainEvent<TType> {
  occurredAt: Date
  recordedAt: Date
  readonly type: TType
  aggregateId: string

  protected constructor(
    type: TType,
    aggregateId: string,
    occurredAt: Date = new Date(),
    recordedAt: Date = new Date()
  ) {
    this.occurredAt = occurredAt
    this.recordedAt = recordedAt
    this.type = type
    this.aggregateId = aggregateId
  }

  asJson(): string {
    return JSON.stringify({
      type: this.type,
      aggregateId: this.aggregateId,
      recordedAt: this.recordedAt,
      occurredAt: this.occurredAt
    })
  }
}
