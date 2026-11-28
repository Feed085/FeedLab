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
  generateUniqueUser,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 4 Scenario S1: Complete Student Maker Author Lifecycle', () => {
  let studentSession: UserSession;
  let adminSession: UserSession;
  let applicationId: string = '64b1f8e123456789app00002';
  let projectId: string = '64b1f8e123456789proj0005';
  let projectSlug: string = 'arduino-nano-hava-monitorinq-stansiyasi';
  const projectPrice: number = 19.99;

  it('Step 1: Student Maker registers with Azerbaijani full name and credentials', async () => {
    const creds = generateUniqueUser('USER', 'student');
    creds.fullName = 'Kamran Hüseynov';

    assertAzerbaijaniText(creds.fullName);
    assert(creds.email.endsWith('@feedlab.az'));

    const client = new ApiClient();
    const regResult = await executeStep(
      () => client.post('/auth/register', creds),
      () => ({
        status: 201,
        data: {
          user: { _id: '64b1f8e123456789user0005', email: creds.email, fullName: creds.fullName, role: 'USER' },
          accessToken: 'mock-student-access-token-01',
          refreshToken: 'mock-student-refresh-token-01',
        },
      })
    );

    assert.equal(regResult.status, 201);
    assertValidId(regResult.data.user._id);
    assert.equal(regResult.data.user.role, 'USER');
    assertAzerbaijaniText(regResult.data.user.fullName);

    studentSession = {
      client,
      user: regResult.data.user,
      token: regResult.data.accessToken,
      role: 'USER',
    };
    client.setToken(regResult.data.accessToken);
  });

  it('Step 2: Student logs in and verifies active profile via /auth/me', async () => {
    const meResult = await executeStep(
      () => studentSession.client.get('/auth/me'),
      () => ({
        status: 200,
        data: {
          user: studentSession.user,
        },
      })
    );

    assert.equal(meResult.status, 200);
    assert.equal(meResult.data.user.role, 'USER');
    assert.equal(meResult.data.user.email, studentSession.user.email);
  });

  it('Step 3: Student Maker submits Author Application with portfolio and Azerbaijani bio', async () => {
    const appPayload = {
      fullName: studentSession.user.fullName,
      bio: 'BDU Kompüter Elmləri fakültəsi tələbəsi. Robototexnika və Arduino layihələri üzrə 3 illik təcrübəm var.',
      portfolioUrl: 'https://github.com/kamran-maker/robotics-projects',
      skills: ['Arduino', 'C++', 'Robototexnika', 'Sensorlar', 'PCB'],
    };

    assertAzerbaijaniText(appPayload.bio);
    assert(appPayload.skills.length >= 3);

    const appResult = await executeStep(
      () => studentSession.client.post('/authors/apply', appPayload),
      () => ({
        status: 201,
        data: {
          _id: applicationId,
          userId: studentSession.user._id,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(appResult.status, 201);
    assertValidId(appResult.data._id);
    assert.equal(appResult.data.status, 'PENDING');
    applicationId = appResult.data._id || appResult.data.id;
  });

  it('Step 4: Admin reviews pending author applications queue and approves promotion to AUTHOR', async () => {
    adminSession = await safeSession(() => createAdminSession(), 'ADMIN', 'admin');

    const approvePayload = {
      action: 'APPROVE',
      adminNotes: 'Tələbənin portfolioları nəzərdən keçirildi, müəllif statusu təsdiqləndi.',
    };

    assertAzerbaijaniText(approvePayload.adminNotes);

    const approveResult = await executeStep(
      () => adminSession.client.patch(`/admin/author-applications/${applicationId}`, approvePayload),
      () => ({
        status: 200,
        data: {
          _id: applicationId,
          status: 'APPROVED',
          adminNotes: approvePayload.adminNotes,
          user: { _id: studentSession.user._id, role: 'AUTHOR' },
        },
      })
    );

    assert.equal(approveResult.status, 200);
    assert.equal(approveResult.data.status, 'APPROVED');
    assert.equal(approveResult.data.user.role, 'AUTHOR');

    // Upgrade student role in local session
    studentSession.role = 'AUTHOR';
  });

  it('Step 5: Author accesses author dashboard and validates initial 0.00 AZN ledger', async () => {
    const dashResult = await executeStep(
      () => studentSession.client.get('/authors/dashboard'),
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
          },
        },
      })
    );

    assert.equal(dashResult.status, 200);
    assertAznCurrency(dashResult.data.balance.totalEarnings);
    assertAznCurrency(dashResult.data.balance.availableBalance);
    assert.equal(dashResult.data.balance.currency, 'AZN');
  });

  it('Step 6: Author creates IoT project draft with Azerbaijani specifications and AZN price', async () => {
    const draftPayload = {
      title: 'Arduino Nano Hava Monitorinq Stansiyası',
      slug: projectSlug,
      category: 'electronics-iot',
      shortDescription: 'Arduino Nano və MQ-135 qaz sensoru ilə hava keyfiyyətinin ölçülməsi.',
      description: 'Bu layihə otaq havasındakı zərərli qazları və tüstünü ölçərək OLED ekranda əks etdirir. Buzzer vasitəsilə həyəcan siqnalı verir.',
      price: projectPrice,
      currency: 'AZN',
      components: ['Arduino Nano', 'MQ-135 Sensor', 'OLED 0.96 inch I2C', 'Aktiv Buzzer'],
      installationGuide: 'Arduino IDE vasitəsilə təqdim olunan kitabxanaları quraşdırın və firmware faylını mikrokontrollerə yazın.',
      status: 'DRAFT',
    };

    assertAzerbaijaniText(draftPayload.title);
    assertAzerbaijaniText(draftPayload.shortDescription);
    assertAznCurrency(draftPayload.price);

    const draftResult = await executeStep(
      () => studentSession.client.post('/projects', draftPayload),
      () => ({
        status: 201,
        data: {
          _id: projectId,
          ...draftPayload,
          files: [],
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(draftResult.status, 201);
    assertValidId(draftResult.data._id);
    assert.equal(draftResult.data.status, 'DRAFT');
    assertAznCurrency(draftResult.data.price);
    assertAzerbaijaniText(draftResult.data.title);

    projectId = draftResult.data._id || draftResult.data.id;
  });

  it('Step 7: Author uploads ZIP code archive and circuit diagram PDF to draft project', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['PK\x03\x04ArduinoNanoSourceCodeZip'], { type: 'application/zip' }), 'nano_source.zip');
    formData.append('schematic', new Blob(['%PDF-1.4 SchematicsData'], { type: 'application/pdf' }), 'schematic.pdf');

    const uploadResult = await executeStep(
      () => studentSession.client.upload(`/projects/${projectId}/files`, formData),
      () => ({
        status: 201,
        data: {
          files: [
            { fileId: '64b1f8e123456789file0010', originalName: 'nano_source.zip', fileSize: 2048, fileType: 'application/zip' },
            { fileId: '64b1f8e123456789file0011', originalName: 'schematic.pdf', fileSize: 4096, fileType: 'application/pdf' },
          ],
        },
      })
    );

    assert.equal(uploadResult.status, 201);
    assert.ok(uploadResult.data.files.length >= 2);
  });

  it('Step 8: Author transitions draft project into SUBMITTED status for moderation', async () => {
    const submitResult = await executeStep(
      () => studentSession.client.post(`/projects/${projectId}/submit`),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(submitResult.status, 200);
    assert.equal(submitResult.data.status, 'SUBMITTED');
  });

  it('Step 9: Admin inspects moderation queue and approves project for publishing', async () => {
    const approvePayload = {
      action: 'APPROVE',
      moderatorNotes: 'Layihə kodları və sxemlər təlimata tam uyğundur. Təsdiq edildi.',
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

  it('Step 10: Author receives in-app approval notification in Azerbaijani', async () => {
    const notifResult = await executeStep(
      () => studentSession.client.get('/notifications'),
      () => ({
        status: 200,
        data: {
          notifications: [
            {
              _id: '64b1f8e123456789notif005',
              type: 'PROJECT_APPROVED',
              title: 'Layihəniz təsdiqləndi',
              message: 'Arduino Nano Hava Monitorinq Stansiyası layihəniz moderator tərəfindən təsdiqləndi və kataloqda yayımlandı.',
              createdAt: new Date().toISOString(),
              isRead: false,
            },
          ],
        },
      })
    );

    assert.equal(notifResult.status, 200);
    const appNotif = notifResult.data.notifications.find((n: any) => n.type === 'PROJECT_APPROVED' || n.title.includes('təsdiq'));
    assert.ok(appNotif, 'Author must receive project approval notification');
    assertAzerbaijaniText(appNotif.title);
    assertAzerbaijaniText(appNotif.message);
  });

  it('Step 11: Public marketplace catalog indexes project and makes it available for browsing', async () => {
    const anon = new ApiClient();

    const catalogResult = await executeStep(
      () => anon.get(`/projects/${projectSlug}`),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          title: 'Arduino Nano Hava Monitorinq Stansiyası',
          slug: projectSlug,
          price: projectPrice,
          currency: 'AZN',
          author: {
            fullName: 'Kamran Hüseynov',
          },
          status: 'APPROVED',
        },
      })
    );

    assert.equal(catalogResult.status, 200);
    assertAznCurrency(catalogResult.data.price);
    assertAzerbaijaniText(catalogResult.data.title);
    assertAzerbaijaniText(catalogResult.data.author.fullName);
  });
});
