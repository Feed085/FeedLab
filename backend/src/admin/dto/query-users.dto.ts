import { IsOptional, IsString, IsNumber, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserRole, USER_ROLES } from '../../users/schemas/user.schema';

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(USER_ROLES, {
    message: 'Düzgün istifadəçi rolu daxil edin',
  })
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

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
