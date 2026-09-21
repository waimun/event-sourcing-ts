import { InvariantError } from '../../shared/error'

export class EventSerializerNotFound extends InvariantError {
  constructor(eventName: string) {
    super({
      code: 'EVENT_SERIALIZER_NOT_FOUND',
      message: `Event serializer of event type '${eventName}' is not registered`,
      meta: { eventType: eventName }
    })
  }
}

export class EventSerializerTypeMismatch extends InvariantError {
  constructor(eventType: string, serializerEventType: string) {
    super({
      code: 'EVENT_SERIALIZER_TYPE_MISMATCH',
      message: `Cannot register serializer for event type '${serializerEventType}' under '${eventType}'`,
      meta: { eventType, serializerEventType }
    })
  }
}
