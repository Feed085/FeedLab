import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, PROJECT_STATUSES } from '../../projects/schemas/project.schema';

export class QueryAuthorProjectsDto {
  @IsOptional()
  @IsIn(PROJECT_STATUSES, {
    message: 'Status yalnız DRAFT, SUBMITTED, APPROVED və ya REJECTED ola bilər',
  })
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
