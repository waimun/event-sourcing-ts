import { afterEach, expect, test, vi } from 'vitest'
import { Id } from '../shared/domain/id'
import { Name } from '../shared/domain/name'
import { CargoReference } from './cargo-reference'
import { DockShip } from './commands/dock-ship'
import { LoadContainer } from './commands/load-container'
import { PlanVoyage } from './commands/plan-voyage'
import { RegisterShip } from './commands/register-ship'
import { SailShip } from './commands/sail-ship'
import { UnloadContainer } from './commands/unload-container'
import { Container } from './container'
import { Country } from './country'
import {
  ContainerAlreadyLoaded,
  ContainerNotFound,
  IdsMismatch,
  ShipMustBeRegisteredFirst,
  ShipMustDockAtVoyageDestination,
  ShipNotAtPort,
  ShipNotAtSea,
  UnregisteredShipRequiredToRegister,
  VoyageAlreadyPlanned,
  VoyageDestinationSameAsOrigin,
  VoyageRequiredToDepart
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
const planned = (ship = registered(), destination = port('Boston')) =>
  Ship.apply(ship, Ship.planVoyage(new PlanVoyage(new Id(ship.id), destination), ship))
const departed = (ship = registered()) => {
  const ready = ship.activeVoyage === undefined ? planned(ship) : ship
  return Ship.apply(ready, Ship.depart(new SailShip(new Id(ready.id)), ready))
}

afterEach(() => {
  vi.useRealTimers()
})

test('registers a ship at its known initial port', () => {
  const event = register()
  const ship = Ship.apply(undefined, event)

  expect(event.type).toBe('ShipRegistered')
  expect(event.port).toEqual(port())
  expect(ship.location).toEqual(new AtPort(port()))
})

test('normal commands assign both event times from the server clock', () => {
  vi.useFakeTimers()
  const serverTime = new Date('2026-09-24T12:00:00.000Z')
  vi.setSystemTime(serverTime)

  const registration = register()
  const atPort = Ship.apply(undefined, registration)
  const container = new Container(
    new Id('container-1'),
    new CargoReference('cargo-1'),
    new Name('Refactoring Book')
  )
  const loading = Ship.loadContainer(new LoadContainer(new Id(atPort.id), container), atPort)
  const loaded = Ship.apply(atPort, loading)
  const unloading = Ship.unloadContainer(
    new UnloadContainer(new Id(loaded.id), new Id(container.containerId)),
    loaded
  )
  const voyagePlanned = Ship.planVoyage(new PlanVoyage(new Id(atPort.id), port('Boston')), atPort)
  const readyToDepart = Ship.apply(atPort, voyagePlanned)
  const departedEvent = Ship.depart(new SailShip(new Id(atPort.id)), readyToDepart)
  const atSea = Ship.apply(readyToDepart, departedEvent)
  const arrival = Ship.arrive(new DockShip(new Id(atSea.id), port('Boston')), atSea)

  for (const event of [registration, loading, unloading, voyagePlanned, departedEvent, arrival]) {
    expect(event.occurredAt).toEqual(serverTime)
    expect(event.recordedAt).toEqual(serverTime)
  }
})

test('rejects registering an already registered ship', () => {
  const ship = registered()
  expect(() =>
    Ship.register(new RegisterShip(new Name('King Roy'), new Id('123'), port()), ship)
  ).toThrow(UnregisteredShipRequiredToRegister)
})

test('plans one voyage from the current port to a different destination', () => {
  const ship = registered()
  const destination = port('Boston')
  const event = Ship.planVoyage(new PlanVoyage(new Id('123'), destination), ship)
  const ready = Ship.apply(ship, event)

  expect(event.origin).toEqual(port())
  expect(event.destination).toEqual(destination)
  expect(ready.activeVoyage).toEqual({ origin: port(), destination })
  expect(Object.isFrozen(ready.activeVoyage)).toBe(true)
  expect(() => Ship.planVoyage(new PlanVoyage(new Id('123'), port('Belmont')), ready)).toThrow(
    VoyageAlreadyPlanned
  )
  expect(() => Ship.planVoyage(new PlanVoyage(new Id('123'), port()), ship)).toThrow(
    VoyageDestinationSameAsOrigin
  )
})

test('voyage planning requires a matching registered ship at a port', () => {
  const command = new PlanVoyage(new Id('123'), port('Boston'))
  expect(() => Ship.planVoyage(command)).toThrow(ShipMustBeRegisteredFirst)
  expect(() =>
    Ship.planVoyage(new PlanVoyage(new Id('456'), port('Boston')), registered())
  ).toThrow(IdsMismatch)
  expect(() => Ship.planVoyage(command, departed())).toThrow(new ShipNotAtPort('plan a voyage'))
})

test('departs only from a port with an active voyage', () => {
  const ship = registered()
  expect(() => Ship.depart(new SailShip(new Id('123')), ship)).toThrow(VoyageRequiredToDepart)

  const ready = planned(ship)
  const event = Ship.depart(new SailShip(new Id('123')), ready)
  const atSea = Ship.apply(ready, event)

  expect(event.type).toBe('ShipDeparted')
  expect(atSea.location).toBeInstanceOf(AtSea)
  expect(atSea.activeVoyage).toEqual(ready.activeVoyage)
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
  expect(arrived.activeVoyage).toBeUndefined()
})

test('arrives only at the active voyage destination', () => {
  const atSea = departed()
  expect(() => Ship.arrive(new DockShip(new Id('123'), port('Belmont', 'CA')), atSea)).toThrow(
    ShipMustDockAtVoyageDestination
  )
})

test('arrival requires a matching registered ship', () => {
  const command = new DockShip(new Id('123'), port())
  expect(() => Ship.arrive(command)).toThrow(ShipMustBeRegisteredFirst)
  expect(() => Ship.arrive(new DockShip(new Id('456'), port()), departed())).toThrow(IdsMismatch)
})

test('loads and unloads containers by stable identity while at a port', () => {
  const ship = registered()
  const item = new Container(
    new Id('container-1'),
    new CargoReference('cargo-1'),
    new Name('Refactoring Book')
  )
  const loadedEvent = Ship.loadContainer(new LoadContainer(new Id('123'), item), ship)
  const loaded = Ship.apply(ship, loadedEvent)

  expect(loaded.containers).toEqual([item])
  expect(() =>
    Ship.loadContainer(
      new LoadContainer(
        new Id('123'),
        new Container(
          new Id('container-1'),
          new CargoReference('different-cargo'),
          new Name('A changed description')
        )
      ),
      loaded
    )
  ).toThrow(new ContainerAlreadyLoaded('container-1'))

  const sameDescription = new Container(
    new Id('container-2'),
    new CargoReference('cargo-1'),
    new Name('Refactoring Book')
  )
  const loadedAgain = Ship.apply(
    loaded,
    Ship.loadContainer(new LoadContainer(new Id('123'), sameDescription), loaded)
  )
  expect(loadedAgain.containers).toEqual([item, sameDescription])

  const unloadedEvent = Ship.unloadContainer(
    new UnloadContainer(new Id('123'), new Id('container-1')),
    loadedAgain
  )
  expect(unloadedEvent.container).toEqual(item)
  expect(Ship.apply(loadedAgain, unloadedEvent).containers).toEqual([sameDescription])
})

test('planning a voyage does not freeze port container operations', () => {
  const ready = planned()
  const item = new Container(
    new Id('container-1'),
    new CargoReference('cargo-1'),
    new Name('Refactoring Book')
  )
  const loaded = Ship.apply(
    ready,
    Ship.loadContainer(new LoadContainer(new Id(ready.id), item), ready)
  )
  const unloaded = Ship.apply(
    loaded,
    Ship.unloadContainer(new UnloadContainer(new Id(loaded.id), new Id(item.containerId)), loaded)
  )

  expect(loaded.activeVoyage).toEqual(ready.activeVoyage)
  expect(unloaded.activeVoyage).toEqual(ready.activeVoyage)
  expect(unloaded.containers).toEqual([])
})

test('allows a physical container to carry another cargo reference after unloading', () => {
  const ship = registered()
  const firstAssignment = new Container(
    new Id('container-1'),
    new CargoReference('cargo-1'),
    new Name('Refactoring Book')
  )
  const loaded = Ship.apply(
    ship,
    Ship.loadContainer(new LoadContainer(new Id(ship.id), firstAssignment), ship)
  )
  const unloaded = Ship.apply(
    loaded,
    Ship.unloadContainer(new UnloadContainer(new Id(ship.id), new Id('container-1')), loaded)
  )
  const nextAssignment = new Container(
    new Id('container-1'),
    new CargoReference('cargo-2'),
    new Name('Domain Driven Design')
  )

  const reloaded = Ship.apply(
    unloaded,
    Ship.loadContainer(new LoadContainer(new Id(ship.id), nextAssignment), unloaded)
  )

  expect(reloaded.containers).toEqual([nextAssignment])
})

test('container operations require a matching registered ship and onboard container', () => {
  const containerId = new Id('container-1')
  const item = new Container(
    containerId,
    new CargoReference('cargo-1'),
    new Name('Refactoring Book')
  )
  expect(() => Ship.loadContainer(new LoadContainer(new Id('123'), item))).toThrow(
    ShipMustBeRegisteredFirst
  )
  expect(() => Ship.loadContainer(new LoadContainer(new Id('456'), item), registered())).toThrow(
    IdsMismatch
  )
  expect(() => Ship.unloadContainer(new UnloadContainer(new Id('123'), containerId))).toThrow(
    ShipMustBeRegisteredFirst
  )
  expect(() =>
    Ship.unloadContainer(new UnloadContainer(new Id('456'), containerId), registered())
  ).toThrow(IdsMismatch)
  expect(() =>
    Ship.unloadContainer(new UnloadContainer(new Id('123'), containerId), registered())
  ).toThrow(new ContainerNotFound('container-1'))
})

test('container operations are rejected while the ship is at sea', () => {
  const initial = registered()
  const item = new Container(
    new Id('container-1'),
    new CargoReference('cargo-1'),
    new Name('Microservices Architecture')
  )
  const loaded = Ship.apply(
    initial,
    Ship.loadContainer(new LoadContainer(new Id('123'), item), initial)
  )
  const atSea = departed(loaded)

  expect(() =>
    Ship.loadContainer(
      new LoadContainer(
        new Id('123'),
        new Container(
          new Id('container-2'),
          new CargoReference('cargo-2'),
          new Name('Domain Driven Design')
        )
      ),
      atSea
    )
  ).toThrow(new ShipNotAtPort('load a container'))
  expect(() =>
    Ship.unloadContainer(new UnloadContainer(new Id('123'), new Id('container-1')), atSea)
  ).toThrow(new ShipNotAtPort('unload a container'))

  const arrived = Ship.apply(atSea, Ship.arrive(new DockShip(new Id('123'), port('Boston')), atSea))
  expect(arrived.containers).toEqual([item])
  expect(
    Ship.apply(
      arrived,
      Ship.unloadContainer(new UnloadContainer(new Id('123'), new Id('container-1')), arrived)
    ).containers
  ).toEqual([])
})

test('clone retains identity and immutable aggregate state', () => {
  const ship = registered()
  const clone = Ship.clone(ship)
  expect(clone).not.toBe(ship)
  expect(clone.equals(ship)).toBe(true)
  expect(Object.isFrozen(clone)).toBe(true)
})
