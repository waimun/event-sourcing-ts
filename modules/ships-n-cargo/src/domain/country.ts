import { isEmptyString, trim } from '../shared/utils/text'
import { InvalidCountry } from './errors/dock-ship'
import { IsRequired } from '../shared/domain/errors/is-required'

export enum EnumCountry {
  NO_COUNTRY = 'NO_COUNTRY',
  UNITED_STATES = 'US',
  CANADA = 'CA',
  FRANCE = 'FR',
  ARGENTINA = 'AR',
  TURKEY = 'TR',
  SINGAPORE = 'SG',
  AUSTRALIA = 'AU'
}

export class Country {
  public readonly value: EnumCountry

  constructor (code: string) {
    if (isEmptyString(code)) throw new IsRequired('Country')

    const _value = Object.values(EnumCountry).find(v => v === trim(code).toUpperCase())
    if (_value === undefined) throw new InvalidCountry(code)

    this.value = _value
  }
}
