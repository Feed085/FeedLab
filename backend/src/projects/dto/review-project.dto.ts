import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewProjectDto {
  @IsNotEmpty({ message: 'Qərar növü mütləq seçilməlidir' })
  @IsIn(['APPROVE', 'REJECT'], {
    message: 'Qərar yalnız APPROVE və ya REJECT ola bilər',
  })
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString({ message: 'Rədd edilmə səbəbi mətn formatında olmalıdır' })
  rejectionReason?: string;
}
