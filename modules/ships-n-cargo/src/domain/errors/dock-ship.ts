import { DomainError } from '../../shared/errors/kernel'
import { EnumCountry } from '../country'

export class InvalidCountry extends DomainError {
  declare readonly code: 'INVALID_COUNTRY'
  constructor(country: string) {
    const countries = Object.entries(EnumCountry).map((e) => `${e[0]}(${e[1]})`)
    super({
      code: 'INVALID_COUNTRY',
      kind: 'validation',
      message: `Country '${country}' is not in the list of ${countries.join(',')}`,
      meta: { country }
    })
  }
}
