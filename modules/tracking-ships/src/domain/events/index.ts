import { EventPayloadHandler } from './event-payload-handler'
import { CargoLoaded } from './cargo-loaded'
import { CargoUnloaded } from './cargo-unloaded'
import { ShipArrived } from './ship-arrived'
import { ShipCreated } from './ship-created'
import { ShipDeparted } from './ship-departed'
import { CargoLoadedSerializer } from './serializers/cargo-loaded-serializer'
import { CargoUnloadedSerializer } from './serializers/cargo-unloaded-serializer'
import { ShipArrivedSerializer } from './serializers/ship-arrived-serializer'
import { ShipCreatedSerializer } from './serializers/ship-created-serializer'
import { ShipDepartedSerializer } from './serializers/ship-departed-serializer'

export const eventPayloadHandler = new EventPayloadHandler()
eventPayloadHandler.register(CargoLoaded.name, new CargoLoadedSerializer())
eventPayloadHandler.register(CargoUnloaded.name, new CargoUnloadedSerializer())
eventPayloadHandler.register(ShipArrived.name, new ShipArrivedSerializer())
eventPayloadHandler.register(ShipCreated.name, new ShipCreatedSerializer())
eventPayloadHandler.register(ShipDeparted.name, new ShipDepartedSerializer())
