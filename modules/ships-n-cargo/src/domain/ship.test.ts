import { expect, test } from 'vitest'
import { Id } from '../shared/domain/id'
import { Name } from '../shared/domain/name'
import { Cargo } from './cargo'
import { DockShip } from './commands/dock-ship'
import { LoadCargo } from './commands/load-cargo'
import { RegisterShip } from './commands/register-ship'
import { SailShip } from './commands/sail-ship'
import { UnloadCargo } from './commands/unload-cargo'
import { Country } from './country'
import {
  CargoAlreadyLoaded,
  CargoNotFound,
  IdsMismatch,
  ShipMustBeRegisteredFirst,
  ShipNotAtPort,
  ShipNotAtSea,
  UnregisteredShipRequiredToRegister
} from './errors/ship'
import { Port } from './port'
import { PortName } from './port-name'
import { Ship } from './ship'
import { AtPort, AtSea } from './ship-location'

const port = (name = 'Kingston', country = 'US') =>
  new Port(new PortName(name), new Country(country))
const register = (id = '123') =>
  Ship.register(new RegisterShip(new Name('King Roy'), new Id(id), port()))
const registered = (id = '123') => Ship.apply(undefined, register(id))
const departed = (ship = registered()) =>
  Ship.apply(ship, Ship.depart(new SailShip(new Id(ship.id)), ship))

test('registers a ship at its known initial port', () => {
  const event = register()
  const ship = Ship.apply(undefined, event)

  expect(event.type).toBe('ShipRegistered')
  expect(event.port).toEqual(port())
  expect(ship.location).toEqual(new AtPort(port()))
})

test('rejects registering an already registered ship', () => {
  const ship = registered()
  expect(() =>
    Ship.register(new RegisterShip(new Name('King Roy'), new Id('123'), port()), ship)
  ).toThrow(UnregisteredShipRequiredToRegister)
})

test('departs only from a port', () => {
  const ship = registered()
  const event = Ship.depart(new SailShip(new Id('123')), ship)
  const atSea = Ship.apply(ship, event)

  expect(event.type).toBe('ShipDeparted')
  expect(atSea.location).toBeInstanceOf(AtSea)
  expect(() => Ship.depart(new SailShip(new Id('123')), atSea)).toThrow(ShipNotAtPort)
})

test('departure requires a matching registered ship', () => {
  expect(() => Ship.depart(new SailShip(new Id('123')))).toThrow(ShipMustBeRegisteredFirst)
  expect(() => Ship.depart(new SailShip(new Id('456')), registered())).toThrow(IdsMismatch)
})

test('arrives only from sea', () => {
  const atPort = registered()
  const command = new DockShip(new Id('123'), port('Boston'))

  expect(() => Ship.arrive(command, atPort)).toThrow(ShipNotAtSea)

  const atSea = departed(atPort)
  const event = Ship.arrive(command, atSea)
  const arrived = Ship.apply(atSea, event)

  expect(event.type).toBe('ShipArrived')
  expect(arrived.location).toEqual(new AtPort(port('Boston')))
})

test('arrival requires a matching registered ship', () => {
  const command = new DockShip(new Id('123'), port())
  expect(() => Ship.arrive(command)).toThrow(ShipMustBeRegisteredFirst)
  expect(() => Ship.arrive(new DockShip(new Id('456'), port()), departed())).toThrow(IdsMismatch)
})

test('loads and unloads cargo while preserving current location behavior', () => {
  const ship = registered()
  const item = new Cargo(new Name('Refactoring Book'))
  const loadedEvent = Ship.loadCargo(new LoadCargo(new Id('123'), item), ship)
  const loaded = Ship.apply(ship, loadedEvent)

  expect(loaded.cargo).toHaveLength(1)
  expect(() =>
    Ship.loadCargo(new LoadCargo(new Id('123'), new Cargo(new Name('REFACTORING BOOK'))), loaded)
  ).toThrow(CargoAlreadyLoaded)

  const unloadedEvent = Ship.unloadCargo(new UnloadCargo(new Id('123'), item), loaded)
  expect(Ship.apply(loaded, unloadedEvent).cargo).toEqual([])
})

test('cargo operations require a matching registered ship and onboard cargo', () => {
  const item = new Cargo(new Name('Refactoring Book'))
  expect(() => Ship.loadCargo(new LoadCargo(new Id('123'), item))).toThrow(
    ShipMustBeRegisteredFirst
  )
  expect(() => Ship.loadCargo(new LoadCargo(new Id('456'), item), registered())).toThrow(
    IdsMismatch
  )
  expect(() => Ship.unloadCargo(new UnloadCargo(new Id('123'), item))).toThrow(
    ShipMustBeRegisteredFirst
  )
  expect(() => Ship.unloadCargo(new UnloadCargo(new Id('456'), item), registered())).toThrow(
    IdsMismatch
  )
  expect(() => Ship.unloadCargo(new UnloadCargo(new Id('123'), item), registered())).toThrow(
    new CargoNotFound('Refactoring Book')
  )
})

test('arrival continues to update the existing cargo Canada state', () => {
  const initial = registered()
  const cargo = new Cargo(new Name('Microservices Architecture'))
  const loaded = Ship.apply(initial, Ship.loadCargo(new LoadCargo(new Id('123'), cargo), initial))
  const atSea = departed(loaded)
  const arrived = Ship.apply(
    atSea,
    Ship.arrive(new DockShip(new Id('123'), port('Belmont', 'CA')), atSea)
  )

  expect(arrived.cargo[0].hasBeenInCanada).toBe(true)
})

test('clone retains identity and immutable aggregate state', () => {
  const ship = registered()
  const clone = Ship.clone(ship)
  expect(clone).not.toBe(ship)
  expect(clone.equals(ship)).toBe(true)
  expect(Object.isFrozen(clone)).toBe(true)
})
