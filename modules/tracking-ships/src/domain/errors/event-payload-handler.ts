export class EventSerializerNotFound extends Error {
  constructor (eventName: string) {
    super(`Event serializer of event type '${eventName}' is not registered`)
  }
}
