import { expect, test } from '@jest/globals'
import { Port } from './port'
import { NameIsRequired, NameNotAllowed } from '../shared/validators/name'
import { Country } from './country'

test('empty name', () => {
  expect(() => new Port('', Country.UNITED_STATES)).toThrow(NameIsRequired)
})

test('name with 3 whitespaces', () => {
  // evaluates to empty string
  expect(() => new Port('   ', Country.UNITED_STATES)).toThrow(NameIsRequired)
})

test('name with leading and trailing space', () => {
  // evaluates to 'a' after spaces trimmed
  expect(() => new Port(' a ', Country.UNITED_STATES)).toThrow(NameNotAllowed)
})

test('name with dashes', () => {
  const result = new Port('king-roy', Country.UNITED_STATES)
  expect(result.name).toEqual('king-roy')
  expect(result.country).toEqual(Country.UNITED_STATES)
})

test('name with underscores', () => {
  const result = new Port('king_roy', Country.UNITED_STATES)
  expect(result.name).toEqual('king_roy')
  expect(result.country).toEqual(Country.UNITED_STATES)
})

test('name with spaces', () => {
  const result = new Port('king roy', Country.UNITED_STATES)
  expect(result.name).toEqual('king roy')
  expect(result.country).toEqual(Country.UNITED_STATES)
})

test('name with invalid chars', () => {
  expect(() => new Port('&^*', Country.UNITED_STATES)).toThrow(NameNotAllowed)
})

test('name < 3 chars', () => {
  expect(() => new Port('xy', Country.UNITED_STATES)).toThrow(NameNotAllowed)
})

test('name > 50 chars', () => {
  expect(() =>
    new Port('Vl8PlucvE0g6PtFbejhqQ8TFmlqXtsAPzJER6LOIuFAoyNTGaxy', Country.UNITED_STATES)
  ).toThrow(NameNotAllowed)
})
