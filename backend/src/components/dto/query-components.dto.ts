import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryComponentsDto {
  @IsOptional()
  @IsString({ message: 'Axtarış sorğusu mətn formatında olmalıdır' })
  q?: string;

  @IsOptional()
  @IsString({ message: 'Kateqoriya mətn formatında olmalıdır' })
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Səhifə nömrəsi rəqəm formatında olmalıdır' })
  @Min(1, { message: 'Səhifə nömrəsi ən azı 1 olmalıdır' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit rəqəm formatında olmalıdır' })
  @Min(1, { message: 'Limit ən azı 1 olmalıdır' })
  @Max(100, { message: 'Limit ən çoxu 100 ola bilər' })
  limit?: number = 24;
}
