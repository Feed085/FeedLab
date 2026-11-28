import { IsEnum, IsNotEmpty } from 'class-validator';
import { TicketStatus, TICKET_STATUSES } from '../schemas/ticket.schema';

export class TicketStatusDto {
  @IsNotEmpty()
  @IsEnum(TICKET_STATUSES)
  status: TicketStatus;
}
