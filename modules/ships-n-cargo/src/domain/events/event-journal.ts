export interface EventJournal<K, V> {
  appendEvents: (...events: V[]) => Promise<void>
  eventsById: (id: K) => Promise<V[]>
}
