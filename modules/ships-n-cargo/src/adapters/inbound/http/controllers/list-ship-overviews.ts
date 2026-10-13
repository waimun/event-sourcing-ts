import { InvalidShipOverviewFilter } from '../../../../application/errors/invalid-ship-overview-filter'
import type { ShipOverviewFilter } from '../../../../application/ports/ship-overview-projection'
import type { ListShipOverviewsDto } from '../../../../application/use-cases/list-ship-overviews/list-ship-overviews-dto'
import type { ListShipOverviewsUseCase } from '../../../../application/use-cases/list-ship-overviews/use-case'
import { Country } from '../../../../domain/country'
import { PortName } from '../../../../domain/port-name'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { isEmptyString, trim } from '../../../../shared/utils/text'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class ListShipOverviewsController {
  constructor(private readonly useCase: ListShipOverviewsUseCase) {}

  async get(request: ListShipOverviewsDto): Promise<Response> {
    let filter: ShipOverviewFilter
    try {
      filter = parseFilter(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      return { status: 200, body: await this.useCase.execute(filter), dateTime: new Date() }
    } catch (error) {
      return errorResponse(error, request)
    }
  }
}

const parseFilter = (request: ListShipOverviewsDto): ShipOverviewFilter => {
  const status = trim(request.status)
  const portName = trim(request.portName)
  const portCountry = trim(request.portCountry)
  const hasStatus = !isEmptyString(status)
  const hasPort = !isEmptyString(portName) || !isEmptyString(portCountry)

  if (!hasStatus && !hasPort) throw new IsRequired('Status or port')
  if (hasStatus && hasPort) {
    throw new InvalidShipOverviewFilter('provide status or portName and portCountry, not both')
  }
  if (hasStatus) {
    if (status !== 'at-port' && status !== 'at-sea') {
      throw new InvalidShipOverviewFilter("status must be 'at-port' or 'at-sea'")
    }
    return Object.freeze({ status })
  }

  return Object.freeze({
    currentPort: Object.freeze({
      country: new Country(portCountry).value,
      name: new PortName(portName).value
    })
  })
}
