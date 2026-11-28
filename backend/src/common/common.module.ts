import { Module } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { CustomValidationPipe } from './pipes/validation.pipe';

@Module({
  providers: [HttpExceptionFilter, CustomValidationPipe],
  exports: [HttpExceptionFilter, CustomValidationPipe],
})
export class CommonModule {}
