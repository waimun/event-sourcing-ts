import { DomainError } from '../error'
import { isDate } from '../utils/date'

export class ISODate {
  public readonly value: Date

  constructor(isoDate: string = new Date().toISOString()) {
    if (!isDate(isoDate)) throw new InvalidDate()
    this.value = new Date(isoDate)
  }
}

export class InvalidDate extends DomainError {
  declare readonly code: 'INVALID_DATE'
  constructor() {
    super({ code: 'INVALID_DATE', kind: 'validation', message: 'Invalid date' })
  }
}
