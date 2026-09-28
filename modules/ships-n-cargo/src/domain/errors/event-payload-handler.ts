import { InvariantError } from '../../shared/errors/kernel'

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

export class EventPayloadSchemaVersionInvalid extends InvariantError {
  constructor(eventType: string, schemaVersion: unknown) {
    super({
      code: 'EVENT_PAYLOAD_SCHEMA_VERSION_INVALID',
      message: `Event payload schema version for event type '${eventType}' must be a positive integer`,
      meta: { eventType, schemaVersion }
    })
  }
}

export class EventPayloadSchemaVersionUnsupported extends InvariantError {
  constructor(eventType: string, schemaVersion: number, currentSchemaVersion: number) {
    super({
      code: 'EVENT_PAYLOAD_SCHEMA_VERSION_UNSUPPORTED',
      message: `Event payload schema version '${schemaVersion}' is not supported for event type '${eventType}'`,
      meta: { eventType, schemaVersion, currentSchemaVersion }
    })
  }
}
