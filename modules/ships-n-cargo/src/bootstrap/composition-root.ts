import { createApplication } from '../adapters/inbound/http/api/application'
import { generateId } from '../adapters/inbound/http/generate-id'
import { InMemoryEventJournal } from '../adapters/outbound/persistence/in-memory-event-journal'
import { Name } from '../shared/domain/name'

export const createDefaultApplication = () =>
  createApplication({
    eventJournal: new InMemoryEventJournal(new Name('ships-n-cargo')),
    generateId
  })
