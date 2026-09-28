import { expect, test } from 'vitest'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { Name } from '../../../shared/domain/name'
import { eventJournalContract } from './event-journal-contract'
import { InMemoryEventJournal } from './in-memory-event-journal'

const makeJournal = () => new InMemoryEventJournal(new Name('Test Journal'))

eventJournalContract(makeJournal)

test('creates a named journal', () => {
  expect(makeJournal().name).toBe('Test Journal')
})

test('requires a journal name', () => {
  expect(() => new InMemoryEventJournal(new Name(''))).toThrow(IsRequired)
  expect(() => new InMemoryEventJournal(new Name('   '))).toThrow(IsRequired)
})
