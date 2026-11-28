import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PROJECT_DIFFICULTIES, ProjectDifficulty } from '../schemas/project.schema';

export type MatchPriceType = 'all' | 'free' | 'paid';

export class MatchComponentsDto {
  @IsArray({ message: 'Komponentlər siyahı formatında olmalıdır' })
  @IsString({ each: true, message: 'Hər komponent adı mətn formatında olmalıdır' })
  components: string[];

  @IsOptional()
  @IsString({ message: 'Sahə mətn formatında olmalıdır' })
  domain?: string;

  @IsOptional()
  @IsIn(['all', 'free', 'paid'], {
    message: 'Qiymət tipi yalnız all, free və ya paid ola bilər',
  })
  priceType?: MatchPriceType = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum qiymət rəqəm formatında olmalıdır' })
  @Min(0, { message: 'Qiymət 0 və ya daha böyük olmalıdır' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Maksimum qiymət rəqəm formatında olmalıdır' })
  @Min(0, { message: 'Qiymət 0 və ya daha böyük olmalıdır' })
  maxPrice?: number;

  @IsOptional()
  @IsIn(PROJECT_DIFFICULTIES, {
    message: 'Çətinlik səviyyəsi yalnız BEGINNER, INTERMEDIATE və ya ADVANCED ola bilər',
  })
  difficulty?: ProjectDifficulty;
}
