import { Cargo } from './cargo'
import type { DockShip } from './commands/dock-ship'
import type { LoadCargo } from './commands/load-cargo'
import type { RegisterShip } from './commands/register-ship'
import type { SailShip } from './commands/sail-ship'
import type { UnloadCargo } from './commands/unload-cargo'
import {
  CargoAlreadyLoaded,
  CargoNotFound,
  IdsMismatch,
  InvalidShipHistory,
  ShipMustBeRegisteredFirst,
  ShipNotAtPort,
  ShipNotAtSea,
  UnregisteredShipRequiredToRegister
} from './errors/ship'
import { CargoLoaded } from './events/cargo-loaded'
import { CargoUnloaded } from './events/cargo-unloaded'
import type { DomainEvent } from './events/domain-event'
import { ShipArrived } from './events/ship-arrived'
import { ShipDeparted } from './events/ship-departed'
import { ShipRegistered } from './events/ship-registered'
import { AtPort, AtSea, type ShipLocation } from './ship-location'
import { SourcedAggregate } from './sourced-aggregate'

export class Ship extends SourcedAggregate {
  readonly name: string
  readonly location: ShipLocation
  readonly cargo: readonly Cargo[]

  private constructor(
    id: string,
    name: string,
    location: ShipLocation,
    cargo: readonly Cargo[] = []
  ) {
    super(id)
    this.name = name
    this.location = location
    this.cargo = Object.freeze([...cargo])
    Object.freeze(this)
  }

  static clone(from: Ship): Ship {
    return new Ship(from.id, from.name, from.location, from.cargo)
  }

  equals(other: Ship): boolean {
    return this.id === other.id
  }

  static apply(state: Ship | undefined, event: DomainEvent): Ship {
    switch (event.type) {
      case ShipRegistered.eventType: {
        if (!(event instanceof ShipRegistered)) Ship.reject(event, 'event payload is malformed')
        if (state !== undefined) Ship.reject(event, 'ship is already registered')
        return Ship.handleShipRegistered(event)
      }
      case ShipDeparted.eventType: {
        if (!(event instanceof ShipDeparted)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!(registered.location instanceof AtPort)) {
          Ship.reject(event, 'ship must be at a port to depart')
        }
        return Ship.handleDeparture(registered)
      }
      case ShipArrived.eventType: {
        if (!(event instanceof ShipArrived)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!(registered.location instanceof AtSea)) {
          Ship.reject(event, 'ship must be at sea to arrive')
        }
        return Ship.handleArrival(registered, event)
      }
      case CargoLoaded.eventType: {
        if (!(event instanceof CargoLoaded)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (
          registered.cargo.some(
            (cargo) => cargo.name.toLowerCase() === event.cargo.name.toLowerCase()
          )
        ) {
          Ship.reject(event, `cargo '${event.cargo.name}' is already loaded`)
        }
        return Ship.handleCargoLoaded(registered, event)
      }
      case CargoUnloaded.eventType: {
        if (!(event instanceof CargoUnloaded)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!registered.cargo.some((cargo) => cargo.name === event.cargo.name)) {
          Ship.reject(event, `cargo '${event.cargo.name}' is not loaded`)
        }
        return Ship.handleCargoUnloaded(registered, event)
      }
      default:
        return Ship.reject(event, 'event type is not understood by the Ship aggregate')
    }
  }

  static replay(events: readonly DomainEvent[]): Ship | undefined {
    return events.reduce<Ship | undefined>((state, event) => Ship.apply(state, event), undefined)
  }

  private static requireMatchingRegisteredShip(state: Ship | undefined, event: DomainEvent): Ship {
    if (state === undefined) Ship.reject(event, 'ship has not been registered')
    if (state.id !== event.aggregateId) {
      Ship.reject(event, `event aggregate ID does not match ship '${state.id}'`)
    }
    return state
  }

  private static reject(event: DomainEvent, reason: string): never {
    throw new InvalidShipHistory(event.type, event.aggregateId, reason)
  }

  static register(command: RegisterShip, state?: Ship): ShipRegistered {
    if (state === undefined) return new ShipRegistered(command.id, command.name, command.port)
    throw new UnregisteredShipRequiredToRegister()
  }

  static depart(command: SailShip, state?: Ship): ShipDeparted {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    if (!(state.location instanceof AtPort)) throw new ShipNotAtPort()
    return new ShipDeparted(command.id, command.dateTime)
  }

  static arrive(command: DockShip, state?: Ship): ShipArrived {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    if (!(state.location instanceof AtSea)) throw new ShipNotAtSea()
    return new ShipArrived(command.id, command.port, command.dateTime)
  }

  static loadCargo(command: LoadCargo, state?: Ship): CargoLoaded {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    const found = state.cargo.find(
      (cargo) => cargo.name.toLowerCase() === command.cargo.name.toLowerCase()
    )
    if (found !== undefined) throw new CargoAlreadyLoaded(command.cargo.name)
    return new CargoLoaded(command.id, command.cargo, command.dateTime)
  }

  static unloadCargo(command: UnloadCargo, state?: Ship): CargoUnloaded {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    const found = state.cargo.find((cargo) => cargo.name === command.cargo.name)
    if (found === undefined) throw new CargoNotFound(command.cargo.name)
    return new CargoUnloaded(command.id, command.cargo, command.dateTime)
  }

  static handleShipRegistered(event: ShipRegistered): Ship {
    return new Ship(event.aggregateId, event.name, new AtPort(event.port))
  }

  static handleDeparture(current: Ship): Ship {
    return new Ship(current.id, current.name, new AtSea(), current.cargo)
  }

  static handleArrival(current: Ship, event: ShipArrived): Ship {
    return new Ship(
      current.id,
      current.name,
      new AtPort(event.port),
      current.cargo.map((cargo) => Cargo.handleArrival(cargo, event))
    )
  }

  static handleCargoLoaded(current: Ship, event: CargoLoaded): Ship {
    return new Ship(current.id, current.name, current.location, [...current.cargo, event.cargo])
  }

  static handleCargoUnloaded(current: Ship, event: CargoUnloaded): Ship {
    return new Ship(
      current.id,
      current.name,
      current.location,
      current.cargo.filter((cargo) => cargo.name !== event.cargo.name)
    )
  }
}
