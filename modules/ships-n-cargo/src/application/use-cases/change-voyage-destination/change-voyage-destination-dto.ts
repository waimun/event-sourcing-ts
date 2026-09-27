import type { PortDto } from '../dock-ship/port-dto'

export interface ChangeVoyageDestinationDto {
  id: string
  destination: PortDto
  reason: string
}
