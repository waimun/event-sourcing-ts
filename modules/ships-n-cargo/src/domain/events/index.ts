import { CargoLoaded } from './cargo-loaded'
import { CargoUnloaded } from './cargo-unloaded'
import { EventPayloadHandler } from './event-payload-handler'
import { CargoLoadedSerializer } from './serializers/cargo-loaded-serializer'
import { CargoUnloadedSerializer } from './serializers/cargo-unloaded-serializer'
import { ShipArrivedSerializer } from './serializers/ship-arrived-serializer'
import { ShipCreatedSerializer } from './serializers/ship-created-serializer'
import { ShipDepartedSerializer } from './serializers/ship-departed-serializer'
import { ShipArrived } from './ship-arrived'
import { ShipCreated } from './ship-created'
import { ShipDeparted } from './ship-departed'

export const eventPayloadHandler = new EventPayloadHandler()
eventPayloadHandler.register(CargoLoaded.eventType, new CargoLoadedSerializer())
eventPayloadHandler.register(CargoUnloaded.eventType, new CargoUnloadedSerializer())
eventPayloadHandler.register(ShipArrived.eventType, new ShipArrivedSerializer())
eventPayloadHandler.register(ShipCreated.eventType, new ShipCreatedSerializer())
eventPayloadHandler.register(ShipDeparted.eventType, new ShipDepartedSerializer())
