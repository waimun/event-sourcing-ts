export interface EventJournal<K, V> {
  newEntry: (id: K, ...events: V[]) => Promise<void>
  appendEvents: (id: K, ...events: V[]) => Promise<void>
  eventsById: (id: K) => Promise<V[]>
}
