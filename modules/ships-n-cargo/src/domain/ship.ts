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
  InvalidShipHistory,
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
  readonly name: string
  readonly port: Port
  readonly cargo: readonly Cargo[]

  private constructor(
    id: string,
    name: string,
    port: Port = Port.none(),
    cargo: readonly Cargo[] = []
  ) {
    super(id)
    this.name = name
    this.port = port
    this.cargo = Object.freeze([...cargo])
    Object.freeze(this)
  }

  static uninitialized(): Ship {
    return new Ship('NON_EXISTENT', 'NON_EXISTENT')
  }

  static clone(from: Ship): Ship {
    return new Ship(from.id, from.name, from.port, from.cargo)
  }

  equals(other: Ship): boolean {
    return this.id === other.id
  }

  static apply(state: Ship, event: DomainEvent): Ship {
    switch (event.type) {
      case ShipCreated.eventType: {
        if (!(event instanceof ShipCreated)) Ship.reject(event, 'event payload is malformed')
        if (!state.equals(Ship.uninitialized())) Ship.reject(event, 'ship is already created')
        return Ship.handleShipCreated(state, event)
      }
      case ShipDeparted.eventType: {
        if (!(event instanceof ShipDeparted)) Ship.reject(event, 'event payload is malformed')
        Ship.requireMatchingInitializedShip(state, event)
        if (MissingPort.equals(state.port) || AtSea.equals(state.port)) {
          Ship.reject(event, 'ship cannot depart from a missing port or at sea')
        }
        return Ship.handleDeparture(state, event)
      }
      case ShipArrived.eventType: {
        if (!(event instanceof ShipArrived)) Ship.reject(event, 'event payload is malformed')
        Ship.requireMatchingInitializedShip(state, event)
        return Ship.handleArrival(state, event)
      }
      case CargoLoaded.eventType: {
        if (!(event instanceof CargoLoaded)) Ship.reject(event, 'event payload is malformed')
        Ship.requireMatchingInitializedShip(state, event)
        if (
          state.cargo.some((cargo) => cargo.name.toLowerCase() === event.cargo.name.toLowerCase())
        ) {
          Ship.reject(event, `cargo '${event.cargo.name}' is already loaded`)
        }
        return Ship.handleCargoLoaded(state, event)
      }
      case CargoUnloaded.eventType: {
        if (!(event instanceof CargoUnloaded)) Ship.reject(event, 'event payload is malformed')
        Ship.requireMatchingInitializedShip(state, event)
        if (!state.cargo.some((cargo) => cargo.name === event.cargo.name)) {
          Ship.reject(event, `cargo '${event.cargo.name}' is not loaded`)
        }
        return Ship.handleCargoUnloaded(state, event)
      }
      default:
        return Ship.reject(event, 'event type is not understood by the Ship aggregate')
    }
  }

  static replay(initial: Ship, events: readonly DomainEvent[]): Ship {
    return events.reduce((state, event) => Ship.apply(state, event), initial)
  }

  private static requireMatchingInitializedShip(state: Ship, event: DomainEvent): void {
    if (state.equals(Ship.uninitialized())) Ship.reject(event, 'ship has not been created')
    if (state.id !== event.aggregateId) {
      Ship.reject(event, `event aggregate ID does not match ship '${state.id}'`)
    }
  }

  private static reject(event: DomainEvent, reason: string): never {
    throw new InvalidShipHistory(event.type, event.aggregateId, reason)
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
    return new Ship(current.id, current.name, event.port, current.cargo)
  }

  static handleArrival(current: Ship, event: ShipArrived): Ship {
    return new Ship(
      current.id,
      current.name,
      event.port,
      current.cargo.map((cargo) => Cargo.handleArrival(cargo, event))
    )
  }

  static handleCargoLoaded(current: Ship, event: CargoLoaded): Ship {
    return new Ship(current.id, current.name, current.port, [...current.cargo, event.cargo])
  }

  static handleCargoUnloaded(current: Ship, event: CargoUnloaded): Ship {
    return new Ship(
      current.id,
      current.name,
      current.port,
      current.cargo.filter((cargo) => cargo.name !== event.cargo.name)
    )
  }
}
