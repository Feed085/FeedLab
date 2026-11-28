import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { CustomValidationPipe } from '../src/common/pipes/validation.pipe';

describe('Auth & RBAC E2E (/api/v1/auth & protected)', () => {
  let app: INestApplication;
  const uniqueId = Date.now();
  const testUser = {
    email: `e2e_user_${uniqueId}@feedlab.az`,
    password: 'SecurePassword123!',
    fullName: 'Test İstifadəçi',
  };

  let accessToken = '';
  let refreshToken = '';

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

  it('POST /api/v1/auth/register creates user and returns tokens (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('USER');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/v1/auth/register duplicate email returns 409 Conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(409);

    expect(res.body).toHaveProperty('statusCode', 409);
    expect(res.body.message).toContain('Bu e-poçt ünvanı artıq qeydiyyatdan keçib');
  });

  it('POST /api/v1/auth/register short password returns 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `short_${uniqueId}@feedlab.az`,
        password: '123',
        fullName: 'Short Pwd',
      })
      .expect(400);

    expect(res.body.message).toContain('Şifrə ən azı 8 simvol olmalıdır');
  });

  it('POST /api/v1/auth/login with valid credentials returns 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/v1/auth/login with wrong password returns 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!',
      })
      .expect(401);

    expect(res.body.message).toContain('E-poçt və ya şifrə yanlışdır');
  });

  it('POST /api/v1/auth/refresh with valid token rotates tokens (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    // Update tokens for subsequent tests
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/v1/auth/refresh with invalid token returns 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid.jwt.token' })
      .expect(401);

    expect(res.body.message).toContain('Yeniləmə tokeni etibarsızdır və ya müddəti bitib');
  });

  it('GET /api/v1/auth/me with Bearer token returns user profile (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('GET /api/v1/auth/me without token returns 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    expect(res.body.message).toContain('Zəhmət olmasa, əvvəlcə daxil olun');
  });

  it('POST /api/v1/auth/forgot-password returns 200 OK', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
  });

  it('RBAC: Non-admin buyer receives 403 Forbidden on /api/v1/admin/metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/metrics')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(res.body.message).toContain('Bu əməliyyat üçün icazəniz yoxdur');
  });

  it('RBAC: Unauthenticated user receives 401 Unauthorized on /api/v1/admin/metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/metrics')
      .expect(401);

    expect(res.body.message).toContain('Zəhmət olmasa, əvvəlcə daxil olun');
  });

  it('RBAC: Seeded admin can log in and access /api/v1/admin/metrics (200)', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@feedlab.az',
        password: 'Admin123!',
      })
      .expect(200);

    const adminToken = adminLogin.body.accessToken;
    expect(adminLogin.body.user.role).toBe('ADMIN');

    const metricsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(metricsRes.body).toHaveProperty('totalUsers');
  });

  it('POST /api/v1/auth/logout with Bearer token invalidates session (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
  });
});
