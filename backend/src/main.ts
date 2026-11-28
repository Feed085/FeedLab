import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CustomValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const corsOrigin = configService.get<string>('corsOrigin') || 'http://localhost:5173';
  const storageLocalPath = configService.get<string>('storage.localPath') || './uploads';
  const uploadsPath = path.resolve(process.cwd(), storageLocalPath);

  // Serve uploaded static assets at /uploads/ without global API prefix interference
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS configuration
  app.enableCors({
    origin: corsOrigin.includes(',') ? corsOrigin.split(',').map((o) => o.trim()) : corsOrigin,
    credentials: true,
  });

  // Global validation pipe with Azerbaijani error mappings
  app.useGlobalPipes(new CustomValidationPipe());

  // Global HTTP exception filter with standardized envelope
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Feed Lab Backend running on http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
