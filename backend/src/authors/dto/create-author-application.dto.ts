import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  IsUrl,
} from 'class-validator';

export class CreateAuthorApplicationDto {
  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsString({ message: 'Bioqrafiya mətn formatında olmalıdır' })
  @MinLength(10, { message: 'Bioqrafiya ən azı 10 simvol olmalıdır' })
  bio: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsArray({ message: 'Bacarıqlar massiv formatında olmalıdır' })
  skills?: string[];

  @IsOptional()
  @IsArray({ message: 'Texniki bacarıqlar massiv formatında olmalıdır' })
  technicalSkills?: string[];

  @IsOptional()
  @IsUrl({}, { message: 'Portfel linki düzgün URL formatında olmalıdır' })
  portfolioUrl?: string;

  @IsOptional()
  @IsArray()
  portfolioLinks?: string[];

  @IsOptional()
  @IsString()
  githubUrl?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  motivation?: string;
}
