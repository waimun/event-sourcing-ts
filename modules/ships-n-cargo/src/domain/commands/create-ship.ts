import { isValidName, NameIsRequired, NameNotAllowed } from '../../shared/validators/name'
import { IdIsRequired, IdNotAllowed, isValidIdentifier } from '../../shared/validators/id'
import { isEmptyString } from '../../shared/utils/text'

export class CreateShip {
  readonly id: string
  readonly name: string

  constructor (name: string, id: string) {
    if (isEmptyString(name)) throw new NameIsRequired()
    if (!isValidName(name)) throw new NameNotAllowed()
    if (isEmptyString(id)) throw new IdIsRequired()
    if (!isValidIdentifier(id)) throw new IdNotAllowed()

    this.name = name
    this.id = id
  }
}
