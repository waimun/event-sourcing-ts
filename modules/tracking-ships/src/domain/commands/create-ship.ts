import { Result } from '../../shared/result'

export class CreateShip {
  id: string
  name: string

  private constructor (name: string, id: string) {
    this.name = name
    this.id = id
  }

  static command (name: string, id: string): Result<CreateShip> {
    const _name = String(name).trim()
    const _id = String(id).trim()

    if (!/^[\w- ]{3,50}$/.test(_name)) {
      return Result.fail(new Error('invalid name; 3-50 characters, only alphanumeric, underscores, dashes or spaces allowed'))
    }

    if (!/^[a-zA-Z0-9-]{1,36}$/.test(_id)) {
      return Result.fail(new Error('invalid id; 1-36 characters, only alphanumeric or dashes allowed'))
    }

    return Result.ok(new CreateShip(_name, _id))
  }
}
