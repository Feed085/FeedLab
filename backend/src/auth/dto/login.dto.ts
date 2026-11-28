import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsEmail({}, { message: 'Düzgün e-poçt ünvanı daxil edin' })
  email: string;

  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsString({ message: 'Şifrə mətn formatında olmalıdır' })
  @MaxLength(1000, { message: 'Şifrə ən çoxu 1000 simvol ola bilər' })
  password: string;
}
