import { Ship } from './ship'
import { Country, Port } from './port'
import { CreateShip } from './commands/create-ship'
import { DomainEvent } from './events/domain-event'
import { SailShip } from './commands/sail-ship'
import { DockShip } from './commands/dock-ship'
import { LoadCargo } from './commands/load-cargo'
import { Cargo } from './cargo'
import { UnloadCargo } from './commands/unload-cargo'
import { eventPayloadHandler } from './events'
import { Result } from '../shared/result'
import { EventJournal } from './events/event-journal'
import { InMemoryEventJournal } from '../infrastructure/persistence/in-memory-event-journal'

const shipId: string = 'my-ship'
let v1: Ship
let e1: DomainEvent[]

beforeEach(() => {
  const createShipResult: Result<DomainEvent[]> = Ship.create(new CreateShip('King Roy', shipId), Ship.uninitialized())
  expect(createShipResult.isSuccess).toBeTruthy()
  e1 = createShipResult.getValue() as DomainEvent[]
  expect(e1.length).toEqual(1)

  v1 = Ship.apply(Ship.uninitialized(), e1[0])
  expect(v1.name).toEqual('King Roy')
  expect(v1.id).toEqual(shipId)
})

test('depart ship', () => {
  const departureEvents: Result<DomainEvent[]> = Ship.depart(new SailShip(shipId, new Date(2005, 11, 1)), v1)
  expect(departureEvents.isSuccess).toBeTruthy()
  const e2: DomainEvent[] = departureEvents.getValue() as DomainEvent[]
  expect(e2.length).toEqual(1)

  const v2: Ship = Ship.apply(v1, e2[0])
  expect(v2.name).toEqual('King Roy')
  expect(v2.id).toEqual(shipId)
  expect(v2.port).toEqual(Port.atSea())
})

test('arrive ship', () => {
  const arrivalEvents: Result<DomainEvent[]> = Ship.arrive(new DockShip(shipId, new Port('San Francisco', Country.US), new Date(2005, 11, 2)), v1)
  expect(arrivalEvents.isSuccess).toBeTruthy()
  const e2: DomainEvent[] = arrivalEvents.getValue() as DomainEvent[]
  expect(e2.length).toEqual(1)

  const v2: Ship = Ship.apply(v1, e2[0])
  expect(v2.name).toEqual('King Roy')
  expect(v2.id).toEqual(shipId)
  expect(v2.port.name).toEqual('San Francisco')
})

test('load and unload cargo', () => {
  const loadCargoEvents: Result<DomainEvent[]> = Ship.loadCargo(new LoadCargo(shipId, new Cargo('Refactoring Book'), new Date(2005, 11, 4)), v1)
  expect(loadCargoEvents.isSuccess).toBeTruthy()
  const e2: DomainEvent[] = loadCargoEvents.getValue() as DomainEvent[]
  expect(e2.length).toEqual(1)

  const v2: Ship = Ship.apply(v1, e2[0])
  expect(v2.name).toEqual('King Roy')
  expect(v2.id).toEqual(shipId)
  expect(v2.cargo.length).toEqual(1)

  const unloadCargoEvents: Result<DomainEvent[]> = Ship.unloadCargo(new UnloadCargo(shipId, new Cargo('Refactoring Book'), new Date(2005, 11, 11)), v2)
  expect(unloadCargoEvents.isSuccess).toBeTruthy()
  const e3: DomainEvent[] = unloadCargoEvents.getValue() as DomainEvent[]
  expect(e3.length).toEqual(1)

  const v3: Ship = Ship.apply(v2, e3[0])
  expect(v3.cargo.length).toEqual(0)
})

test('visiting Canada marks cargo', () => {
  const loadCargoEvents: Result<DomainEvent[]> = Ship.loadCargo(new LoadCargo(shipId, new Cargo('Refactoring Book'), new Date(2005, 11, 5)), v1)
  expect(loadCargoEvents.isSuccess).toBeTruthy()
  const e2: DomainEvent[] = loadCargoEvents.getValue() as DomainEvent[]
  expect(e2.length).toEqual(1)

  const v2: Ship = Ship.apply(v1, e2[0])
  expect(v2.name).toEqual('King Roy')
  expect(v2.id).toEqual(shipId)
  expect(v2.cargo.length).toEqual(1)

  const arrivalEvents: Result<DomainEvent[]> = Ship.arrive(new DockShip(shipId, new Port('Vancouver', Country.CANADA), new Date(2005, 11, 6)), v2)
  expect(arrivalEvents.isSuccess).toBeTruthy()
  const e3: DomainEvent[] = arrivalEvents.getValue() as DomainEvent[]
  expect(e3.length).toEqual(1)

  const v3: Ship = Ship.apply(v2, e3[0])
  expect(v3.cargo[0].hasBeenInCanada).toBeTruthy()
})

