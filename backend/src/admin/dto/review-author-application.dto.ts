import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewAuthorApplicationDto {
  @IsNotEmpty({ message: 'Qərar növü mütləq seçilməlidir' })
  @IsIn(['APPROVE', 'REJECT'], {
    message: 'Qərar yalnız APPROVE və ya REJECT ola bilər',
  })
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
