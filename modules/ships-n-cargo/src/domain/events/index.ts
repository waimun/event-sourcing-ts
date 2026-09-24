import { CargoLoaded } from './cargo-loaded'
import { CargoUnloaded } from './cargo-unloaded'
import { EventPayloadHandler } from './event-payload-handler'
import { CargoLoadedSerializer } from './serializers/cargo-loaded-serializer'
import { CargoUnloadedSerializer } from './serializers/cargo-unloaded-serializer'
import { ShipArrivedSerializer } from './serializers/ship-arrived-serializer'
import { ShipDepartedSerializer } from './serializers/ship-departed-serializer'
import { ShipRegisteredSerializer } from './serializers/ship-registered-serializer'
import { ShipArrived } from './ship-arrived'
import { ShipDeparted } from './ship-departed'
import { ShipRegistered } from './ship-registered'

export const eventPayloadHandler = new EventPayloadHandler()
eventPayloadHandler.register(CargoLoaded.eventType, new CargoLoadedSerializer())
eventPayloadHandler.register(CargoUnloaded.eventType, new CargoUnloadedSerializer())
eventPayloadHandler.register(ShipArrived.eventType, new ShipArrivedSerializer())
eventPayloadHandler.register(ShipRegistered.eventType, new ShipRegisteredSerializer())
eventPayloadHandler.register(ShipDeparted.eventType, new ShipDepartedSerializer())
