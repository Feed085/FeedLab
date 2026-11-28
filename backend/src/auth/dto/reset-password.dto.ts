import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsString({ message: 'Şifrə mətn formatında olmalıdır' })
  @MinLength(8, { message: 'Şifrə ən azı 8 simvol olmalıdır' })
  newPassword: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;
}
