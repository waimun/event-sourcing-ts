import { Port } from './port'
import { ShipDeparted } from './events/ship-departed'
import { ShipArrived } from './events/ship-arrived'
import { Cargo } from './cargo'
import { CargoLoaded } from './events/cargo-loaded'
import { CargoUnloaded } from './events/cargo-unloaded'
import { SourcedAggregate } from './sourced-aggregate'
import { CreateShip } from './commands/create-ship'
import { DomainEvent } from './events/domain-event'
import { ShipCreated } from './events/ship-created'
import { SailShip } from './commands/sail-ship'
import { DockShip } from './commands/dock-ship'
import { LoadCargo } from './commands/load-cargo'
import { UnloadCargo } from './commands/unload-cargo'
import { Result } from '../shared/result'

export class Ship extends SourcedAggregate {
  name: string
  port: Port
  cargo: Cargo[] = []

  private constructor (id: string, name: string) {
    super(id)
    this.name = name
    this.port = Port.none()
  }

  static uninitialized (): Ship {
    return new Ship('NON_EXISTENT', 'NON_EXISTENT')
  }

  static clone (from: Ship): Ship {
    const cloned = new Ship(from.id, from.name)
    cloned.port = from.port
    cloned.cargo = [...from.cargo]
    return cloned
  }

  equals (other: Ship): boolean {
    return this.id === other.id
  }

  static apply (state: Ship, event: DomainEvent): Ship {
    switch (event.constructor.name) {
      case ShipCreated.name:
        return Ship.handleShipCreated(state, event as ShipCreated)
      case ShipDeparted.name:
        return Ship.handleDeparture(state, event as ShipDeparted)
      case ShipArrived.name:
        return Ship.handleArrival(state, event as ShipArrived)
      case CargoLoaded.name:
        return Ship.handleCargoLoaded(state, event as CargoLoaded)
      case CargoUnloaded.name:
        return Ship.handleCargoUnloaded(state, event as CargoUnloaded)
      default:
        return state
    }
  }

  static replay (initial: Ship, events: DomainEvent[]): Ship {
    return events.reduce((state, event) => Ship.apply(state, event), initial)
  }

  static create (command: CreateShip, state: Ship): Result<DomainEvent[]> {
    if (state.equals(Ship.uninitialized())) return Result.ok([new ShipCreated(command.id, command.name)])

    return Result.fail(new Error('Uninitialized state is required to create'))
  }

  static depart (command: SailShip, state: Ship): Result<DomainEvent[]> {
    if (state.equals(Ship.uninitialized())) return Result.fail(new Error('Create ship first!'))

    return Result.ok([new ShipDeparted(command.id, command.dateTime)])
  }

  static arrive (command: DockShip, state: Ship): Result<DomainEvent[]> {
    if (state.equals(Ship.uninitialized())) return Result.fail(new Error('Create ship first!'))

    return Result.ok([new ShipArrived(command.id, command.port, command.dateTime)])
  }

  static loadCargo (command: LoadCargo, state: Ship): Result<DomainEvent[]> {
    if (state.equals(Ship.uninitialized())) return Result.fail(new Error('Create ship first!'))

    const found = state.cargo.find(cargo => cargo.name === command.cargo.name)
    if (found !== undefined) return Result.fail(new Error('Cargo is already loaded'))

    return Result.ok([new CargoLoaded(command.id, command.cargo, command.dateTime)])
  }

  static unloadCargo (command: UnloadCargo, state: Ship): Result<DomainEvent[]> {
    if (state.equals(Ship.uninitialized())) return Result.fail(new Error('Create ship first!'))

    const found = state.cargo.find(cargo => cargo.name === command.cargo.name)
    if (found === undefined) return Result.fail(new Error('Cannot find cargo to unload'))

    return Result.ok([new CargoUnloaded(command.id, command.cargo, command.dateTime)])
  }

  static handleShipCreated (current: Ship, event: ShipCreated): Ship {
    const nextState = Ship.clone(current)
    if (nextState.equals(Ship.uninitialized())) return new Ship(event.aggregateId, event.name)
    return nextState
  }

  static handleDeparture (current: Ship, event: ShipDeparted): Ship {
    const nextState = Ship.clone(current)
    nextState.port = event.port
    return nextState
  }

  static handleArrival (current: Ship, event: ShipArrived): Ship {
    const nextState = Ship.clone(current)
    nextState.port = event.port
    nextState.cargo = nextState.cargo.map(c => Cargo.handleArrival(c, event))
    return nextState
  }

  static handleCargoLoaded (current: Ship, event: CargoLoaded): Ship {
    const nextState = Ship.clone(current)
    nextState.cargo.push(event.cargo)
    return nextState
  }

  static handleCargoUnloaded (current: Ship, event: CargoUnloaded): Ship {
    const nextState = Ship.clone(current)
    nextState.cargo = nextState.cargo.filter(c => c.name !== event.cargo.name)
    return nextState
  }
}
