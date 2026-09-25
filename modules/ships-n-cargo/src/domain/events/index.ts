import { ContainerLoaded } from './container-loaded'
import { ContainerUnloaded } from './container-unloaded'
import { EventPayloadHandler } from './event-payload-handler'
import { ContainerLoadedSerializer } from './serializers/container-loaded-serializer'
import { ContainerUnloadedSerializer } from './serializers/container-unloaded-serializer'
import { ShipArrivedSerializer } from './serializers/ship-arrived-serializer'
import { ShipDepartedSerializer } from './serializers/ship-departed-serializer'
import { ShipRegisteredSerializer } from './serializers/ship-registered-serializer'
import { VoyagePlannedSerializer } from './serializers/voyage-planned-serializer'
import { ShipArrived } from './ship-arrived'
import { ShipDeparted } from './ship-departed'
import { ShipRegistered } from './ship-registered'
import { VoyagePlanned } from './voyage-planned'

export const eventPayloadHandler = new EventPayloadHandler()
eventPayloadHandler.register(ContainerLoaded.eventType, new ContainerLoadedSerializer())
eventPayloadHandler.register(ContainerUnloaded.eventType, new ContainerUnloadedSerializer())
eventPayloadHandler.register(ShipArrived.eventType, new ShipArrivedSerializer())
eventPayloadHandler.register(ShipRegistered.eventType, new ShipRegisteredSerializer())
eventPayloadHandler.register(ShipDeparted.eventType, new ShipDepartedSerializer())
eventPayloadHandler.register(VoyagePlanned.eventType, new VoyagePlannedSerializer())
