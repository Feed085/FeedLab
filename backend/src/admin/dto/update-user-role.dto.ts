import { IsIn, IsNotEmpty } from 'class-validator';
import { UserRole, USER_ROLES } from '../../users/schemas/user.schema';

export class UpdateUserRoleDto {
  @IsNotEmpty({ message: 'İstifadəçi rolu mütləq qeyd olunmalıdır' })
  @IsIn(USER_ROLES, {
    message: 'Düzgün istifadəçi rolu daxil edin',
  })
  role: UserRole;
}
