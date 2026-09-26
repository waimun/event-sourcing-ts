import { expect, test } from 'vitest'
import { EventIsRequired } from '../../adapters/outbound/persistence/errors/event-journal'
import { IdAlreadyExists } from '../../application/errors/id-already-exists'
import { ShipNotFound } from '../../application/errors/ship-not-found'
import { InvalidCountry } from '../../domain/errors/dock-ship'
import {
  EventSerializerNotFound,
  EventSerializerTypeMismatch
} from '../../domain/errors/event-payload-handler'
import {
  ContainerAlreadyLoaded,
  ContainerNotFound,
  IdsMismatch,
  ShipMustBeRegisteredFirst,
  ShipNotAtPort,
  ShipNotAtSea,
  UnregisteredShipRequiredToRegister
} from '../../domain/errors/ship'
import { IsRequired } from '../domain/errors/is-required'
import { IdNotAllowed } from '../domain/id'
import { NameNotAllowed } from '../domain/name'
import { ApplicationError, BaseError, DomainError, ExpectedError } from './kernel'

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

test.each([
  [new IsRequired('Id'), 'REQUIRED_VALUE', 'validation'],
  [new IdNotAllowed('!'), 'INVALID_IDENTIFIER', 'validation'],
  [new NameNotAllowed('!'), 'INVALID_NAME', 'validation'],
  [new InvalidCountry('ZZ'), 'INVALID_COUNTRY', 'validation'],
  [new ShipNotFound('ship-1'), 'SHIP_NOT_FOUND', 'not-found'],
  [new ContainerNotFound('container'), 'CONTAINER_NOT_FOUND', 'not-found'],
  [new IdAlreadyExists('ship-1'), 'SHIP_ALREADY_EXISTS', 'conflict'],
  [new ContainerAlreadyLoaded('container'), 'CONTAINER_ALREADY_LOADED', 'conflict'],
  [new ShipNotAtPort(), 'SHIP_NOT_AT_PORT', 'conflict'],
  [new ShipNotAtSea(), 'SHIP_NOT_AT_SEA', 'conflict'],
  [new UnregisteredShipRequiredToRegister(), 'SHIP_ALREADY_REGISTERED', 'invariant'],
  [new ShipMustBeRegisteredFirst(), 'SHIP_NOT_REGISTERED', 'invariant'],
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
