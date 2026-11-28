import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AZERBAIJANI_ERROR_MESSAGES } from '../../common/i18n/az.messages';

export class ReplyReviewDto {
  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
