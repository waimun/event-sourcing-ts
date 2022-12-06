import { expect, test } from '@jest/globals'
import { Country, Port } from './port'
import { NameIsRequired, NameNotAllowed } from '../shared/validators/name'

test('empty name', () => {
  expect(() => new Port('', Country.US)).toThrow(NameIsRequired)
})

test('name with 3 whitespaces', () => {
  // evaluates to empty string
  expect(() => new Port('   ', Country.US)).toThrow(NameIsRequired)
})

test('name with leading and trailing space', () => {
  // evaluates to 'a' after spaces trimmed
  expect(() => new Port(' a ', Country.US)).toThrow(NameNotAllowed)
})

test('name with dashes', () => {
  const result = new Port('king-roy', Country.US)
  expect(result.name).toEqual('king-roy')
  expect(result.country).toEqual(Country.US)
})

test('name with underscores', () => {
  const result = new Port('king_roy', Country.US)
  expect(result.name).toEqual('king_roy')
  expect(result.country).toEqual(Country.US)
})

test('name with spaces', () => {
  const result = new Port('king roy', Country.US)
  expect(result.name).toEqual('king roy')
  expect(result.country).toEqual(Country.US)
})

test('name with invalid chars', () => {
  expect(() => new Port('&^*', Country.US)).toThrow(NameNotAllowed)
})

test('name < 3 chars', () => {
  expect(() => new Port('xy', Country.US)).toThrow(NameNotAllowed)
})

test('name > 50 chars', () => {
  expect(() =>
    new Port('Vl8PlucvE0g6PtFbejhqQ8TFmlqXtsAPzJER6LOIuFAoyNTGaxy', Country.US)
  ).toThrow(NameNotAllowed)
})
