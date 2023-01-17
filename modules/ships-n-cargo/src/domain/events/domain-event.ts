export interface DomainEvent {
  occurredAt: Date
  recordedAt: Date
  type: string
  aggregateId: string
  asJson: () => string
}

export abstract class BaseDomainEvent implements DomainEvent {
  occurredAt: Date
  recordedAt: Date
  type: string
  aggregateId: string

  protected constructor (type: string, aggregateId: string, occurredAt: Date = new Date()) {
    this.occurredAt = occurredAt
    this.recordedAt = new Date()
    this.type = type
    this.aggregateId = aggregateId
  }

  asJson (): string {
    return JSON.stringify({
      type: this.type,
      aggregateId: this.aggregateId,
      recordedAt: this.recordedAt,
      occurredAt: this.occurredAt
    })
  }
}
