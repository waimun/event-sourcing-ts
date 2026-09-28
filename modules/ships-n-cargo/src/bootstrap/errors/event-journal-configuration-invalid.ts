import { InfrastructureError } from '../../shared/errors/kernel'

export class EventJournalConfigurationInvalid extends InfrastructureError {
  constructor(details: string) {
    super({
      code: 'EVENT_JOURNAL_CONFIGURATION_INVALID',
      message: `Event journal configuration is invalid: ${details}`,
      meta: { details }
    })
  }
}
