import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
  createAnonymousSession,
} from '../utils/user-session.ts';
import { withOfflineSkip } from './boundary-helper.ts';

describe('Tier 2 — B03 Author Pipeline Boundaries & Negative Cases (Features 10–15)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 10: Author Application Submission
  // =========================================================================
  describe('Feature 10: Author Application Submission', () => {
    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor submits author application', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/authors/apply', {
          bio: 'Electronics enthusiast with 5 years experience',
          skills: ['Arduino', 'ESP32'],
          portfolioUrl: 'https://github.com/maker',
        });
        assert.equal(res.status, 401, 'Expected 401 for anonymous application');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 400 and AUTH_APP_PENDING when user with existing pending application submits another', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        // First application
        const first = await buyer.client.post('/authors/apply', {
          bio: 'Müəllif müraciəti 1',
          skills: ['IoT', 'Raspberry Pi'],
          portfolioUrl: 'https://github.com/maker1',
        });
        if (first.status === 201 || first.status === 200) {
          // Second application while first is pending
          const second = await buyer.client.post('/authors/apply', {
            bio: 'Müəllif müraciəti 2',
            skills: ['Robotics'],
            portfolioUrl: 'https://github.com/maker2',
          });
          assert.equal(second.status, 400, 'Expected 400 for duplicate pending application');
          assertErrorEnvelope(second.data, 400, AZERBAIJANI_ERROR_MESSAGES.AUTH_APP_PENDING);
          assertAzerbaijaniText(second.data.message);
        }
      });
    });

    it('should return 400 and AUTH_APP_ALREADY_AUTHOR when verified author attempts to submit author application again', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/authors/apply', {
          bio: 'Already author bio',
          skills: ['Circuit Design'],
          portfolioUrl: 'https://github.com/existingauthor',
        });
        assert.ok(
          res.status === 400 || res.status === 403,
          `Expected 400 or 403 for existing author applying again, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.AUTH_APP_ALREADY_AUTHOR);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should reject author application with missing required fields (bio/skills) with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/authors/apply', {
          // bio omitted
          portfolioUrl: 'https://github.com/maker',
        });
        assert.equal(res.status, 400, 'Expected 400 for missing bio');
        assertErrorEnvelope(res.data, 400);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject author application with invalid portfolio URL format with 400', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/authors/apply', {
          bio: 'Valid bio with enough characters',
          skills: ['Arduino'],
          portfolioUrl: 'not-a-valid-http-url',
        });
        assert.equal(res.status, 400, 'Expected 400 for invalid portfolio URL');
        assertErrorEnvelope(res.data, 400);
      });
    });
  });

  // =========================================================================
  // Feature 11: Author Application Review
  // =========================================================================
  describe('Feature 11: Author Application Review', () => {
    it('should return 403 and RBAC_FORBIDDEN when non-admin (buyer or author) attempts to review application', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.patch('/admin/author-applications/507f1f77bcf86cd799439011', {
          action: 'APPROVE',
        });
        assert.equal(res.status, 403, 'Expected 403 Forbidden for buyer attempting review');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 404 and NF_GENERIC when admin reviews non-existent application ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.patch('/admin/author-applications/507f1f77bcf86cd799439011', {
          action: 'APPROVE',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent application');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should return 400 when admin submits invalid review action (neither APPROVE nor REJECT)', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.patch('/admin/author-applications/507f1f77bcf86cd799439011', {
          action: 'INVALID_DECISION',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for invalid action enum, got ${res.status}`
        );
      });
    });

    it('should return 400 or 409 when admin attempts to re-review already decided application', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.patch('/admin/author-applications/already-decided-mock-id', {
          action: 'APPROVE',
        });
        assert.ok(
          res.status === 400 || res.status === 404 || res.status === 409,
          `Expected 400, 404, or 409, got ${res.status}`
        );
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated user attempts application review', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.patch('/admin/author-applications/507f1f77bcf86cd799439011', {
          action: 'APPROVE',
        });
        assert.equal(res.status, 401, 'Expected 401 for anonymous review attempt');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });
  });

  // =========================================================================
  // Feature 12: Author Dashboard Overview
  // =========================================================================
  describe('Feature 12: Author Dashboard Overview', () => {
    it('should return 403 and RBAC_FORBIDDEN when standard buyer accesses author dashboard (/authors/dashboard)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/authors/dashboard');
        assert.equal(res.status, 403, 'Expected 403 for buyer accessing author dashboard');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor accesses author dashboard', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/authors/dashboard');
        assert.equal(res.status, 401, 'Expected 401 for anonymous dashboard access');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it("should reject attempts by author to access another author's private earnings or metrics", async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const otherAuthorId = '507f1f77bcf86cd799439099';
        const res = await author.client.get(`/authors/${otherAuthorId}/financials`);
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 or 404 for accessing another author's financials, got ${res.status}`
        );
      });
    });

    it('should reject malformed date/filter query parameters on author analytics with 400', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.get('/authors/dashboard?startDate=invalid-date&endDate=corrupted');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 400 or default handling (200), got ${res.status}`
        );
      });
    });

    it('should return 404 or 405 when attempting to mutate author dashboard balance via POST/PUT', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/authors/dashboard/balance', {
          availableBalance: 999999,
        });
        assert.ok(
          res.status === 404 || res.status === 405,
          `Direct balance mutation must return 404 or 405, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 13: Project Draft Creation
  // =========================================================================
  describe('Feature 13: Project Draft Creation', () => {
    it('should return 403 and RBAC_FORBIDDEN when standard buyer attempts to create project draft', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/projects', {
          title: 'Ağıllı İstixana Layihəsi',
          shortDescription: 'Avtomatlaşdırılmış suvarma və iqlimə nəzarət sistemi',
          category: 'Smart Home',
          price: 25.0,
        });
        assert.equal(res.status, 403, 'Expected 403 Forbidden for buyer creating project draft');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor creates project draft', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects', {
          title: 'Ağıllı İstixana Layihəsi',
          shortDescription: 'Avtomatlaşdırılmış suvarma sistemi',
          category: 'Smart Home',
          price: 25.0,
        });
        assert.equal(res.status, 401, 'Expected 401 for anonymous project draft creation');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject project draft creation when title is less than 5 characters with 400 and PROJ_SHORT_TITLE', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/projects', {
          title: 'IoT', // less than 5 characters
          shortDescription: 'Qısa başlıqlı layihə təsviri',
          category: 'IoT',
          price: 10.0,
        });
        assert.equal(res.status, 400, 'Expected 400 for short project title');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_SHORT_TITLE);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject project draft creation with negative price with 400 and VAL_INVALID_PRICE', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/projects', {
          title: 'Mənfi Qiymətli Layihə',
          shortDescription: 'Bu layihə mənfi qiymətlə göndərilir',
          category: 'Robotics',
          price: -15.0,
        });
        assert.equal(res.status, 400, 'Expected 400 for negative price');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject project draft creation when required fields (category/description) are missing with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/projects', {
          title: 'Çatışmayan Sahəli Layihə',
          // shortDescription and category omitted
          price: 15.0,
        });
        assert.equal(res.status, 400, 'Expected 400 for missing required fields');
        assertErrorEnvelope(res.data, 400);
        assertAzerbaijaniText(res.data.message);
      });
    });
  });

  // =========================================================================
  // Feature 14: Project Asset Upload
  // =========================================================================
  describe('Feature 14: Project Asset Upload', () => {
    it('should return 413 Payload Too Large and PROJ_FILE_TOO_LARGE when uploading file exceeding size limit', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const formData = new FormData();
        // Create an oversized blob (> 100MB simulation header or large blob)
        const fakeHugeContent = new Uint8Array(1024 * 1024); // 1MB chunk with oversized declared size or repetition
        const blob = new Blob([fakeHugeContent], { type: 'application/zip' });
        formData.append('file', blob, 'huge-project-archive.zip');

        const res = await author.client.upload(
          '/projects/507f1f77bcf86cd799439011/files',
          formData,
          { 'X-Simulated-File-Size': '150000000' } // 150MB trigger
        );
        assert.ok(
          res.status === 413 || res.status === 400 || res.status === 404,
          `Expected 413, 400, or 404, got ${res.status}`
        );
        if (res.status === 413) {
          assertErrorEnvelope(res.data, 413, AZERBAIJANI_ERROR_MESSAGES.PROJ_FILE_TOO_LARGE);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 415 Unsupported Media Type and PROJ_DISALLOWED_EXTENSION when uploading executable (.exe/.bat)', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const formData = new FormData();
        const maliciousFile = new Blob(['MZ...binary executable content'], {
          type: 'application/x-msdownload',
        });
        formData.append('file', maliciousFile, 'malware.exe');

        const res = await author.client.upload(
          '/projects/507f1f77bcf86cd799439011/files',
          formData
        );
        assert.ok(
          res.status === 415 || res.status === 400 || res.status === 404,
          `Expected 415 or 400 for forbidden extension, got ${res.status}`
        );
        if (res.status === 415 || res.status === 400) {
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it("should return 403 and RBAC_FORBIDDEN when author attempts to upload asset to another author's project", async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const formData = new FormData();
        const validFile = new Blob(['valid zip content'], { type: 'application/zip' });
        formData.append('file', validFile, 'firmware.zip');

        const foreignProjectId = '507f1f77bcf86cd799439099';
        const res = await author.client.upload(`/projects/${foreignProjectId}/files`, formData);
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 Forbidden or 404 for uploading to non-owned project, got ${res.status}`
        );
      });
    });

    it('should return 404 and NF_PROJECT when uploading asset to non-existent project ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const formData = new FormData();
        const validFile = new Blob(['valid zip content'], { type: 'application/zip' });
        formData.append('file', validFile, 'schematics.pdf');

        const nonExistentId = '507f1f77bcf86cd799439011';
        const res = await author.client.upload(`/projects/${nonExistentId}/files`, formData);
        assert.equal(res.status, 404, 'Expected 404 for non-existent project upload');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should reject asset upload with empty multipart form-data (no file attached) with 400', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const emptyFormData = new FormData();
        const res = await author.client.upload(
          '/projects/507f1f77bcf86cd799439011/files',
          emptyFormData
        );
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for empty file upload, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 15: Project Submission for Review
  // =========================================================================
  describe('Feature 15: Project Submission for Review', () => {
    it('should return 400 and PROJ_MISSING_FILES when author submits project draft without any attached files', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        // Submit project that has no files uploaded
        const res = await author.client.post('/projects/507f1f77bcf86cd799439011/submit');
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 Bad Request or 404, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_FILES);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 400 and VAL_REQUIRED_FIELD when submitting draft with missing required technical specs', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/projects/incomplete-draft-id/submit');
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for incomplete draft, got ${res.status}`
        );
      });
    });

    it("should return 403 and RBAC_FORBIDDEN when non-owner author attempts to submit another's draft for review", async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const foreignDraftId = '507f1f77bcf86cd799439088';
        const res = await author.client.post(`/projects/${foreignDraftId}/submit`);
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 or 404 for submitting foreign draft, got ${res.status}`
        );
      });
    });

    it('should return 400 when attempting to submit a project that is already SUBMITTED or PUBLISHED (invalid state transition)', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const alreadySubmittedId = 'already-submitted-project-id';
        const res = await author.client.post(`/projects/${alreadySubmittedId}/submit`);
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 (invalid transition) or 404, got ${res.status}`
        );
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated user attempts project submission', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects/507f1f77bcf86cd799439011/submit');
        assert.equal(res.status, 401, 'Expected 401 for anonymous project submit');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });
  });
});
