import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsEmail({}, { message: 'Düzgün e-poçt ünvanı daxil edin' })
  email: string;
}
