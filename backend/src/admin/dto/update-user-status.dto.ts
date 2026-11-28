import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @IsNotEmpty({ message: 'Status mütləq qeyd olunmalıdır' })
  @IsBoolean({ message: 'Status boolean dəyər olmalıdır' })
  isActive: boolean;
}