test('append journal entries', () => {
  let allEvents: DomainEvent[] = []
  allEvents = allEvents.concat(e1)

  const allVersions: Ship[] = []
  allVersions.push(v1)

  const e2 = Ship.depart(new SailShip(shipId, new Date(2005, 11, 1)), v1)
  allEvents = allEvents.concat(e2.getValue() as DomainEvent[])

  const v2 = Ship.apply(v1, (e2.getValue() as DomainEvent[])[0])
  allVersions.push(v2)

  const e3 = Ship.arrive(new DockShip(shipId, new Port('San Francisco', Country.US), new Date(2005, 11, 2)), v2)
  allEvents = allEvents.concat(e3.getValue() as DomainEvent[])

  const v3 = Ship.apply(v2, (e3.getValue() as DomainEvent[])[0])
  allVersions.push(v3)

  const e4 = Ship.loadCargo(new LoadCargo(shipId, new Cargo('Refactoring Book'), new Date(2005, 11, 3)), v3)
  allEvents = allEvents.concat(e4.getValue() as DomainEvent[])

  const v4 = Ship.apply(v3, (e4.getValue() as DomainEvent[])[0])
  allVersions.push(v4)

  const e5 = Ship.depart(new SailShip(shipId, new Date(2005, 11, 4)), v4)
  allEvents = allEvents.concat(e5.getValue() as DomainEvent[])

  const v5 = Ship.apply(v4, (e5.getValue() as DomainEvent[])[0])
  allVersions.push(v5)

  const e6 = Ship.arrive(new DockShip(shipId, new Port('Los Angeles', Country.US), new Date(2005, 11, 5)), v5)
  allEvents = allEvents.concat(e6.getValue() as DomainEvent[])

  const v6 = Ship.apply(v5, (e6.getValue() as DomainEvent[])[0])
  allVersions.push(v6)

  const e7 = Ship.depart(new SailShip(shipId, new Date(2005, 11, 6)), v6)
  allEvents = allEvents.concat(e7.getValue() as DomainEvent[])

  const v7 = Ship.apply(v6, (e7.getValue() as DomainEvent[])[0])
  allVersions.push(v7)

  const e8 = Ship.arrive(new DockShip(shipId, new Port('Vancouver', Country.CANADA), new Date(2005, 11, 9)), v7)
  allEvents = allEvents.concat(e8.getValue() as DomainEvent[])

  const v8 = Ship.apply(v7, (e8.getValue() as DomainEvent[])[0])
  allVersions.push(v8)

  const e9 = Ship.depart(new SailShip(shipId, new Date(2005, 11, 10)), v8)
  allEvents = allEvents.concat(e9.getValue() as DomainEvent[])

  const v9 = Ship.apply(v8, (e9.getValue() as DomainEvent[])[0])
  allVersions.push(v9)

  const e10 = Ship.arrive(new DockShip(shipId, new Port('New York', Country.US), new Date(2005, 11, 11)), v9)
  allEvents = allEvents.concat(e10.getValue() as DomainEvent[])

  const v10 = Ship.apply(v9, (e10.getValue() as DomainEvent[])[0])
  allVersions.push(v10)

  const e11 = Ship.unloadCargo(new UnloadCargo(shipId, new Cargo('Refactoring Book'), new Date(2005, 11, 11)), v10)
  allEvents = allEvents.concat(e11.getValue() as DomainEvent[])

  const v11 = Ship.apply(v10, (e11.getValue() as DomainEvent[])[0])
  allVersions.push(v11)

  allVersions.forEach(version => console.log(version))

  const journal: EventJournal = new InMemoryEventJournal('tracking-ships', eventPayloadHandler)
  journal.append(shipId, allEvents)
  const entries = journal.entriesByAggregate(shipId)
  expect(entries.length).toEqual(11)

  entries.forEach(event => console.log(`${event.type} ${event.aggregateId}`))
})

test('parse payload', () => {
  const loadCargoEvents: Result<DomainEvent[]> = Ship.loadCargo(new LoadCargo(shipId, new Cargo('Refactoring Book'), new Date(2005, 11, 4)), v1)
  expect(loadCargoEvents.isSuccess).toBeTruthy()
  const e2: DomainEvent[] = loadCargoEvents.getValue() as DomainEvent[]
  expect(e2.length).toEqual(1)

  // append to journal
  const journal: EventJournal = new InMemoryEventJournal('tracking-ships', eventPayloadHandler)
  journal.append(shipId, e1.concat(e2))

  // read from journal
  const entries = journal.entriesByAggregate(shipId)
  expect(entries.length).toEqual(2)

  // convert to json payloads
  const payloads: string[] = entries.map(entry => entry.payload())

  // map back to domain object
  const results: Array<Result<DomainEvent>> = payloads.map(payload => journal.eventFrom(payload))

  expect(Result.failures(results).length).toEqual(0)
})
