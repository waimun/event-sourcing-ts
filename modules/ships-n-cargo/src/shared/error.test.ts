import { expect, test } from 'vitest'
import { IdAlreadyExists } from '../application/errors/id-already-exists'
import { ShipNotFound } from '../application/errors/ship-not-found'
import {
  CannotDockShipAtSea,
  CannotDockWithoutPort,
  InvalidCountry,
  NoCountrySpecifiedForPort
} from '../domain/errors/dock-ship'
import {
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../domain/errors/event-payload-handler'
import {
  CargoAlreadyLoaded,
  CargoNotFound,
  IdsMismatch,
  InvalidPortForDeparture,
  ShipMustBeCreatedFirst,
  UninitializedShipRequiredToCreate
} from '../domain/errors/ship'
import { EventIsRequired } from '../infrastructure/persistence/in-memory-event-journal'
import { InvalidDate } from './domain/date'
import { IsRequired } from './domain/errors/is-required'
import { IdNotAllowed } from './domain/id'
import { NameNotAllowed } from './domain/name'
import {
  ApplicationError,
  BaseError,
  DomainError,
  EventJournalUnavailable,
  ExpectedError,
  InfrastructureError
} from './error'

class ExampleDomainError extends DomainError {
  constructor() {
    super({ code: 'EXAMPLE', kind: 'validation', message: 'Example', meta: { field: 'name' } })
  }
}

test('domain errors expose stable classification and immutable metadata', () => {
  const error = new ExampleDomainError()

  expect(error).toBeInstanceOf(BaseError)
  expect(error).toBeInstanceOf(ExpectedError)
  expect(error).toBeInstanceOf(DomainError)
  expect(error).toBeInstanceOf(Error)
  expect(error).toMatchObject({
    name: 'ExampleDomainError',
    domain: 'ships-n-cargo',
    code: 'EXAMPLE',
    kind: 'validation',
    message: 'Example',
    meta: { field: 'name' }
  })
  expect(Object.isFrozen(error.meta)).toBe(true)
})

test.each([new ShipNotFound('ship-1'), new IdAlreadyExists('ship-1')])(
  'application error %s is expected and distinct from domain errors',
  (error) => {
    expect(error).toBeInstanceOf(ApplicationError)
    expect(error).toBeInstanceOf(ExpectedError)
    expect(error).not.toBeInstanceOf(DomainError)
  }
)

test('event journal failures retain operation and cause', () => {
  const cause = new Error('connection refused')
  const error = new EventJournalUnavailable('append', cause)

  expect(error).toBeInstanceOf(InfrastructureError)
  expect(error).not.toBeInstanceOf(ExpectedError)
  expect(error).toMatchObject({
    domain: 'ships-n-cargo',
    code: 'EVENT_JOURNAL_UNAVAILABLE',
    kind: 'fatal',
    meta: { operation: 'append' },
    cause
  })
})

test.each([
  [new IsRequired('Id'), 'REQUIRED_VALUE', 'validation'],
  [new IdNotAllowed('!'), 'INVALID_IDENTIFIER', 'validation'],
  [new NameNotAllowed('!'), 'INVALID_NAME', 'validation'],
  [new InvalidDate(), 'INVALID_DATE', 'validation'],
  [new InvalidCountry('ZZ'), 'INVALID_COUNTRY', 'validation'],
  [new CannotDockShipAtSea(), 'CANNOT_DOCK_AT_SEA', 'validation'],
  [new CannotDockWithoutPort(), 'CANNOT_DOCK_WITHOUT_PORT', 'validation'],
  [new NoCountrySpecifiedForPort(), 'PORT_COUNTRY_REQUIRED', 'validation'],
  [new ShipNotFound('ship-1'), 'SHIP_NOT_FOUND', 'not-found'],
  [new CargoNotFound('cargo'), 'CARGO_NOT_FOUND', 'not-found'],
  [new IdAlreadyExists('ship-1'), 'SHIP_ALREADY_EXISTS', 'conflict'],
  [new CargoAlreadyLoaded('cargo'), 'CARGO_ALREADY_LOADED', 'conflict'],
  [new InvalidPortForDeparture(), 'INVALID_PORT_FOR_DEPARTURE', 'conflict'],
  [new UninitializedShipRequiredToCreate(), 'SHIP_ALREADY_INITIALIZED', 'invariant'],
  [new ShipMustBeCreatedFirst(), 'SHIP_NOT_INITIALIZED', 'invariant'],
  [new IdsMismatch(), 'AGGREGATE_ID_MISMATCH', 'invariant'],
  [new EventSerializerNotFound('event'), 'EVENT_SERIALIZER_NOT_FOUND', 'invariant'],
  [
    new EventSerializerTypeMismatch('event', 'other'),
    'EVENT_SERIALIZER_TYPE_MISMATCH',
    'invariant'
  ],
  [new EventIsRequired(), 'EVENT_REQUIRED', 'invariant']
] as const)('classifies %s with code %s and kind %s', (error, code, kind) => {
  expect(error).toMatchObject({ domain: 'ships-n-cargo', code, kind })
})
