import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AZERBAIJANI_ERROR_MESSAGES } from '../../common/i18n/az.messages';

export class CreateReviewDto {
  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsString()
  projectId: string;

  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsInt({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING })
  @Min(1, { message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING })
  @Max(5, { message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING })
  rating: number;

  @IsNotEmpty({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  @IsString({ message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD })
  comment: string;

  @IsOptional()
  detailedScores?: Record<string, number>;
}
