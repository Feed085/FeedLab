import { IsOptional, IsString, IsNumber, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PROJECT_DIFFICULTIES, ProjectDifficulty } from '../schemas/project.schema';

export type ProjectSort = 'newest' | 'price_asc' | 'price_desc' | 'popular';

function parseOptionalBoolean(value: any): any {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}

export class QueryProjectsDto {
  @IsOptional()
  @IsString({ message: 'Axtarış sorğusu mətn formatında olmalıdır' })
  q?: string;

  @IsOptional()
  @IsString({ message: 'Kateqoriya identifikatoru və ya slug mətn formatında olmalıdır' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'Texnologiya identifikatoru və ya slug mətn formatında olmalıdır' })
  tech?: string;

  @IsOptional()
  @IsString({ message: 'Sahə mətn formatında olmalıdır' })
  domain?: string;

  @IsOptional()
  @IsIn(PROJECT_DIFFICULTIES, {
    message: 'Çətinlik səviyyəsi yalnız BEGINNER, INTERMEDIATE və ya ADVANCED ola bilər',
  })
  difficulty?: ProjectDifficulty;

  @IsOptional()
  @IsString({ message: 'Komponent parametri mətn formatında olmalıdır' })
  component?: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean({ message: 'Pulsuz filtr boolean formatında olmalıdır' })
  freeOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean({ message: 'Pulsuz filtr boolean formatında olmalıdır' })
  isFree?: boolean;

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
  @IsIn(['newest', 'price_asc', 'price_desc', 'popular'], {
    message: 'Sıralama yalnız newest, price_asc, price_desc və ya popular ola bilər',
  })
  sort?: ProjectSort = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Səhifə nömrəsi rəqəm olmalıdır' })
  @Min(1, { message: 'Səhifə nömrəsi ən azı 1 olmalıdır' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit rəqəm olmalıdır' })
  @Min(1, { message: 'Limit ən azı 1 olmalıdır' })
  @Max(100, { message: 'Limit ən çoxu 100 ola bilər' })
  limit?: number = 12;
}
