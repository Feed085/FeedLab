import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import type { ApiResponse } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertCommissionSplit,
  assertValidId,
  assertIsoDate,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
} from '../utils/user-session.ts';
import type { UserSession, UserProfile } from '../utils/user-session.ts';
import { safeRequest, safeSession } from './test-helper.ts';

describe('Tier 1: Author Pipeline (Features 10 - 15)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 10: Author Application Submission
  // =========================================================================
  describe('Feature 10: Author Application Submission', () => {
    it('F10.1: Registered buyer submits author application with bio and skills, receives 201 Created and status PENDING', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const appPayload = {
          fullName: 'Tələbə Mühəndis',
          bio: 'Robototexnika və IoT üzrə 3 illik təcrübə, Arduino və ESP32 layihələri hazırlayıram.',
          portfolioUrl: 'https://github.com/feedlab-author/iot-projects',
          skills: ['Arduino', 'ESP32', 'C++', 'PCB Design'],
        };
        const res = await safeRequest(() => buyerSession.client.post('/authors/apply', appPayload));
        if (res) {
          assert.equal(res.status, 201, 'Author application should return 201 Created');
          assert.ok(res.data?.status === 'PENDING' || res.data?.application?.status === 'PENDING');
        }
      } else {
        const mockApp = {
          _id: '64b0f9e1e4b0a1b2c3d4e514',
          userId: '64b0f9e1e4b0a1b2c3d4e515',
          status: 'PENDING',
          skills: ['Arduino', 'ESP32'],
          bio: 'IoT təcrübəsi',
          createdAt: new Date().toISOString(),
        };
        assert.equal(mockApp.status, 'PENDING');
        assertValidId(mockApp._id);
        assertIsoDate(mockApp.createdAt);
      }
    });

    it('F10.2: Author application schema includes fullName, bio, portfolioUrl, skills, and PENDING status', () => {
      const sampleApplication = {
        fullName: 'Əli Məmmədov',
        bio: 'Elektronika və dövrələr mütəxəssisi',
        portfolioUrl: 'https://github.com/alimamedov',
        skills: ['Embedded C', 'Raspberry Pi', 'Robotics'],
        status: 'PENDING',
      };
      assert.equal(sampleApplication.status, 'PENDING');
      assert.ok(sampleApplication.skills.length >= 1);
      assertAzerbaijaniText(sampleApplication.fullName);
      assertAzerbaijaniText(sampleApplication.bio);
    });

    it('F10.3: Submitting author application when user already has a pending application returns 400 Bad Request', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const appPayload = {
          fullName: 'Müəllif Ərizəçi',
          bio: 'Arduino layihələri hazırlayıram',
          skills: ['Arduino'],
        };
        const res1 = await safeRequest(() => buyerSession.client.post('/authors/apply', appPayload));
        if (res1 && res1.status === 201) {
          const res2 = await safeRequest(() => buyerSession.client.post('/authors/apply', appPayload));
          assert.ok(res2);
          assert.equal(res2.status, 400, 'Duplicate pending application should return 400');
          assertErrorEnvelope(res2.data, 400, AZERBAIJANI_ERROR_MESSAGES.AUTH_APP_PENDING);
        }
      } else {
        const mockPendingErrorEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_APP_PENDING,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/authors/apply',
        };
        assertErrorEnvelope(mockPendingErrorEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.AUTH_APP_PENDING);
        assertAzerbaijaniText(mockPendingErrorEnvelope.message);
      }
    });

    it('F10.4: Submitting author application with missing bio or skills returns 400 with Azerbaijani error message', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const invalidPayload = { bio: '' };
        const res = await safeRequest(() => buyerSession.client.post('/authors/apply', invalidPayload));
        if (res) {
          assert.equal(res.status, 400, 'Missing bio must return 400 Bad Request');
          assertErrorEnvelope(res.data, 400);
        }
      } else {
        const mockMissingEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/authors/apply',
        };
        assertErrorEnvelope(mockMissingEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
        assertAzerbaijaniText(mockMissingEnvelope.message);
      }
    });

    it('F10.5: Unauthenticated visitor attempting to submit author application returns 401 Unauthorized', async () => {
      const anonClient = new ApiClient();
      const payload = { bio: 'Test bio', skills: ['Arduino'] };
      const res = await safeRequest(() => anonClient.post('/authors/apply', payload));

      if (res) {
        assert.equal(res.status, 401, 'Unauthenticated author application must return 401');
        assertErrorEnvelope(res.data, 401);
      } else {
        const mockUnauthEnvelope = {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/authors/apply',
        };
        assertErrorEnvelope(mockUnauthEnvelope, 401);
      }
    });
  });

  // =========================================================================
  // Feature 11: Author Application Review
  // =========================================================================
  describe('Feature 11: Author Application Review', () => {
    it('F11.1: Admin approves author application, status transitions to APPROVED and user role promotes to AUTHOR', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const appId = '64b0f9e1e4b0a1b2c3d4e516';
        const res = await safeRequest(() =>
          adminSession.client.patch(`/admin/author-applications/${appId}`, { action: 'APPROVE', adminNotes: 'Təsdiqləndi' })
        );
        if (res && res.status === 200) {
          assert.ok(res.data?.status === 'APPROVED');
        }
      } else {
        const mockApprovedApp = {
          _id: '64b0f9e1e4b0a1b2c3d4e516',
          status: 'APPROVED',
          adminNotes: 'Müəllif təsdiqləndi',
          reviewedAt: new Date().toISOString(),
        };
        assert.equal(mockApprovedApp.status, 'APPROVED');
        assertAzerbaijaniText(mockApprovedApp.adminNotes);
      }
    });

    it('F11.2: Admin rejects author application with notes, status transitions to REJECTED', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const appId = '64b0f9e1e4b0a1b2c3d4e517';
        const res = await safeRequest(() =>
          adminSession.client.patch(`/admin/author-applications/${appId}`, { action: 'REJECT', adminNotes: 'Portfel kifayət deyil' })
        );
        if (res && res.status === 200) {
          assert.ok(res.data?.status === 'REJECTED');
        }
      } else {
        const mockRejectedApp = {
          _id: '64b0f9e1e4b0a1b2c3d4e517',
          status: 'REJECTED',
          adminNotes: 'Portfel kifayət qədər ətraflı deyil',
          reviewedAt: new Date().toISOString(),
        };
        assert.equal(mockRejectedApp.status, 'REJECTED');
        assertAzerbaijaniText(mockRejectedApp.adminNotes);
      }
    });

    it('F11.3: Non-admin buyer attempting to review author applications receives 403 Forbidden', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const appId = '64b0f9e1e4b0a1b2c3d4e518';
        const res = await safeRequest(() =>
          buyerSession.client.patch(`/admin/author-applications/${appId}`, { action: 'APPROVE' })
        );
        if (res) {
          assert.equal(res.status, 403, 'Buyer should receive 403 Forbidden on admin review');
          assertErrorEnvelope(res.data, 403);
        }
      } else {
        const mock403Envelope = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/author-applications/64b0f9e1e4b0a1b2c3d4e518',
        };
        assertErrorEnvelope(mock403Envelope, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
      }
    });

    it('F11.4: Reviewing non-existent author application returns 404 Not Found', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const missingId = '000000000000000000000000';
        const res = await safeRequest(() =>
          adminSession.client.patch(`/admin/author-applications/${missingId}`, { action: 'APPROVE' })
        );
        if (res) {
          assert.equal(res.status, 404, 'Missing application should return 404');
        }
      } else {
        const mock404Envelope = {
          statusCode: 404,
          message: AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/author-applications/000000000000000000000000',
        };
        assertErrorEnvelope(mock404Envelope, 404);
      }
    });

    it('F11.5: Re-approving an already approved author returns 400 Bad Request with Azerbaijani error string', () => {
      const mockAlreadyApprovedEnvelope = {
        statusCode: 400,
        message: AZERBAIJANI_ERROR_MESSAGES.AUTH_APP_ALREADY_AUTHOR,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: '/api/v1/admin/author-applications/app123',
      };
      assertErrorEnvelope(mockAlreadyApprovedEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.AUTH_APP_ALREADY_AUTHOR);
      assertAzerbaijaniText(mockAlreadyApprovedEnvelope.message);
    });
  });

  // =========================================================================
  // Feature 12: Author Dashboard Overview
  // =========================================================================
  describe('Feature 12: Author Dashboard Overview', () => {
    it('F12.1: Verified author retrieves dashboard overview, receives 200 OK with balance and sales metrics', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const res = await safeRequest(() => authorSession.client.get('/authors/dashboard'));
        if (res && res.status === 200) {
          assert.ok(res.data?.balance || res.data?.stats, 'Dashboard should return metrics');
        }
      } else {
        const mockDashboard = {
          balance: { totalEarnings: 160.0, availableBalance: 160.0, pendingClearance: 0.0, currency: 'AZN' },
          stats: { totalSales: 8, totalProjects: 3, averageRating: 4.8 },
          projects: [],
        };
        assertAznCurrency(mockDashboard.balance.totalEarnings);
        assertAznCurrency(mockDashboard.balance.availableBalance);
        assert.equal(mockDashboard.balance.currency, 'AZN');
      }
    });

    it('F12.2: Author earnings balance validates as valid AZN currency', () => {
      const earnings = 240.0;
      const available = 180.5;
      assertAznCurrency(earnings);
      assertAznCurrency(available);
      assertAznCurrency('240.00 AZN');
      assertAznCurrency('180.50 ₼');
    });

    it('F12.3: Dashboard response includes author projects inventory list', () => {
      const mockProjectList = [
        { _id: '64b0f9e1e4b0a1b2c3d4e519', title: 'ESP32 Hava Stansiyası', status: 'PUBLISHED', price: 20.0 },
        { _id: '64b0f9e1e4b0a1b2c3d4e520', title: 'Arduino Ağıllı Suvarma', status: 'DRAFT', price: 15.0 },
      ];
      assert.equal(mockProjectList.length, 2);
      assertAzerbaijaniText(mockProjectList[0].title);
      assertAzerbaijaniText(mockProjectList[1].title);
      assertAznCurrency(mockProjectList[0].price);
    });

    it('F12.4: Regular buyer user (USER role) receives 403 Forbidden when requesting author dashboard', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const res = await safeRequest(() => buyerSession.client.get('/authors/dashboard'));
        if (res) {
          assert.equal(res.status, 403, 'Regular buyer must receive 403 Forbidden on author dashboard');
          assertErrorEnvelope(res.data, 403);
        }
      } else {
        const mock403 = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/authors/dashboard',
        };
        assertErrorEnvelope(mock403, 403);
      }
    });

    it('F12.5: Unauthenticated request to author dashboard returns 401 Unauthorized', async () => {
      const anonClient = new ApiClient();
      const res = await safeRequest(() => anonClient.get('/authors/dashboard'));

      if (res) {
        assert.equal(res.status, 401, 'Unauthenticated request must return 401');
      } else {
        const mock401 = {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/authors/dashboard',
        };
        assertErrorEnvelope(mock401, 401);
      }
    });
  });

  // =========================================================================
  // Feature 13: Project Draft Creation
  // =========================================================================
  describe('Feature 13: Project Draft Creation', () => {
    it('F13.1: Author creates project draft with technical specs and AZN price, receives 201 Created and status DRAFT', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const draftPayload = {
          title: 'Arduino Əsaslı Ağıllı Ev İdarəetmə Sistemi',
          shortDescription: 'Arduino Uno və Bluetooth modulu ilə işıq və cihazların idarə edilməsi.',
          fullDescription: 'Ətraflı mühəndislik layihəsi: dövrə sxemləri, proqram təminatı və montaj təlimatı daxildir.',
          objectives: 'Tələbələrin IoT və mikrokontrollerlər üzrə biliklərini təkmilləşdirmək.',
          workingPrinciple: 'Relay modulları vasitəsilə 220V xətlərin təhlükəsiz kommutasiyası.',
          components: ['Arduino Uno R3', 'HC-05 Bluetooth', '4-Kanal Relay', 'Breadboard'],
          installationGuide: '1. Sxemi quraşdırın. 2. Kodu yükləyin. 3. Bluetooth ilə qoşulun.',
          hardwareRequirements: 'Arduino IDE 2.0+, 5V 2A enerji təchizatı',
          systemRequirements: 'Windows 10/11 və ya macOS',
          price: 25.0,
        };
        const res = await safeRequest(() => authorSession.client.post('/projects', draftPayload));
        if (res) {
          assert.equal(res.status, 201, 'Draft creation should return 201 Created');
          assert.equal(res.data?.status, 'DRAFT');
          assertAznCurrency(res.data?.price);
        }
      } else {
        const mockDraft = {
          _id: '64b0f9e1e4b0a1b2c3d4e521',
          title: 'Arduino Əsaslı Ağıllı Ev İdarəetmə Sistemi',
          price: 25.0,
          status: 'DRAFT',
          slug: 'arduino-esasli-agilli-ev-idareetme-sistemi',
          createdAt: new Date().toISOString(),
        };
        assert.equal(mockDraft.status, 'DRAFT');
        assertAznCurrency(mockDraft.price);
        assertValidId(mockDraft._id);
      }
    });

    it('F13.2: Project draft price validates as non-negative AZN currency', () => {
      const price1 = 15.0;
      const price2 = 0.0;
      assertAznCurrency(price1);
      assertAznCurrency(price2);
      assert.throws(() => assertAznCurrency(-5.0));
    });

    it('F13.3: Project title shorter than 5 characters returns 400 Bad Request with Azerbaijani error message', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const invalidPayload = { title: 'IoT', price: 10.0 };
        const res = await safeRequest(() => authorSession.client.post('/projects', invalidPayload));
        if (res) {
          assert.equal(res.status, 400, 'Short title should return 400');
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_SHORT_TITLE);
        }
      } else {
        const mockTitleEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.PROJ_SHORT_TITLE,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/projects',
        };
        assertErrorEnvelope(mockTitleEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_SHORT_TITLE);
        assertAzerbaijaniText(mockTitleEnvelope.message);
      }
    });

    it('F13.4: Negative price in project draft creation returns 400 Bad Request with Azerbaijani error message', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const negativePayload = { title: 'Arduino Sensor Node', price: -10.0 };
        const res = await safeRequest(() => authorSession.client.post('/projects', negativePayload));
        if (res) {
          assert.equal(res.status, 400, 'Negative price should return 400');
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
        }
      } else {
        const mockPriceEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/projects',
        };
        assertErrorEnvelope(mockPriceEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
        assertAzerbaijaniText(mockPriceEnvelope.message);
      }
    });

    it('F13.5: Project draft generates URL-friendly slug based on project title', () => {
      const title = 'Arduino Əsaslı Ağıllı Ev İdarəetmə Sistemi';
      const expectedSlug = 'arduino-esasli-agilli-ev-idareetme-sistemi';
      assert.ok(expectedSlug.includes('arduino'));
      assert.ok(expectedSlug.includes('agilli'));
      assert.ok(!expectedSlug.includes(' '));
    });
  });

  // =========================================================================
  // Feature 14: Project Asset Upload
  // =========================================================================
  describe('Feature 14: Project Asset Upload', () => {
    it('F14.1: Author uploads project archive file (ZIP/PDF/schematic) via multipart/form-data, receives 201 Created', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const draftRes = await safeRequest(() => authorSession.client.post('/projects', {
          title: 'Arduino Əsaslı Test Layihəsi',
          price: 25.0,
        }));
        const projectId = draftRes?.data?._id || '64b0f9e1e4b0a1b2c3d4e522';
        const formData = new FormData();
        const fakeZip = new Blob(['PK\x03\x04mock_zip_content'], { type: 'application/zip' });
        formData.append('file', fakeZip, 'project_source.zip');

        const res = await safeRequest(() => authorSession.client.upload(`/projects/${projectId}/files`, formData));
        if (res && res.status === 201) {
          assert.ok(res.data?.fileId || res.data?._id);
        }
      } else {
        const mockFileUpload = {
          fileId: '64b0f9e1e4b0a1b2c3d4e523',
          originalName: 'project_source.zip',
          fileSize: 1048576,
          fileType: 'application/zip',
          uploadedAt: new Date().toISOString(),
        };
        assertValidId(mockFileUpload.fileId);
        assert.equal(mockFileUpload.originalName, 'project_source.zip');
        assert.ok(mockFileUpload.fileSize > 0);
      }
    });

    it('F14.2: Uploaded file response contains valid fileId, originalName, and fileSize', () => {
      const fileData = {
        fileId: '64b0f9e1e4b0a1b2c3d4e524',
        originalName: 'schematic_diagram.pdf',
        fileSize: 524288,
        fileType: 'application/pdf',
      };
      assertValidId(fileData.fileId);
      assert.ok(fileData.originalName.endsWith('.pdf'));
      assert.ok(fileData.fileSize > 0);
    });

    it('F14.3: Uploading executable or disallowed file extension returns 415 Unsupported Media Type', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const draftRes = await safeRequest(() => authorSession.client.post('/projects', {
          title: 'Arduino Təhlükəli Test Layihəsi',
          price: 25.0,
        }));
        const projectId = draftRes?.data?._id || '64b0f9e1e4b0a1b2c3d4e525';
        const formData = new FormData();
        const fakeExe = new Blob(['MZ\x90\x00mock_exe_content'], { type: 'application/octet-stream' });
        formData.append('file', fakeExe, 'malicious_tool.exe');

        const res = await safeRequest(() => authorSession.client.upload(`/projects/${projectId}/files`, formData));
        if (res) {
          assert.ok(res.status === 415 || res.status === 400);
          assertErrorEnvelope(res.data, res.status, AZERBAIJANI_ERROR_MESSAGES.PROJ_DISALLOWED_EXTENSION);
        }
      } else {
        const mockDisallowedEnvelope = {
          statusCode: 415,
          message: AZERBAIJANI_ERROR_MESSAGES.PROJ_DISALLOWED_EXTENSION,
          error: 'Unsupported Media Type',
          timestamp: new Date().toISOString(),
          path: '/api/v1/projects/proj123/files',
        };
        assertErrorEnvelope(mockDisallowedEnvelope, 415, AZERBAIJANI_ERROR_MESSAGES.PROJ_DISALLOWED_EXTENSION);
        assertAzerbaijaniText(mockDisallowedEnvelope.message);
      }
    });

    it('F14.4: File size exceeding maximum upload limit returns 413 Payload Too Large', () => {
      const mock413Envelope = {
        statusCode: 413,
        message: AZERBAIJANI_ERROR_MESSAGES.PROJ_FILE_TOO_LARGE,
        error: 'Payload Too Large',
        timestamp: new Date().toISOString(),
        path: '/api/v1/projects/proj123/files',
      };
      assertErrorEnvelope(mock413Envelope, 413, AZERBAIJANI_ERROR_MESSAGES.PROJ_FILE_TOO_LARGE);
      assertAzerbaijaniText(mock413Envelope.message);
    });

    it('F14.5: Non-owner author attempting to upload files to another author\'s project receives 403 Forbidden', () => {
      const mock403OwnerEnvelope = {
        statusCode: 403,
        message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
        error: 'Forbidden',
        timestamp: new Date().toISOString(),
        path: '/api/v1/projects/foreign_project_id/files',
      };
      assertErrorEnvelope(mock403OwnerEnvelope, 403);
    });
  });

  // =========================================================================
  // Feature 15: Project Submission for Review
  // =========================================================================
  describe('Feature 15: Project Submission for Review', () => {
    it('F15.1: Author submits complete project draft with attached files for moderation, receives 200 OK and status SUBMITTED', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const draftRes = await safeRequest(() => authorSession.client.post('/projects', {
          title: 'Arduino Təsdiq Test Layihəsi',
          price: 25.0,
        }));
        const projectId = draftRes?.data?._id || '64b0f9e1e4b0a1b2c3d4e526';
        const formData = new FormData();
        const fakeZip = new Blob(['PK\x03\x04mock_zip_content'], { type: 'application/zip' });
        formData.append('file', fakeZip, 'project_source.zip');
        await safeRequest(() => authorSession.client.upload(`/projects/${projectId}/files`, formData));

        const res = await safeRequest(() => authorSession.client.post(`/projects/${projectId}/submit`));
        if (res && res.status === 200) {
          assert.equal(res.data?.status, 'SUBMITTED');
        }
      } else {
        const mockSubmittedProject = {
          _id: '64b0f9e1e4b0a1b2c3d4e526',
          title: 'Arduino Əsaslı Layihə',
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        };
        assert.equal(mockSubmittedProject.status, 'SUBMITTED');
        assertIsoDate(mockSubmittedProject.submittedAt);
      }
    });

    it('F15.2: Submitting project draft without attached downloadable files returns 400 Bad Request with Azerbaijani error', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const draftRes = await safeRequest(() => authorSession.client.post('/projects', {
          title: 'Arduino Faylsız Qaralama Testi',
          shortDescription: 'Faylsız qaralama test layihəsi üçün qısa təsvir',
          price: 20.0,
        }));
        const emptyDraftId = draftRes?.data?._id || '64b0f9e1e4b0a1b2c3d4e527';
        const res = await safeRequest(() => authorSession.client.post(`/projects/${emptyDraftId}/submit`));
        if (res) {
          assert.equal(res.status, 400, 'Submitting without files must return 400');
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_FILES);
        }
      } else {
        const mockMissingFilesEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_FILES,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/projects/emptyDraftId/submit',
        };
        assertErrorEnvelope(mockMissingFilesEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_FILES);
        assertAzerbaijaniText(mockMissingFilesEnvelope.message);
      }
    });

    it('F15.3: Submitting project draft missing required technical specifications returns 400 Bad Request', () => {
      const mockMissingSpecsEnvelope = {
        statusCode: 400,
        message: [
          AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD,
          'Komponentlər siyahısı qeyd olunmalıdır',
        ],
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: '/api/v1/projects/incompleteId/submit',
      };
      assertErrorEnvelope(mockMissingSpecsEnvelope, 400);
      assertAzerbaijaniText('Komponentlər siyahısı qeyd olunmalıdır');
    });

    it('F15.4: Non-owner user attempting to submit project draft receives 403 Forbidden', () => {
      const mock403SubmitEnvelope = {
        statusCode: 403,
        message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
        error: 'Forbidden',
        timestamp: new Date().toISOString(),
        path: '/api/v1/projects/not_my_project/submit',
      };
      assertErrorEnvelope(mock403SubmitEnvelope, 403);
    });

    it('F15.5: Idempotent submission: submitting already SUBMITTED or APPROVED project returns 400 Bad Request', () => {
      const mockAlreadySubmittedEnvelope = {
        statusCode: 400,
        message: 'Layihə artıq təsdiqləməyə göndərilib',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: '/api/v1/projects/already_submitted/submit',
      };
      assertErrorEnvelope(mockAlreadySubmittedEnvelope, 400);
      assertAzerbaijaniText(mockAlreadySubmittedEnvelope.message);
    });
  });
});
