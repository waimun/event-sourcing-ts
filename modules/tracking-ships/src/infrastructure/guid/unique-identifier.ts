import k from 'ksuid'

export class UniqueIdentifier {
  private readonly value: k

  constructor (date: Date = new Date()) {
    this.value = k.randomSync(date)
  }

  toString (): string {
    return this.value.string
  }

  date (): Date {
    return this.value.date
  }

  compare (other: UniqueIdentifier): number {
    return this.value.compare(other.value)
  }

  equals (other: UniqueIdentifier): boolean {
    return this.compare(other) === 0
  }
}
