import { isDate } from '../utils/date'
import { InvalidArgumentError } from '../error'

export class ISODate {
  public readonly value: Date

  constructor (isoDate: string = new Date().toISOString()) {
    if (!isDate(isoDate)) throw new InvalidDate()
    this.value = new Date(isoDate)
  }
}

export class InvalidDate extends InvalidArgumentError {
  constructor () {
    super('Invalid date')
  }
}
