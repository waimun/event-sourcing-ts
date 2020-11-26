export class Result<T> {
  public readonly isSuccess: boolean
  public readonly isFailure: boolean
  private readonly value: T | Error

  private constructor (isSuccess: boolean, value: T | Error) {
    this.isSuccess = isSuccess
    this.isFailure = !isSuccess
    this.value = value
  }

  public getValue (): T | Error {
    return this.value
  }

  public static ok<T> (value: T): Result<T> {
    return new Result<T>(true, value)
  }

  public static fail<T> (error: Error): Result<T> {
    return new Result<T>(false, error)
  }

  public static failures (results: Array<Result<any>>): Array<Result<any>> {
    return results.filter(result => result.isFailure)
  }
}
