import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AZERBAIJANI_ERROR_MESSAGES } from '../../common/i18n/az.messages';

export class RefundRequestDto {
  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}
