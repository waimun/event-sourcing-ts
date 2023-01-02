import { PortDto } from './port-dto'

export interface DockShipDto {
  id: string
  port: PortDto
  dateTime?: string
}
