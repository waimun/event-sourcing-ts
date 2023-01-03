import { expect, test } from '@jest/globals'
import { Ship } from './ship'
import { CreateShip } from './commands/create-ship'
import { ShipCreated } from './events/ship-created'
import { SailShip } from './commands/sail-ship'
import { DockShip } from './commands/dock-ship'
import { Port } from './port'
import { LoadCargo } from './commands/load-cargo'
import { Cargo } from './cargo'
import { UnloadCargo } from './commands/unload-cargo'
import { ShipDeparted } from './events/ship-departed'
import { UnitTestCreated } from './events/unit-test-created'
import { ShipArrived } from './events/ship-arrived'
import {
  CargoAlreadyLoaded, CargoNotFound,
  IdsMismatch,
  InvalidPortForDeparture,
  ShipMustBeCreatedFirst,
  UninitializedShipRequiredToCreate
} from './errors/ship'
import { Country } from './country'
import { Name } from '../shared/domain/name'
import { Id } from '../shared/domain/id'
import { PortName } from './port-name'

test('create command', () => {
  const command = new CreateShip(new Name('King Roy'), new Id('123'))

  const event = Ship.create(command, Ship.uninitialized())

  expect(event.type).toBe('ShipCreated')
  expect(event.aggregateId).toBe('123')
})

test('create command with a Ship object that is not uninitialized', () => {
  const command = new CreateShip(new Name('King Roy'), new Id('123'))

  const event = Ship.create(command, Ship.uninitialized()) // accepted

  const ship = Ship.apply(Ship.uninitialized(), event)

  expect(() => {
    Ship.create(command, ship) // rejected because Ship object that is passed in is already created
  }).toThrow(UninitializedShipRequiredToCreate)
})

test('depart command', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  const ship2 = Ship.apply(ship, new ShipArrived('123', new Port(new PortName('Henderson'), new Country('US'))))

  const event = Ship.depart(new SailShip(new Id('123')), ship2)

  expect(event.type).toBe('ShipDeparted')
  expect(event.aggregateId).toBe('123')
})

test('depart command with a Ship object that is uninitialized', () => {
  expect(() => {
    Ship.depart(new SailShip(new Id('123')), Ship.uninitialized())
  }).toThrow(ShipMustBeCreatedFirst)
})

test('depart command with a Ship object that has a different aggregate ID', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  expect(() => {
    Ship.depart(new SailShip(new Id('456')), ship)
  }).toThrow(IdsMismatch)
})

test('depart command with a missing port', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  expect(() => {
    Ship.depart(new SailShip(new Id('123')), ship)
  }).toThrow(InvalidPortForDeparture)
})

test('depart command with a Ship that is at sea (already departed)', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  const ship2 = Ship.apply(ship, new ShipArrived('123', new Port(new PortName('Henderson'), new Country('US'))))

  const event = Ship.depart(new SailShip(new Id('123')), ship2)
  const ship3 = Ship.apply(ship2, event)

  expect(() => {
    Ship.depart(new SailShip(new Id('123')), ship3)
  }).toThrow(InvalidPortForDeparture)
})

test('arrive in USA', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  const dockShip = new DockShip(new Id('123'), new Port(new PortName('New York'), new Country('US')))
  const event = Ship.arrive(dockShip, ship)

  expect(event.type).toBe('ShipArrived')
  expect(event.aggregateId).toBe('123')
})

test('arrive command with a Ship object is not created yet', () => {
  const dockShip = new DockShip(new Id('123'), new Port(new PortName('New York'), new Country('US')))

  expect(() => {
    Ship.arrive(dockShip, Ship.uninitialized())
  }).toThrow(ShipMustBeCreatedFirst)
})

test('arrive command with a Ship object that has a different aggregate ID', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  expect(() => {
    Ship.arrive(new DockShip(new Id('456'), new Port(new PortName('New York'), new Country('US'))), ship)
  }).toThrow(IdsMismatch)
})

test('load cargo', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  const event = Ship.loadCargo(new LoadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), ship)

  expect(event.type).toBe('CargoLoaded')
  expect(event.aggregateId).toBe('123')

  const ship2 = Ship.apply(ship, event)
  expect(ship2.cargo.length).toEqual(1)
})

test('load cargo requires a Ship be created first', () => {
  expect(() => {
    Ship.loadCargo(new LoadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), Ship.uninitialized())
  }).toThrow(ShipMustBeCreatedFirst)
})

