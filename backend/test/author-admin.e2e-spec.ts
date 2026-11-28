import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { CustomValidationPipe } from '../src/common/pipes/validation.pipe';

describe('Milestone 4: Author & Admin Pipelines E2E', () => {
  let app: INestApplication;

  const timestamp = Date.now();
  const buyerEmail = `e2e_buyer_${timestamp}@feedlab.az`;
  const adminEmail = `e2e_admin_${timestamp}@feedlab.az`;
  const testPassword = 'Password123!';

  let buyerToken = '';
  let buyerUserId = '';
  let adminToken = '';
  let adminUserId = '';

  let applicationId = '';
  let projectId = '';
  let projectSlug = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new CustomValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // Register Buyer
    const buyerRegRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: buyerEmail,
        password: testPassword,
        fullName: 'Test Ərizəçi Alıcı',
      })
      .expect(201);

    buyerToken = buyerRegRes.body.accessToken;
    buyerUserId = buyerRegRes.body.user._id || buyerRegRes.body.user.id;

    // Login default Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@feedlab.az',
        password: 'Admin123!',
      });

    if (adminLoginRes.status === 200) {
      adminToken = adminLoginRes.body.accessToken;
      adminUserId = adminLoginRes.body.user._id || adminLoginRes.body.user.id;
    } else {
      // If default admin not yet seeded or different password, register an admin user
      const adminRegRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: testPassword,
          fullName: 'Baş Platform Admin',
        })
        .expect(201);

      adminToken = adminRegRes.body.accessToken;
      adminUserId = adminRegRes.body.user._id || adminRegRes.body.user.id;

      // Promote to ADMIN directly via DB
      const { getModelToken } = await import('@nestjs/mongoose');
      const userModel = app.get(getModelToken('User'));
      await userModel.findByIdAndUpdate(adminUserId, { role: 'ADMIN' });

      // Refresh admin token
      const reLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: testPassword,
        })
        .expect(200);

      adminToken = reLogin.body.accessToken;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // =========================================================================
  // Feature 10: Author Application Submission
  // =========================================================================
  describe('Feature 10: Author Application Submission', () => {
    it('POST /api/v1/authors/apply submits an application (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/authors/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          fullName: 'Test Ərizəçi Alıcı',
          bio: 'Mikrokontrollerlər və robototexnika sahəsində 4 illik mühəndislik təcrübəsi.',
          skills: ['Arduino', 'ESP32', 'C++', 'Altium Designer'],
          portfolioUrl: 'https://github.com/test-author/projects',
        })
        .expect(201);

      expect(res.body).toHaveProperty('status', 'PENDING');
      applicationId = res.body._id || res.body.id;
      expect(applicationId).toBeDefined();
    });

    it('POST /api/v1/authors/apply returns 400 for duplicate pending application', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/authors/apply')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          bio: 'Təkrar müraciət cəhdi',
          skills: ['Arduino'],
        })
        .expect(400);

      expect(res.body.message).toContain('artıq baxılmaqda olan müraciətiniz var');
    });

    it('POST /api/v1/authors/apply returns 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/authors/apply')
        .send({
          bio: 'Anonim müraciət',
          skills: ['Arduino'],
        })
        .expect(401);
    });
  });

  // =========================================================================
  // Feature 11: Author Application Review
  // =========================================================================
  describe('Feature 11: Author Application Review', () => {
    it('GET /api/v1/admin/author-applications lists pending applications for admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/author-applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find(
        (app: any) => app._id === applicationId || app.id === applicationId,
      );
      expect(found).toBeDefined();
    });

    it('POST /api/v1/admin/author-applications/:id/review approves application and upgrades role to AUTHOR (200)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/author-applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
          adminNotes: 'Bacarıqlar və portfel yoxlanıldı, təsdiqləndi',
        })
        .expect(200);

      expect(res.body.status).toBe('APPROVED');

      // Re-login buyer to get refreshed token with AUTHOR role
      const reLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: buyerEmail,
          password: testPassword,
        })
        .expect(200);

      expect(reLogin.body.user.role).toBe('AUTHOR');
      buyerToken = reLogin.body.accessToken;
    });

    it('Non-admin receiving 403 Forbidden on review endpoint', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/author-applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ action: 'APPROVE' })
        .expect(403);
    });
  });

  // =========================================================================
  // Feature 12: Author Dashboard Overview
  // =========================================================================
  describe('Feature 12: Author Dashboard Overview', () => {
    it('GET /api/v1/authors/dashboard returns balance in AZN and metrics (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/authors/dashboard')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('balance');
      expect(res.body.balance).toHaveProperty('currency', 'AZN');
      expect(res.body.balance).toHaveProperty('availableBalance');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('projects');
    });

    it('GET /api/v1/authors/my-projects returns paginated projects list (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/authors/my-projects')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // Feature 13: Project Draft Creation & Editing
  // =========================================================================
  describe('Feature 13: Project Draft Creation & Editing', () => {
    it('POST /api/v1/projects creates a draft project (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Ağıllı İstixana İqlim Tənzimləyicisi',
          shortDescription: 'ESP32 və DHT22 ilə avtomatlaşdırılmış mikroiqlim idarəetmə sistemi.',
          fullDescription: 'Layihə tam mühəndislik sənədləri, PCB sxemi və mikroproqram təminatı ilə təchiz olunub.',
          objectives: ['Temperatur və rütubətin tənzimlənməsi', 'Avtomatik ventilyasiya'],
          workingPrinciple: 'Sensor göstəricilərinə əsasən relelərin idarə edilməsi.',
          components: [
            { name: 'ESP32 NodeMCU', quantity: 1, estimatedCostAzn: 12 },
            { name: 'DHT22 Sensor', quantity: 2, estimatedCostAzn: 8 },
          ],
          installationGuide: '1. Sxemi quraşdırın. 2. Kodu ESP32-yə yükləyin.',
          hardwareRequirements: 'ESP32, 5V enerji təchizatı',
          systemRequirements: 'Arduino IDE 2.0+',
          price: 35.0,
        })
        .expect(201);

      expect(res.body).toHaveProperty('status', 'DRAFT');
      expect(res.body).toHaveProperty('slug');
      expect(res.body.slug).toContain('agilli');
      expect(res.body.price).toBe(35);

      projectId = res.body._id || res.body.id;
      projectSlug = res.body.slug;
      expect(projectId).toBeDefined();
    });

    it('PUT /api/v1/projects/:id updates draft project (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Ağıllı İstixana İqlim Tənzimləyicisi V2',
          price: 40.0,
        })
        .expect(200);

      expect(res.body.title).toBe('Ağıllı İstixana İqlim Tənzimləyicisi V2');
      expect(res.body.price).toBe(40.0);
    });

    it('Author can view draft project via GET /api/v1/projects/:slug (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body._id || res.body.id).toBe(projectId);
      expect(res.body.status).toBe('DRAFT');
    });

    it('Unauthenticated user receives 404 on draft project GET /api/v1/projects/:slug', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .expect(404);
    });
  });

  // =========================================================================
  // Feature 14: Project Asset Upload
  // =========================================================================
  describe('Feature 14: Project Asset Upload', () => {
    let uploadedFileId = '';

    it('POST /api/v1/projects/:id/files uploads archive file (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .attach('file', Buffer.from('mock zip data content'), 'smart_greenhouse_firmware.zip')
        .expect(201);

      expect(res.body).toHaveProperty('fileId');
      expect(res.body.originalName).toBe('smart_greenhouse_firmware.zip');
      uploadedFileId = res.body.fileId;
    });

    it('POST /api/v1/projects/:id/files rejects disallowed executable files (415)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .attach('file', Buffer.from('mock exe content'), 'malicious.exe')
        .expect(415);

      expect(res.body.message).toContain('Yalnız icazə verilən fayl formatları qəbul edilir');
    });
  });

  // =========================================================================
  // Feature 15: Project Submission for Review
  // =========================================================================
  describe('Feature 15: Project Submission for Review', () => {
    it('POST /api/v1/projects/:id/submit transitions project to SUBMITTED (200)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/submit`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.status).toBe('SUBMITTED');
    });
  });

  // =========================================================================
  // Feature 17 & 18: Review Queue, Rejection & Approval
  // =========================================================================
  describe('Feature 17 & 18: Admin Review Queue & Moderation', () => {
    it('GET /api/v1/admin/projects/queue lists submitted project (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/projects/queue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      const found = res.body.data.find((p: any) => (p._id || p.id) === projectId);
      expect(found).toBeDefined();
      expect(found.status).toBe('SUBMITTED');
    });

    it('POST /api/v1/admin/projects/:id/review rejects without reason with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'REJECT' })
        .expect(400);

      expect(res.body.message).toContain('Rədd edilmə səbəbi qeyd olunmalıdır');
    });

    it('POST /api/v1/admin/projects/:id/review rejects with reason (200)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'REJECT',
          rejectionReason: 'Dövrə sxemində enerji blokunun qoruyucu relesi aydın göstərilməyib.',
        })
        .expect(200);

      expect(res.body.status).toBe('REJECTED');
      expect(res.body.rejectionReason).toContain('enerji blokunun qoruyucu relesi');
    });

    it('Author re-submits rejected project after editing (200)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ shortDescription: 'Düzəliş edilmiş qısa təsvir' })
        .expect(200);

      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/submit`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(submitRes.body.status).toBe('SUBMITTED');
    });

    it('Admin approves project, status transitions to APPROVED (200)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'APPROVE' })
        .expect(200);

      expect(res.body.status).toBe('APPROVED');

      // Now project is publicly queryable in catalog without token
      const publicRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${res.body.slug || projectSlug}`)
        .expect(200);

      expect(publicRes.body.status).toBe('APPROVED');
    });
  });

  // =========================================================================
  // Feature 16: Admin Dashboard Metrics
  // =========================================================================
  describe('Feature 16: Admin Dashboard Metrics', () => {
    it('GET /api/v1/admin/metrics returns real platform stats (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('totalAuthors');
      expect(res.body).toHaveProperty('totalProjects');
      expect(res.body).toHaveProperty('totalRevenueAZN');
      expect(res.body).toHaveProperty('platformCommissionAZN');
      expect(res.body.totalUsers).toBeGreaterThan(0);
      expect(res.body.totalAuthors).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Feature 19: User & Author Management
  // =========================================================================
  describe('Feature 19: User & Author Management', () => {
    it('GET /api/v1/admin/users lists all users with pagination (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('PATCH /api/v1/admin/users/:id/role updates user role (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${buyerUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MODERATOR' })
        .expect(200);

      expect(res.body.role).toBe('MODERATOR');
    });

    it('PATCH /api/v1/admin/users/:id/role rejects invalid role (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${buyerUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'SUPER_HERO' })
        .expect(400);
    });

    it('PATCH /api/v1/admin/users/:id/status toggles user active status (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${buyerUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Re-activate
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${buyerUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);
    });
  });
});
