export class EventSerializerNotFound extends Error {
  constructor(eventName: string) {
    super(`Event serializer of event type '${eventName}' is not registered`)
  }
}

export class EventSerializerTypeMismatch extends Error {
  constructor(eventType: string, serializerEventType: string) {
    super(`Cannot register serializer for event type '${serializerEventType}' under '${eventType}'`)
  }
}
