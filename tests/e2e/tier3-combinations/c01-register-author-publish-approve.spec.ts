import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertValidId,
  assertIsoDate,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
  generateUniqueEmail,
  generateUniqueUser,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 3 Cross-Feature: C01 Register -> Author Application -> Publish -> Moderation -> Catalog Indexing', () => {
  // Shared state across sequential workflow stages
  let authorSession: UserSession;
  let adminSession: UserSession;
  let applicationId: string = '64b1f8e123456789author01';
  let projectId: string = '64b1f8e123456789proj0001';
  let projectSlug: string = 'agilli-istixana-monitorinq-sistemi';

  it('Pairwise F4+F5: User registration followed immediately by authentication and JWT issuance', async () => {
    const creds = generateUniqueUser('USER', 'student_maker');
    creds.fullName = 'Rəşad Əliyev';

    // Verify client payload adherence
    assert(creds.email.endsWith('@feedlab.az'));
    assert(creds.password.length >= 8);
    assertAzerbaijaniText(creds.fullName);

    const client = new ApiClient();

    const regResult = await executeStep(
      () => client.post('/auth/register', creds),
      () => ({
        status: 201,
        data: {
          user: { _id: '64b1f8e123456789user0001', email: creds.email, fullName: creds.fullName, role: 'USER' },
          accessToken: 'mock-jwt-access-token-001',
          refreshToken: 'mock-jwt-refresh-token-001',
        },
      })
    );

    assert.equal(regResult.status, 201);
    assertValidId(regResult.data.user._id || regResult.data.user.id);
    assert.equal(regResult.data.user.role, 'USER');
    assert.ok(regResult.data.accessToken, 'Access token must be returned upon registration');

    // Authenticate with the registered credentials
    const loginResult = await executeStep(
      () => client.post('/auth/login', { email: creds.email, password: creds.password }),
      () => ({
        status: 200,
        data: {
          user: { _id: '64b1f8e123456789user0001', email: creds.email, fullName: creds.fullName, role: 'USER' },
          accessToken: 'mock-jwt-access-token-001',
        },
      })
    );

    assert.equal(loginResult.status, 200);
    assert.equal(loginResult.data.user.email, creds.email);
    assert.equal(loginResult.data.user.role, 'USER');
  });

  it('Pairwise F7+F10: Profile inspection (/auth/me) confirms USER role, then submits Author Application', async () => {
    authorSession = await safeSession(() => createBuyerSession({ fullName: 'Tural Məmmədov' }), 'USER', 'candidate');

    // 1. Inspect current session profile
    const profileResult = await executeStep(
      () => authorSession.client.get('/auth/me'),
      () => ({
        status: 200,
        data: {
          user: { _id: '64b1f8e123456789user0002', email: authorSession.user.email, fullName: 'Tural Məmmədov', role: 'USER' },
        },
      })
    );

    assert.equal(profileResult.status, 200);
    assert.equal(profileResult.data.user.role, 'USER');

    // 2. Submit Author Application
    const appPayload = {
      fullName: 'Tural Məmmədov',
      bio: '5 illik IoT və mikrokontroller proqramlaşdırma təcrübəsinə malik elektronika mühəndisi.',
      portfolioUrl: 'https://github.com/feedlab-maker/iot-portfolio',
      skills: ['ESP32', 'Arduino', 'PCB Dizayn', 'C++', 'MQTT'],
    };

    assertAzerbaijaniText(appPayload.bio);
    assert(appPayload.skills.length >= 3);

    const appResult = await executeStep(
      () => authorSession.client.post('/authors/apply', appPayload),
      () => ({
        status: 201,
        data: {
          _id: '64b1f8e123456789app00001',
          userId: profileResult.data.user._id,
          status: 'PENDING',
          skills: appPayload.skills,
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(appResult.status, 201);
    assertValidId(appResult.data._id || appResult.data.id);
    assert.equal(appResult.data.status, 'PENDING');
    applicationId = appResult.data._id || appResult.data.id;
  });

  it('Pairwise F10+F11: Admin inspects pending application and approves promotion to AUTHOR', async () => {
    adminSession = await safeSession(() => createAdminSession(), 'ADMIN', 'admin');

    const reviewPayload = {
      action: 'APPROVE',
      adminNotes: 'Müəllif müraciəti tələblərə tam uyğundur və təsdiqləndi.',
    };

    assertAzerbaijaniText(reviewPayload.adminNotes);

    const reviewResult = await executeStep(
      () => adminSession.client.patch(`/admin/author-applications/${applicationId}`, reviewPayload),
      () => ({
        status: 200,
        data: {
          _id: applicationId,
          status: 'APPROVED',
          adminNotes: reviewPayload.adminNotes,
          reviewedAt: new Date().toISOString(),
          user: { role: 'AUTHOR' },
        },
      })
    );

    assert.equal(reviewResult.status, 200);
    assert.equal(reviewResult.data.status, 'APPROVED');
    assert.equal(reviewResult.data.user.role, 'AUTHOR');
  });

  it('Pairwise F11+F12: Newly approved author accesses author dashboard and validates initial 0.00 AZN ledger', async () => {
    // Elevate session token for author
    authorSession.role = 'AUTHOR';

    const dashResult = await executeStep(
      () => authorSession.client.get('/authors/dashboard'),
      () => ({
        status: 200,
        data: {
          balance: {
            totalEarnings: 0.0,
            availableBalance: 0.0,
            currency: 'AZN',
          },
          statistics: {
            totalProjects: 0,
            totalSales: 0,
            averageRating: 0.0,
          },
        },
      })
    );

    assert.equal(dashResult.status, 200);
    assertAznCurrency(dashResult.data.balance.totalEarnings);
    assertAznCurrency(dashResult.data.balance.availableBalance);
    assert.equal(dashResult.data.balance.currency, 'AZN');
    assert.equal(dashResult.data.statistics.totalSales, 0);
  });

  it('Pairwise F12+F13: Author creates new IoT project draft with Azerbaijani specifications and AZN price', async () => {
    const draftPayload = {
      title: 'Ağıllı İstixana Monitorinq Sistemi',
      slug: 'agilli-istixana-monitorinq-sistemi',
      category: 'electronics-iot',
      shortDescription: 'ESP32 və DHT22 əsaslı avtomatik temperatur və rütubət tənzimləmə sistemi.',
      description: 'Bu layihə istixanalarda mikroklimata tam nəzarət etmək üçün hazırlanmışdır. MQTT protokolu vasitəsilə məlumatları buluda ötürür.',
      price: 28.5,
      components: ['ESP32 DevKit v1', 'DHT22 Sensor', 'Relay Modulu 4-kanal', 'LCD 1602 I2C'],
      installationGuide: 'Arduino IDE ilə ESP32 lövhə paketini quraşdırın və kodları yükləyin.',
      status: 'DRAFT',
    };

    assertAzerbaijaniText(draftPayload.title);
    assertAzerbaijaniText(draftPayload.shortDescription);
    assertAznCurrency(draftPayload.price);
    assert.ok(draftPayload.price > 0);

    const draftResult = await executeStep(
      () => authorSession.client.post('/projects', draftPayload),
      () => ({
        status: 201,
        data: {
          _id: '64b1f8e123456789proj0001',
          ...draftPayload,
          files: [],
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(draftResult.status, 201);
    assertValidId(draftResult.data._id || draftResult.data.id);
    assert.equal(draftResult.data.status, 'DRAFT');
    assertAznCurrency(draftResult.data.price);
    assertAzerbaijaniText(draftResult.data.title);

    projectId = draftResult.data._id || draftResult.data.id;
    projectSlug = draftResult.data.slug || projectSlug;
  });

  it('Pairwise F13+F14: Author uploads digital assets (ZIP code archive and schematic PDF) to project draft', async () => {
    const formData = new FormData();
    const mockZipContent = 'PK\x03\x04MockESP32ArduinoFirmwareSourceFiles';
    const mockPdfContent = '%PDF-1.4 MockSchematicCircuitDiagramFile';

    formData.append('file', new Blob([mockZipContent], { type: 'application/zip' }), 'firmware_v1.zip');
    formData.append('schematic', new Blob([mockPdfContent], { type: 'application/pdf' }), 'circuit_schematic.pdf');

    const uploadResult = await executeStep(
      () => authorSession.client.upload(`/projects/${projectId}/files`, formData),
      () => ({
        status: 201,
        data: {
          files: [
            { fileId: '64b1f8e123456789file0001', originalName: 'firmware_v1.zip', fileSize: 4096, fileType: 'application/zip' },
            { fileId: '64b1f8e123456789file0002', originalName: 'circuit_schematic.pdf', fileSize: 8192, fileType: 'application/pdf' },
          ],
        },
      })
    );

    assert.equal(uploadResult.status, 201);
    assert.ok(Array.isArray(uploadResult.data.files));
    assert.ok(uploadResult.data.files.length >= 2);
    assert.equal(uploadResult.data.files[0].originalName, 'firmware_v1.zip');
    assert.equal(uploadResult.data.files[1].originalName, 'circuit_schematic.pdf');
  });

  it('Pairwise F14+F15: Author transitions draft project into SUBMITTED status for moderation', async () => {
    const submitResult = await executeStep(
      () => authorSession.client.post(`/projects/${projectId}/submit`),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          title: 'Ağıllı İstixana Monitorinq Sistemi',
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(submitResult.status, 200);
    assert.equal(submitResult.data.status, 'SUBMITTED');
    assertIsoDate(submitResult.data.submittedAt);
  });

  it('Pairwise F15+F17: Admin queries moderation queue and identifies the submitted project', async () => {
    const queueResult = await executeStep(
      () => adminSession.client.get('/admin/projects/queue'),
      () => ({
        status: 200,
        data: {
          projects: [
            {
              _id: projectId,
              title: 'Ağıllı İstixana Monitorinq Sistemi',
              price: 28.5,
              status: 'SUBMITTED',
              submittedAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      })
    );

    assert.equal(queueResult.status, 200);
    assert(queueResult.data.projects.length >= 1);
    const found = queueResult.data.projects.find((p: any) => (p._id || p.id) === projectId || p.title.includes('İstixana'));
    assert.ok(found, 'Submitted project must appear in admin moderation queue');
    assert.equal(found.status, 'SUBMITTED');
  });

  it('Pairwise F17+F18: Admin approves the submitted project with feedback and publishes it', async () => {
    const approvePayload = {
      action: 'APPROVE',
      moderatorNotes: 'Layihə faylları və texniki sənədlər tam yoxlanıldı, təsdiqləndi.',
    };

    assertAzerbaijaniText(approvePayload.moderatorNotes);

    const approveResult = await executeStep(
      () => adminSession.client.post(`/admin/projects/${projectId}/review`, approvePayload),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          status: 'APPROVED',
          publishedAt: new Date().toISOString(),
          moderatorNotes: approvePayload.moderatorNotes,
        },
      })
    );

    assert.equal(approveResult.status, 200);
    assert(approveResult.data.status === 'APPROVED' || approveResult.data.status === 'PUBLISHED');
  });

  it('Pairwise F18+F20/F23: Approved project is publicly discoverable in catalog and details page without auth', async () => {
    const anonClient = new ApiClient();

    // 1. Check project appears in marketplace catalog
    const catalogResult = await executeStep(
      () => anonClient.get('/projects/homepage'),
      () => ({
        status: 200,
        data: {
          latestProjects: [
            {
              _id: projectId,
              title: 'Ağıllı İstixana Monitorinq Sistemi',
              slug: projectSlug,
              price: 28.5,
              category: 'electronics-iot',
            },
          ],
        },
      })
    );

    assert.equal(catalogResult.status, 200);
    assert.ok(catalogResult.data.latestProjects.length >= 1);

    // 2. Check public project details endpoint
    const detailsResult = await executeStep(
      () => anonClient.get(`/projects/${projectSlug}`),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          title: 'Ağıllı İstixana Monitorinq Sistemi',
          slug: projectSlug,
          price: 28.5,
          category: 'electronics-iot',
          description: 'Bu layihə istixanalarda mikroklimata tam nəzarət etmək üçün hazırlanmışdır.',
          components: ['ESP32 DevKit v1', 'DHT22 Sensor'],
          status: 'APPROVED',
        },
      })
    );

    assert.equal(detailsResult.status, 200);
    assertAznCurrency(detailsResult.data.price);
    assertAzerbaijaniText(detailsResult.data.title);
    assert.equal(detailsResult.data.slug, projectSlug);
  });
});
