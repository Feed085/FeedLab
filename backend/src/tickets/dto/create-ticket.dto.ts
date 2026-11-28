import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AZERBAIJANI_ERROR_MESSAGES } from '../../common/i18n/az.messages';
import { TicketCategory, TICKET_CATEGORIES } from '../schemas/ticket.schema';

export class CreateTicketDto {
  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsString({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  subject: string;

  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsEnum(TICKET_CATEGORIES, { message: 'Düzgün kateqoriya seçin' })
  category: TicketCategory;

  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsString({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  description: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  priority?: string;
}
