import { trim } from '../shared/utils/text'

export enum Country {
  NO_COUNTRY = 'NO_COUNTRY',
  UNITED_STATES = 'US',
  CANADA = 'CA',
  FRANCE = 'FR',
  ARGENTINA = 'AR',
  TURKEY = 'TR',
  SINGAPORE = 'SG',
  AUSTRALIA = 'AU'
}

export const countryFromString = (code: string): Country => {
  return Object.values(Country).find(v => v === trim(code).toUpperCase()) as Country
}
