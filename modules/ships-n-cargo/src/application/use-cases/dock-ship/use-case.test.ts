import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import { ShipNotAtSea } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Ship } from '../../../domain/ship'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { RegisterShipUseCase } from '../register-ship/use-case'
import { SailShipUseCase } from '../sail-ship/use-case'
import { DockShipUseCase } from './use-case'

afterEach(() => vi.restoreAllMocks())

const initialPort = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Boston'), new Country('US'))
const putAtSea = async (journal: EventJournal<string, DomainEvent>, id: Id) => {
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)
  await new SailShipUseCase(journal).sail(id)
}

test('docks a ship that is at sea', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await putAtSea(journal, id)

  expect(await new DockShipUseCase(journal).dock(id, destination)).toEqual({
    ok: true,
    value: undefined
  })
  expect((await journal.eventsByAggregate(id.value)).events).toHaveLength(3)
})

test('returns ship not found for an absent ship', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  expect(await new DockShipUseCase(journal).dock(id, destination)).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('rejects arrival while the ship is already at a port', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)

  const result = await new DockShipUseCase(journal).dock(id, destination)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toBeInstanceOf(ShipNotAtSea)
})

test('rereads the ship before retrying a concurrent dock', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await putAtSea(journal, id)
  const reads = vi.spyOn(journal, 'eventsByAggregate')
  vi.spyOn(journal, 'append').mockRejectedValueOnce(new JournalVersionConflict(id.value, 2, 3))

  expect(await new DockShipUseCase(journal).dock(id, destination)).toEqual({
    ok: true,
    value: undefined
  })
  expect(reads).toHaveBeenCalledTimes(2)
})

test('does not turn an unexpected domain failure into a result', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await putAtSea(journal, id)
  const failure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'arrive').mockImplementation(() => {
    throw failure
  })

  await expect(new DockShipUseCase(journal).dock(id, destination)).rejects.toBe(failure)
})
