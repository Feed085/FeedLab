import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { CustomValidationPipe } from '../src/common/pipes/validation.pipe';

describe('Marketplace Catalog & Free Claim E2E', () => {
  let app: INestApplication;
  let buyerToken = '';
  let freeProjectId = '';
  let paidProjectId = '';
  let sampleSlug = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new CustomValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // Register a buyer for claim testing
    const unique = Date.now();
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `catalog_buyer_${unique}@feedlab.az`,
        password: 'Password123!',
        fullName: 'Kataloq Alıcısı',
      })
      .expect(201);

    buyerToken = regRes.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/categories returns seeded categories (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(6);
    const slugs = res.body.map((c: any) => c.slug);
    expect(slugs).toContain('smart-home');
    expect(slugs).toContain('sensors');
    expect(slugs).toContain('robotics');
  });

  it('GET /api/v1/technologies returns seeded technologies (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/technologies')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(10);
    const slugs = res.body.map((t: any) => t.slug);
    expect(slugs).toContain('arduino');
    expect(slugs).toContain('esp32');
    expect(slugs).toContain('raspberry-pi');
  });

  it('GET /api/v1/projects returns paginated list of approved projects (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(4);

    for (const project of res.body.data) {
      expect(project.status).toBe('APPROVED');
      expect(project).toHaveProperty('title');
      expect(project).toHaveProperty('slug');
      expect(project).toHaveProperty('price');
      expect(project.currency).toBe('AZN');

      if (project.price === 0) {
        freeProjectId = project._id || project.id;
      } else {
        paidProjectId = project._id || project.id;
      }
      if (!sampleSlug) {
        sampleSlug = project.slug;
      }
    }
  });

  it('GET /api/v1/projects?category=smart-home filters by category (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects?category=smart-home')
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const p of res.body.data) {
      const categorySlug = p.category?.slug || p.categoryId?.slug;
      expect(categorySlug).toBe('smart-home');
    }
  });

  it('GET /api/v1/projects?q=Hava searches by title keyword (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects?q=Hava')
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title).toContain('Hava');
  });

  it('GET /api/v1/projects?minPrice=20&maxPrice=30 filters by price range (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects?minPrice=20&maxPrice=30')
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const p of res.body.data) {
      expect(p.price).toBeGreaterThanOrEqual(20);
      expect(p.price).toBeLessThanOrEqual(30);
    }
  });

  it('GET /api/v1/projects/:slug returns full engineering project details (200)', async () => {
    expect(sampleSlug).toBeTruthy();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${sampleSlug}`)
      .expect(200);

    expect(res.body.slug).toBe(sampleSlug);
    expect(res.body).toHaveProperty('components');
    expect(Array.isArray(res.body.components)).toBe(true);
    expect(res.body).toHaveProperty('installationGuide');
    expect(res.body).toHaveProperty('hardwareRequirements');
    expect(res.body).toHaveProperty('workingPrinciple');
    expect(res.body).toHaveProperty('authorId');
  });

  it('GET /api/v1/projects/non-existent-slug-12345 returns 404 Not Found', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects/non-existent-slug-12345')
      .expect(404);

    expect(res.body.message).toContain('Layihə tapılmadı');
  });

  it('POST /api/v1/projects/:id/claim-free without auth returns 401 Unauthorized', async () => {
    expect(freeProjectId).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${freeProjectId}/claim-free`)
      .expect(401);

    expect(res.body.message).toContain('Zəhmət olmasa, əvvəlcə daxil olun');
  });

  it('POST /api/v1/projects/:id/claim-free on paid project returns 400 Bad Request', async () => {
    expect(paidProjectId).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${paidProjectId}/claim-free`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(400);

    expect(res.body.message).toContain('Bu layihə ödənişlidir, pulsuz əldə edilə bilməz');
  });

  it('POST /api/v1/projects/:id/claim-free on free project returns 200 OK and orderId', async () => {
    expect(freeProjectId).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${freeProjectId}/claim-free`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('orderId');
    expect(res.body).toHaveProperty('orderNumber');
    expect(res.body.message).toContain('Layihə uğurla əldə edildi');
  });

  it('POST /api/v1/projects/:id/claim-free is idempotent and returns existing order', async () => {
    expect(freeProjectId).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${freeProjectId}/claim-free`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.alreadyClaimed).toBe(true);
    expect(res.body).toHaveProperty('orderId');
  });
});
