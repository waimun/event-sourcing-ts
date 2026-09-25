import type { DivertShip } from './commands/divert-ship'
import type { DockShip } from './commands/dock-ship'
import type { LoadContainer } from './commands/load-container'
import type { PlanVoyage } from './commands/plan-voyage'
import type { RegisterShip } from './commands/register-ship'
import type { SailShip } from './commands/sail-ship'
import type { UnloadContainer } from './commands/unload-container'
import type { Container } from './container'
import {
  ContainerAlreadyLoaded,
  ContainerNotFound,
  IdsMismatch,
  InvalidShipHistory,
  ShipMustBeRegisteredFirst,
  ShipMustDockAtVoyageDestination,
  ShipNotAtPort,
  ShipNotAtSea,
  UnregisteredShipRequiredToRegister,
  VoyageAlreadyPlanned,
  VoyageDestinationSameAsOrigin,
  VoyageDestinationUnchanged,
  VoyageRequiredToDepart
} from './errors/ship'
import { ContainerLoaded } from './events/container-loaded'
import { ContainerUnloaded } from './events/container-unloaded'
import type { DomainEvent } from './events/domain-event'
import { ShipArrived } from './events/ship-arrived'
import { ShipDeparted } from './events/ship-departed'
import { ShipRegistered } from './events/ship-registered'
import { VoyageDiverted } from './events/voyage-diverted'
import { VoyagePlanned } from './events/voyage-planned'
import type { Port } from './port'
import { AtPort, AtSea, type ShipLocation } from './ship-location'
import { SourcedAggregate } from './sourced-aggregate'

type ActiveVoyage = Readonly<{ origin: Port; destination: Port }>

export class Ship extends SourcedAggregate {
  readonly name: string
  readonly location: ShipLocation
  readonly containers: readonly Container[]
  readonly activeVoyage: ActiveVoyage | undefined

  private constructor(
    id: string,
    name: string,
    location: ShipLocation,
    containers: readonly Container[] = [],
    activeVoyage?: ActiveVoyage
  ) {
    super(id)
    this.name = name
    this.location = location
    this.containers = Object.freeze([...containers])
    this.activeVoyage =
      activeVoyage === undefined
        ? undefined
        : Object.freeze({ origin: activeVoyage.origin, destination: activeVoyage.destination })
    Object.freeze(this)
  }

  static clone(from: Ship): Ship {
    return new Ship(from.id, from.name, from.location, from.containers, from.activeVoyage)
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
        if (registered.activeVoyage === undefined) {
          Ship.reject(event, 'ship must have an active voyage to depart')
        }
        return Ship.handleDeparture(registered)
      }
      case ShipArrived.eventType: {
        if (!(event instanceof ShipArrived)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!(registered.location instanceof AtSea)) {
          Ship.reject(event, 'ship must be at sea to arrive')
        }
        const activeVoyage = registered.activeVoyage as ActiveVoyage
        if (!samePort(activeVoyage.destination, event.port)) {
          Ship.reject(event, 'ship must arrive at its active voyage destination')
        }
        return Ship.handleArrival(registered, event)
      }
      case VoyagePlanned.eventType: {
        if (!(event instanceof VoyagePlanned)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!(registered.location instanceof AtPort)) {
          Ship.reject(event, 'ship must be at a port to plan a voyage')
        }
        if (registered.activeVoyage !== undefined) {
          Ship.reject(event, 'ship already has an active voyage')
        }
        if (!samePort(registered.location.port, event.origin)) {
          Ship.reject(event, 'voyage origin must match the ship current port')
        }
        if (samePort(event.origin, event.destination)) {
          Ship.reject(event, 'voyage destination must differ from its origin')
        }
        return Ship.handleVoyagePlanned(registered, event)
      }
      case VoyageDiverted.eventType: {
        if (!(event instanceof VoyageDiverted)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!(registered.location instanceof AtSea)) {
          Ship.reject(event, 'ship must be at sea to divert')
        }
        const activeVoyage = registered.activeVoyage as ActiveVoyage
        if (!samePort(activeVoyage.destination, event.previousDestination)) {
          Ship.reject(event, 'diversion must replace the active voyage destination')
        }
        if (samePort(event.previousDestination, event.destination)) {
          Ship.reject(event, 'diversion destination must differ from the active destination')
        }
        return Ship.handleVoyageDiverted(registered, event)
      }
      case ContainerLoaded.eventType: {
        if (!(event instanceof ContainerLoaded)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!(registered.location instanceof AtPort)) {
          Ship.reject(event, 'ship must be at a port to load a container')
        }
        if (
          registered.containers.some(
            (container) => container.containerId === event.container.containerId
          )
        ) {
          Ship.reject(event, `container '${event.container.containerId}' is already loaded`)
        }
        return Ship.handleContainerLoaded(registered, event)
      }
      case ContainerUnloaded.eventType: {
        if (!(event instanceof ContainerUnloaded)) Ship.reject(event, 'event payload is malformed')
        const registered = Ship.requireMatchingRegisteredShip(state, event)
        if (!(registered.location instanceof AtPort)) {
          Ship.reject(event, 'ship must be at a port to unload a container')
        }
        if (
          !registered.containers.some(
            (container) => container.containerId === event.container.containerId
          )
        ) {
          Ship.reject(event, `container '${event.container.containerId}' is not loaded`)
        }
        return Ship.handleContainerUnloaded(registered, event)
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
    if (state.activeVoyage === undefined) throw new VoyageRequiredToDepart()
    return new ShipDeparted(command.id)
  }

