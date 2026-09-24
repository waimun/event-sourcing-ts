import { expect, test } from 'vitest'
import { Id } from '../../shared/domain/id'
import { Name } from '../../shared/domain/name'
import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { RegisterShip } from './register-ship'

test('captures a ship identity and known initial port', () => {
  const port = new Port(new PortName('Kingston'), new Country('US'))
  const command = new RegisterShip(new Name('King Roy'), new Id('king-1'), port)

  expect(command).toMatchObject({ id: 'king-1', name: 'King Roy', port })
})
