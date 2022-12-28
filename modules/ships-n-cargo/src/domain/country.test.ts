import { expect, test } from '@jest/globals'
import { Country, countryFromString } from './country'

test('valid country', () => {
  const country = countryFromString('US')
  expect(country).toEqual(Country.UNITED_STATES)
})

test('valid country (case insensitive)', () => {
  const country = countryFromString('ca')
  expect(country).toEqual(Country.CANADA)
})

test('invalid country', () => {
  const country = countryFromString('ZZ')
  expect(country).toBeUndefined()
})

test('country with leading and trailing spaces', () => {
  const country = countryFromString('  fr ')
  expect(country).toEqual(Country.FRANCE)
})
