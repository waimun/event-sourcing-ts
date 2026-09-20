import { Cargo } from './cargo'
import type { CreateShip } from './commands/create-ship'
import type { DockShip } from './commands/dock-ship'
import type { LoadCargo } from './commands/load-cargo'
import type { SailShip } from './commands/sail-ship'
import type { UnloadCargo } from './commands/unload-cargo'
import {
  CargoAlreadyLoaded,
  CargoNotFound,
  IdsMismatch,
  InvalidPortForDeparture,
  ShipMustBeCreatedFirst,
  UninitializedShipRequiredToCreate
} from './errors/ship'
import { CargoLoaded } from './events/cargo-loaded'
import { CargoUnloaded } from './events/cargo-unloaded'
import type { DomainEvent } from './events/domain-event'
import { ShipArrived } from './events/ship-arrived'
import { ShipCreated } from './events/ship-created'
import { ShipDeparted } from './events/ship-departed'
import { AtSea, MissingPort, Port } from './port'
import { SourcedAggregate } from './sourced-aggregate'

export class Ship extends SourcedAggregate {
  name: string
  port: Port
  cargo: Cargo[] = []

  private constructor(id: string, name: string) {
    super(id)
    this.name = name
    this.port = Port.none()
  }

  static uninitialized(): Ship {
    return new Ship('NON_EXISTENT', 'NON_EXISTENT')
  }

  static clone(from: Ship): Ship {
    const cloned = new Ship(from.id, from.name)
    cloned.port = from.port
    cloned.cargo = [...from.cargo]
    return cloned
  }

  equals(other: Ship): boolean {
    return this.id === other.id
  }

  static apply(state: Ship, event: DomainEvent): Ship {
    switch (event.type) {
      case ShipCreated.eventType:
        return Ship.handleShipCreated(state, event as ShipCreated)
      case ShipDeparted.eventType:
        return Ship.handleDeparture(state, event as ShipDeparted)
      case ShipArrived.eventType:
        return Ship.handleArrival(state, event as ShipArrived)
      case CargoLoaded.eventType:
        return Ship.handleCargoLoaded(state, event as CargoLoaded)
      case CargoUnloaded.eventType:
        return Ship.handleCargoUnloaded(state, event as CargoUnloaded)
      default:
        return state
    }
  }

  static replay(initial: Ship, events: DomainEvent[]): Ship {
    return events.reduce((state, event) => Ship.apply(state, event), initial)
  }

  static create(command: CreateShip, state: Ship): ShipCreated {
    if (state.equals(Ship.uninitialized())) return new ShipCreated(command.id, command.name)

    throw new UninitializedShipRequiredToCreate()
  }

  static depart(command: SailShip, state: Ship): ShipDeparted {
    if (state.equals(Ship.uninitialized())) throw new ShipMustBeCreatedFirst()

    if (state.id !== command.id) throw new IdsMismatch()

    if (MissingPort.equals(state.port) || AtSea.equals(state.port)) {
      throw new InvalidPortForDeparture()
    }

    return new ShipDeparted(command.id, command.dateTime)
  }

  static arrive(command: DockShip, state: Ship): ShipArrived {
    if (state.equals(Ship.uninitialized())) throw new ShipMustBeCreatedFirst()

    if (state.id !== command.id) throw new IdsMismatch()

    return new ShipArrived(command.id, command.port, command.dateTime)
  }

  static loadCargo(command: LoadCargo, state: Ship): CargoLoaded {
    if (state.equals(Ship.uninitialized())) throw new ShipMustBeCreatedFirst()

    if (state.id !== command.id) throw new IdsMismatch()

    const found = state.cargo.find(
      (cargo) => cargo.name.toLowerCase() === command.cargo.name.toLowerCase()
    )

    if (found !== undefined) throw new CargoAlreadyLoaded(command.cargo.name)

    return new CargoLoaded(command.id, command.cargo, command.dateTime)
  }

  static unloadCargo(command: UnloadCargo, state: Ship): CargoUnloaded {
    if (state.equals(Ship.uninitialized())) throw new ShipMustBeCreatedFirst()

    if (state.id !== command.id) throw new IdsMismatch()

    const found = state.cargo.find((cargo) => cargo.name === command.cargo.name)

    if (found === undefined) throw new CargoNotFound(command.cargo.name)

    return new CargoUnloaded(command.id, command.cargo, command.dateTime)
  }

  static handleShipCreated(current: Ship, event: ShipCreated): Ship {
    const nextState = Ship.clone(current)
    if (nextState.equals(Ship.uninitialized())) return new Ship(event.aggregateId, event.name)
    return nextState
  }

  static handleDeparture(current: Ship, event: ShipDeparted): Ship {
    const nextState = Ship.clone(current)
    nextState.port = event.port
    return nextState
  }

  static handleArrival(current: Ship, event: ShipArrived): Ship {
    const nextState = Ship.clone(current)
    nextState.port = event.port
    nextState.cargo = nextState.cargo.map((c) => Cargo.handleArrival(c, event))
    return nextState
  }

  static handleCargoLoaded(current: Ship, event: CargoLoaded): Ship {
    const nextState = Ship.clone(current)
    nextState.cargo.push(event.cargo)
    return nextState
  }

  static handleCargoUnloaded(current: Ship, event: CargoUnloaded): Ship {
    const nextState = Ship.clone(current)
    nextState.cargo = nextState.cargo.filter((c) => c.name !== event.cargo.name)
    return nextState
  }
}
