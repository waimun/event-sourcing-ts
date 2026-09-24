export interface DomainEvent<TType extends string = string> {
  readonly occurredAt: Date
  readonly recordedAt: Date
  readonly type: TType
  readonly aggregateId: string
  asJson: () => string
}

export abstract class BaseDomainEvent<TType extends string = string> implements DomainEvent<TType> {
  readonly #occurredAt: Date
  readonly #recordedAt: Date
  readonly type: TType
  readonly aggregateId: string

  protected constructor(
    type: TType,
    aggregateId: string,
    occurredAt: Date = new Date(),
    recordedAt: Date = new Date()
  ) {
    this.#occurredAt = new Date(occurredAt)
    this.#recordedAt = new Date(recordedAt)
    this.type = type
    this.aggregateId = aggregateId
  }

  get occurredAt(): Date {
    return new Date(this.#occurredAt)
  }

  get recordedAt(): Date {
    return new Date(this.#recordedAt)
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