test('load cargo command with a Ship object that has a different aggregate ID', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  expect(() => {
    Ship.loadCargo(new LoadCargo(new Id('456'), new Cargo(new Name('Refactoring Book'))), ship)
  }).toThrow(IdsMismatch)
})

test('load cargo with a cargo that is already loaded', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  const cargoLoaded = Ship.loadCargo(new LoadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), ship)
  const ship2 = Ship.apply(ship, cargoLoaded)

  expect(() => {
    Ship.loadCargo(new LoadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), ship2)
  }).toThrow(CargoAlreadyLoaded)
})

test('unload cargo', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  const cargoLoaded = Ship.loadCargo(new LoadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), ship)
  const ship2 = Ship.replay(ship, [cargoLoaded])
  expect(ship2.cargo.length).toEqual(1)

  const cargoUnloaded = Ship.unloadCargo(new UnloadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), ship2)

  expect(cargoUnloaded.type).toBe('CargoUnloaded')
  expect(cargoUnloaded.aggregateId).toBe('123')
  const ship3 = Ship.replay(ship, [cargoLoaded, cargoUnloaded])
  expect(ship3.cargo.length).toEqual(0)
})

test('unload cargo requires a Ship be created first', () => {
  expect(() => {
    Ship.unloadCargo(new UnloadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), Ship.uninitialized())
  }).toThrow(ShipMustBeCreatedFirst)
})

test('unload cargo with a Ship object that has a different aggregate ID', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  expect(() => {
    Ship.unloadCargo(new UnloadCargo(new Id('456'), new Cargo(new Name('Refactoring Book'))), ship)
  }).toThrow(IdsMismatch)
})

test('unload cargo with a cargo that is not found on the Ship', () => {
  const ship = Ship.apply(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))

  expect(() => {
    Ship.unloadCargo(new UnloadCargo(new Id('123'), new Cargo(new Name('Refactoring Book'))), ship)
  }).toThrow(new CargoNotFound('Refactoring Book'))
})

test('cargo has been in Canada', () => {
  const shipCreated = Ship.create(new CreateShip(new Name('King Roy'), new Id('123')), Ship.uninitialized())
  const ship = Ship.apply(Ship.uninitialized(), shipCreated)
  const cargoLoaded = Ship.loadCargo(new LoadCargo(new Id('123'), new Cargo(new Name('Microservices Architecture'))), ship)
  const shipArrived1 = Ship.arrive(new DockShip(new Id('123'), new Port(new PortName('Hudson'), new Country('US'))), ship)
  const ship2 = Ship.replay(ship, [cargoLoaded, shipArrived1])
  const shipDeparted = Ship.depart(new SailShip(new Id('123')), ship2)
  const shipArrived2 = Ship.arrive(new DockShip(new Id('123'), new Port(new PortName('Belmont'), new Country('CA'))), ship2)
  const finalShip: Ship = Ship.replay(ship, [cargoLoaded, shipArrived1, shipDeparted, shipArrived2])
  expect(finalShip.cargo.length).toBe(1)
  expect(finalShip.cargo[0].hasBeenInCanada).toBeTruthy()
})

test('ShipCreated event with an uninitialized Ship', () => {
  const ship = Ship.handleShipCreated(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  expect(ship.id).toBe('123')
  expect(ship.name).toBe('King Roy')
})

test('ShipCreated event with a Ship that is not uninitialized', () => {
  const ship = Ship.handleShipCreated(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  const ship2 = Ship.handleShipCreated(ship, new ShipCreated('456', 'Robin Hood'))

  expect(ship2.id).toBe('123')
  expect(ship2.name).toBe('King Roy')
})

test('ShipDeparted event', () => {
  const ship = Ship.handleShipCreated(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  const ship2 = Ship.handleDeparture(ship, new ShipDeparted('123'))
  expect(ship2.id).toBe('123')
  expect(ship2.name).toBe('King Roy')
  expect(ship2.port.name).toBe(Port.atSea().name)
})

test('UnitTestCreated event', () => {
  // for test coverage; reaching the branch where no logic exists for this event type
  const ship = Ship.handleShipCreated(Ship.uninitialized(), new ShipCreated('123', 'King Roy'))
  const ship2 = Ship.apply(ship, new UnitTestCreated('123'))
  expect(ship2.id).toBe('123')
})
