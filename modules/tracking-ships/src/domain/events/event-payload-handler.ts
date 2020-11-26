import { Result } from '../../shared/result'

export class EventPayloadHandler {
  private readonly handlers: Map<string, Function>

  constructor () {
    this.handlers = new Map<string, Function>()
  }

  register (type: string, fn: Function): void {
    this.handlers.set(type, fn)
  }

  byType (type: string): Result<Function> {
    const fn = this.handlers.get(type)
    if (fn !== undefined) return Result.ok(fn)
    return Result.fail(new Error(`No registered handler for payload type ${type}`))
  }
}
