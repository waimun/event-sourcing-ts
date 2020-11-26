import { EventPayloadHandler } from './event-payload-handler'
import { CargoLoaded } from './cargo-loaded'
import { CargoUnloaded } from './cargo-unloaded'
import { ShipArrived } from './ship-arrived'
import { ShipCreated } from './ship-created'
import { ShipDeparted } from './ship-departed'

export const eventPayloadHandler = new EventPayloadHandler()
eventPayloadHandler.register(CargoLoaded.name, CargoLoaded.handlePayload())
eventPayloadHandler.register(CargoUnloaded.name, CargoUnloaded.handlePayload())
eventPayloadHandler.register(ShipArrived.name, ShipArrived.handlePayload())
eventPayloadHandler.register(ShipCreated.name, ShipCreated.handlePayload())
eventPayloadHandler.register(ShipDeparted.name, ShipDeparted.handlePayload())
