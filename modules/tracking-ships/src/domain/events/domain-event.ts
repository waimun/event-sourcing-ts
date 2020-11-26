export interface DomainEvent {
  dateTimeOccurred: Date
  dateTimeRecorded: Date
  type: string
  aggregateId: string
  payload: () => string
}

export abstract class BaseDomainEvent implements DomainEvent {
  dateTimeOccurred: Date
  dateTimeRecorded: Date
  type: string
  aggregateId: string
  basePayload: string

  protected constructor (type: string, aggregateId: string, dateTimeOccurred: Date = new Date()) {
    this.dateTimeOccurred = dateTimeOccurred
    this.dateTimeRecorded = new Date()
    this.type = type
    this.aggregateId = aggregateId
    this.basePayload = JSON.stringify({
      type: this.type,
      aggregateId: this.aggregateId,
      dateTimeRecorded: this.dateTimeRecorded,
      dateTimeOccurred: this.dateTimeOccurred
    })
  }

  abstract payload (): string
}
