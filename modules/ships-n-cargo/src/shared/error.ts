export class ApplicationError extends Error {
  constructor () {
    super('An unknown error has occurred in the application; please retry')
  }
}

export class InvalidArgumentError extends Error {}
