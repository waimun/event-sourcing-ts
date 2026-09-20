import { expect, test } from '@jest/globals'
import { CargoLoaded } from './cargo-loaded'
import { CargoUnloaded } from './cargo-unloaded'
import { eventPayloadHandler } from './index'
import { CargoLoadedSerializer } from './serializers/cargo-loaded-serializer'
import { CargoUnloadedSerializer } from './serializers/cargo-unloaded-serializer'
import { ShipArrivedSerializer } from './serializers/ship-arrived-serializer'
import { ShipCreatedSerializer } from './serializers/ship-created-serializer'
import { ShipDepartedSerializer } from './serializers/ship-departed-serializer'
import { ShipArrived } from './ship-arrived'
import { ShipCreated } from './ship-created'
import { ShipDeparted } from './ship-departed'

test('imported file should have event serializers registered', () => {
  expect(eventPayloadHandler).toBeTruthy()
  expect(eventPayloadHandler.byType(CargoLoaded.name) instanceof CargoLoadedSerializer).toBeTruthy()
  expect(
    eventPayloadHandler.byType(CargoUnloaded.name) instanceof CargoUnloadedSerializer
  ).toBeTruthy()
  expect(eventPayloadHandler.byType(ShipArrived.name) instanceof ShipArrivedSerializer).toBeTruthy()
  expect(eventPayloadHandler.byType(ShipCreated.name) instanceof ShipCreatedSerializer).toBeTruthy()
  expect(
    eventPayloadHandler.byType(ShipDeparted.name) instanceof ShipDepartedSerializer
  ).toBeTruthy()
})
