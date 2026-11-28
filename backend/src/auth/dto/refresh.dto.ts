import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsNotEmpty({ message: 'Bu xana mütləq doldurulmalıdır' })
  @IsString({ message: 'Yeniləmə tokeni mətn formatında olmalıdır' })
  refreshToken: string;
}
