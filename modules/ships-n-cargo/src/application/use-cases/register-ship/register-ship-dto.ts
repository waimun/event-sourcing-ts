import type { PortDto } from '../dock-ship/port-dto'

export interface RegisterShipDto {
  id: string
  name: string
  port: PortDto
}
