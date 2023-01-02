import { expect, test } from '@jest/globals'
import { Country, EnumCountry } from './country'
import { InvalidCountry } from './errors/dock-ship'
import { IsRequired } from '../shared/domain/errors/is-required'

test('valid country', () => {
  const country = new Country('US')
  expect(country.value).toEqual(EnumCountry.UNITED_STATES)
})

test('valid country (case insensitive)', () => {
  const country = new Country('ca')
  expect(country.value).toEqual(EnumCountry.CANADA)
})

test('invalid country', () => {
  expect(() => new Country('ZZ')).toThrow(InvalidCountry)
})

test('empty string', () => {
  expect(() => new Country('')).toThrow(IsRequired)
})

test('country with leading and trailing spaces', () => {
  const country = new Country('  fr ')
  expect(country.value).toEqual(EnumCountry.FRANCE)
})
