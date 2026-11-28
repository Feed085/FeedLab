import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { CustomValidationPipe } from '../src/common/pipes/validation.pipe';

describe('Health E2E (/api/v1/health)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new CustomValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health returns 200 OK with connected database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('database', 'connected');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

  it('GET /api/v1/non-existent returns 404 with localized error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/non-existent-endpoint')
      .expect(404);

    expect(response.body).toHaveProperty('statusCode', 404);
    expect(response.body).toHaveProperty('error', 'Not Found');
    expect(response.body).toHaveProperty('message', 'Axtarılan resurs və ya səhifə tapılmadı');
    expect(response.body).toHaveProperty('path', '/api/v1/non-existent-endpoint');
    expect(response.body).toHaveProperty('timestamp');
  });
});
