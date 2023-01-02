import { expect, test } from '@jest/globals'
import { Port } from './port'
import { Country, EnumCountry } from './country'
import { PortName } from './port-name'
import { IsRequired } from '../shared/domain/errors/is-required'
import { NameNotAllowed } from '../shared/domain/name'

test('empty name', () => {
  expect(() => new Port(new PortName(''), new Country('US'))).toThrow(IsRequired)
})

test('name with 3 whitespaces', () => {
  // evaluates to empty string
  expect(() => new Port(new PortName('   '), new Country('US'))).toThrow(IsRequired)
})

test('name with leading and trailing space', () => {
  // evaluates to 'a' after spaces trimmed
  expect(() => new Port(new PortName(' a '), new Country('US'))).toThrow(NameNotAllowed)
})

test('name with dashes', () => {
  const port = new Port(new PortName('king-roy'), new Country('US'))
  expect(port.name).toEqual('king-roy')
  expect(port.country).toEqual(EnumCountry.UNITED_STATES)
})

test('name with underscores', () => {
  const port = new Port(new PortName('king_roy'), new Country('US'))
  expect(port.name).toEqual('king_roy')
  expect(port.country).toEqual(EnumCountry.UNITED_STATES)
})

test('name with spaces', () => {
  const port = new Port(new PortName('king roy'), new Country('US'))
  expect(port.name).toEqual('king roy')
  expect(port.country).toEqual(EnumCountry.UNITED_STATES)
})

test('name with invalid chars', () => {
  expect(() => new Port(new PortName('&^*'), new Country('US'))).toThrow(NameNotAllowed)
})

test('name < 3 chars', () => {
  expect(() => new Port(new PortName('xy'), new Country('US'))).toThrow(NameNotAllowed)
})

test('name > 50 chars', () => {
  expect(() =>
    new Port(new PortName('Vl8PlucvE0g6PtFbejhqQ8TFmlqXtsAPzJER6LOIuFAoyNTGaxy'), new Country('US'))
  ).toThrow(NameNotAllowed)
})
