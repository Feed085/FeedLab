import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsEmail({}, { message: 'Düzgün e-poçt ünvanı daxil edin' })
  email: string;

  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsString({ message: 'Şifrə mətn formatında olmalıdır' })
  @MinLength(8, { message: 'Şifrə ən azı 8 simvol olmalıdır' })
  @MaxLength(1000, { message: 'Şifrə ən çoxu 1000 simvol ola bilər' })
  password: string;

  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsString({ message: 'Ad və soyad mətn formatında olmalıdır' })
  fullName: string;

  @IsOptional()
  @IsString()
  role?: string;
}
