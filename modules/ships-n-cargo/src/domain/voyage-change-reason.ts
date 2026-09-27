import { IsRequired } from '../shared/domain/errors/is-required'
import { DomainError } from '../shared/errors/kernel'
import { isEmptyString, trim } from '../shared/utils/text'

export const maximumVoyageChangeReasonLength = 500

export class VoyageChangeReason {
  readonly value: string

  constructor(value: string) {
    if (isEmptyString(value)) throw new IsRequired('Voyage change reason')
    if (trim(value).length > maximumVoyageChangeReasonLength) {
      throw new VoyageChangeReasonTooLong(value)
    }

    this.value = trim(value)
    Object.freeze(this)
  }
}

export class VoyageChangeReasonTooLong extends DomainError {
  declare readonly code: 'VOYAGE_CHANGE_REASON_TOO_LONG'

  constructor(value: string) {
    super({
      code: 'VOYAGE_CHANGE_REASON_TOO_LONG',
      kind: 'validation',
      message: `Voyage change reason must be no longer than ${maximumVoyageChangeReasonLength} characters`,
      meta: { maximumLength: maximumVoyageChangeReasonLength, value }
    })
  }
}
