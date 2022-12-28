import { expect, test } from '@jest/globals'
import { DockShip } from './dock-ship'
import { Port } from '../port'
import { IdIsRequired, IdNotAllowed } from '../../shared/validators/id'
import { CannotDockShipAtSea, CannotDockWithoutPort, NoCountrySpecifiedForPort } from '../errors/dock-ship'
import { Country } from '../country'

test('empty id', () => {
  expect(() => new DockShip('', new Port('test', Country.UNITED_STATES))
  ).toThrow(IdIsRequired)
})

test('id with 2 whitespaces', () => {
  // evaluates to empty string
  expect(() => new DockShip('  ', new Port('test', Country.UNITED_STATES))
  ).toThrow(IdIsRequired)
})

test('id = 1 char', () => {
  const result = new DockShip('x', new Port('test', Country.UNITED_STATES))
  expect(result).toBeTruthy()
})

test('id > 36 chars', () => {
  expect(() =>
    new DockShip('XA9Kd2nIpBc2LhoWpIjRAQf9OWrgNoaPIJrox', new Port('test', Country.UNITED_STATES))
  ).toThrow(IdNotAllowed)
})

test('id with dashes', () => {
  const result = new DockShip('king-1', new Port('test', Country.UNITED_STATES))
  expect(result).toBeTruthy()
})

test('id with underscores', () => {
  expect(() => new DockShip('king_1', new Port('test', Country.UNITED_STATES))
  ).toThrow(IdNotAllowed)
})

test('with Port.atSea()', () => {
  expect(() => new DockShip('king-1', Port.atSea())
  ).toThrow(CannotDockShipAtSea)
})

test('with Port.none()', () => {
  expect(() => new DockShip('king-1', Port.none())
  ).toThrow(CannotDockWithoutPort)
})

test('port without country', () => {
  expect(() => new DockShip('king-1', new Port('test', Country.NO_COUNTRY))
  ).toThrow(NoCountrySpecifiedForPort)
})

test('command created with id', () => {
  const command = new DockShip('king-1', new Port('test', Country.UNITED_STATES))
  expect(command.id).toEqual('king-1')
})

test('command created with port', () => {
  const port = new Port('test', Country.UNITED_STATES)
  const command = new DockShip('king-1', port)

  expect(command.port.name).toEqual('test')
  expect(command.port.country).toEqual(Country.UNITED_STATES)
})

test('command created with specified date', () => {
  const port = new Port('test', Country.UNITED_STATES)
  const currentDate = new Date()
  const command = new DockShip('king-1', port, currentDate)

  expect(command.dateTime).toEqual(currentDate)
})

test('command created by omitting date', () => {
  const port = new Port('test', Country.UNITED_STATES)
  const command = new DockShip('king-1', port)

  expect(command.dateTime).toBeTruthy()
})
