export interface EventJournal<K, V> {
  appendEvents: (id: K, ...events: V[]) => Promise<void>
  eventsById: (id: K) => Promise<V[]>
}
