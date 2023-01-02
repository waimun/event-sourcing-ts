import { expect, test } from '@jest/globals'
import { DockShip } from './dock-ship'
import { Port } from '../port'
import { CannotDockShipAtSea, CannotDockWithoutPort, NoCountrySpecifiedForPort } from '../errors/dock-ship'
import { Country, EnumCountry } from '../country'
import { PortName } from '../port-name'
import { Id, IdNotAllowed } from '../../shared/domain/id'
import { IsRequired } from '../../shared/domain/errors/is-required'

test('empty id', () => {
  expect(() => new DockShip(new Id(''), new Port(new PortName('test'), new Country('US')))
  ).toThrow(IsRequired)
})

test('id with 2 whitespaces', () => {
  // evaluates to empty string
  expect(() => new DockShip(new Id('  '), new Port(new PortName('test'), new Country('US')))
  ).toThrow(IsRequired)
})

test('id = 1 char', () => {
  const result = new DockShip(new Id('x'), new Port(new PortName('test'), new Country('US')))
  expect(result).toBeTruthy()
})

test('id > 36 chars', () => {
  expect(() =>
    new DockShip(new Id('XA9Kd2nIpBc2LhoWpIjRAQf9OWrgNoaPIJrox'),
      new Port(new PortName('test'), new Country('US')))
  ).toThrow(IdNotAllowed)
})

test('id with dashes', () => {
  const result = new DockShip(new Id('king-1'), new Port(new PortName('test'), new Country('US')))
  expect(result).toBeTruthy()
})

test('id with underscores', () => {
  expect(() => new DockShip(new Id('king_1'), new Port(new PortName('test'), new Country('US')))
  ).toThrow(IdNotAllowed)
})

test('with Port.atSea()', () => {
  expect(() => new DockShip(new Id('king-1'), Port.atSea())
  ).toThrow(CannotDockShipAtSea)
})

test('with Port.none()', () => {
  expect(() => new DockShip(new Id('king-1'), Port.none())
  ).toThrow(CannotDockWithoutPort)
})

test('port without country', () => {
  expect(() => new DockShip(new Id('king-1'), new Port(new PortName('test'), new Country('NO_COUNTRY')))
  ).toThrow(NoCountrySpecifiedForPort)
})

test('command created with id', () => {
  const command = new DockShip(new Id('king-1'), new Port(new PortName('test'), new Country('US')))
  expect(command.id).toEqual('king-1')
})

test('command created with port', () => {
  const port = new Port(new PortName('test'), new Country('US'))
  const command = new DockShip(new Id('king-1'), port)

  expect(command.port.name).toEqual('test')
  expect(command.port.country).toEqual(EnumCountry.UNITED_STATES)
})

test('command created with specified date', () => {
  const port = new Port(new PortName('test'), new Country('US'))
  const currentDate = new Date()
  const command = new DockShip(new Id('king-1'), port, currentDate)

  expect(command.dateTime).toEqual(currentDate)
})

test('command created by omitting date', () => {
  const port = new Port(new PortName('test'), new Country('US'))
  const command = new DockShip(new Id('king-1'), port)

  expect(command.dateTime).toBeTruthy()
})
