import { IsNotEmpty, IsString } from 'class-validator';
import { AZERBAIJANI_ERROR_MESSAGES } from '../../common/i18n/az.messages';

export class TicketMessageDto {
  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsString({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  message: string;
}