  static planVoyage(command: PlanVoyage, state?: Ship): VoyagePlanned {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    if (!(state.location instanceof AtPort)) throw new ShipNotAtPort('plan a voyage')
    if (state.activeVoyage !== undefined) throw new VoyageAlreadyPlanned()
    if (samePort(state.location.port, command.destination)) {
      throw new VoyageDestinationSameAsOrigin()
    }
    return new VoyagePlanned(command.id, state.location.port, command.destination)
  }

  static arrive(command: DockShip, state?: Ship): ShipArrived {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    if (!(state.location instanceof AtSea)) throw new ShipNotAtSea()
    const destination = (state.activeVoyage as ActiveVoyage).destination
    if (!samePort(destination, command.port)) {
      throw new ShipMustDockAtVoyageDestination(destination.name, destination.country)
    }
    return new ShipArrived(command.id, command.port)
  }

  static divert(command: DivertShip, state?: Ship): VoyageDiverted {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    if (!(state.location instanceof AtSea)) throw new ShipNotAtSea('divert')
    const previousDestination = (state.activeVoyage as ActiveVoyage).destination
    if (samePort(previousDestination, command.destination)) {
      throw new VoyageDestinationUnchanged()
    }
    return new VoyageDiverted(command.id, previousDestination, command.destination)
  }

  static loadContainer(command: LoadContainer, state?: Ship): ContainerLoaded {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    if (!(state.location instanceof AtPort)) throw new ShipNotAtPort('load a container')
    const found = state.containers.find(
      (container) => container.containerId === command.container.containerId
    )
    if (found !== undefined) throw new ContainerAlreadyLoaded(command.container.containerId)
    return new ContainerLoaded(command.id, command.container)
  }

  static unloadContainer(command: UnloadContainer, state?: Ship): ContainerUnloaded {
    if (state === undefined) throw new ShipMustBeRegisteredFirst()
    if (state.id !== command.id) throw new IdsMismatch()
    if (!(state.location instanceof AtPort)) throw new ShipNotAtPort('unload a container')
    const found = state.containers.find(
      (container) => container.containerId === command.containerId
    )
    if (found === undefined) throw new ContainerNotFound(command.containerId)
    return new ContainerUnloaded(command.id, found)
  }

  static handleShipRegistered(event: ShipRegistered): Ship {
    return new Ship(event.aggregateId, event.name, new AtPort(event.port))
  }

  static handleDeparture(current: Ship): Ship {
    return new Ship(current.id, current.name, new AtSea(), current.containers, current.activeVoyage)
  }

  static handleArrival(current: Ship, event: ShipArrived): Ship {
    return new Ship(current.id, current.name, new AtPort(event.port), current.containers)
  }

  static handleVoyagePlanned(current: Ship, event: VoyagePlanned): Ship {
    return new Ship(current.id, current.name, current.location, current.containers, {
      origin: event.origin,
      destination: event.destination
    })
  }

  static handleVoyageDiverted(current: Ship, event: VoyageDiverted): Ship {
    const activeVoyage = current.activeVoyage as ActiveVoyage
    return new Ship(current.id, current.name, current.location, current.containers, {
      origin: activeVoyage.origin,
      destination: event.destination
    })
  }

  static handleContainerLoaded(current: Ship, event: ContainerLoaded): Ship {
    return new Ship(
      current.id,
      current.name,
      current.location,
      [...current.containers, event.container],
      current.activeVoyage
    )
  }

  static handleContainerUnloaded(current: Ship, event: ContainerUnloaded): Ship {
    return new Ship(
      current.id,
      current.name,
      current.location,
      current.containers.filter(
        (container) => container.containerId !== event.container.containerId
      ),
      current.activeVoyage
    )
  }
}

const samePort = (left: Port, right: Port): boolean =>
  left.name === right.name && left.country === right.country
