import {
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BOMComponent,
  PROJECT_DIFFICULTIES,
  PROJECT_DOMAINS,
  ProjectDifficulty,
} from '../schemas/project.schema';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Layihənin adı mətn formatında olmalıdır' })
  @MinLength(5, { message: 'Layihənin adı ən azı 5 simvol olmalıdır' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Qısa təsvir mətn formatında olmalıdır' })
  @MaxLength(500, { message: 'Qısa təsvir ən çoxu 500 simvol ola bilər' })
  shortDescription?: string;

  @IsOptional()
  @IsString({ message: 'Geniş təsvir mətn formatında olmalıdır' })
  fullDescription?: string;

  @IsOptional()
  objectives?: string[] | string;

  @IsOptional()
  @IsString()
  workingPrinciple?: string;

  @IsOptional()
  @IsArray()
  components?: BOMComponent[] | string[];

  @IsOptional()
  @IsString()
  installationGuide?: string;

  @IsOptional()
  @IsString()
  hardwareRequirements?: string;

  @IsOptional()
  @IsString()
  systemRequirements?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Qiymət rəqəm formatında olmalıdır' })
  @Min(0, { message: 'Qiymət 0 və ya daha böyük olmalıdır' })
  price?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  technologies?: string[];

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray({ message: 'Sahələr siyahı formatında olmalıdır' })
  @IsString({ each: true, message: 'Hər sahə mətn formatında olmalıdır' })
  @IsIn(PROJECT_DOMAINS, { each: true, message: 'Düzgün layihə sahəsi seçin' })
  domains?: string[];

  @IsOptional()
  @IsIn(PROJECT_DIFFICULTIES, {
    message: 'Çətinlik səviyyəsi yalnız BEGINNER, INTERMEDIATE və ya ADVANCED ola bilər',
  })
  difficulty?: ProjectDifficulty;
}
