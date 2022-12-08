export interface EventJournal<K, V> {
  newEntry: (id: K, ...events: V[]) => void
  appendEvents: (id: K, ...events: V[]) => void
  eventsById: (id: K) => V[]
}
