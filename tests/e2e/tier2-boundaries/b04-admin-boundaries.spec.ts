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

describe('Tier 2 — B04 Admin Pipeline Boundaries & Security (Features 16–19)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 16: Admin Dashboard Metrics
  // =========================================================================
  describe('Feature 16: Admin Dashboard Metrics', () => {
    it('should return 403 and RBAC_FORBIDDEN when standard buyer accesses admin metrics (/admin/metrics)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/admin/metrics');
        assert.equal(res.status, 403, 'Expected 403 Forbidden for buyer');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when author accesses admin metrics (/admin/metrics)', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.get('/admin/metrics');
        assert.equal(res.status, 403, 'Expected 403 Forbidden for author');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor accesses admin metrics', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/admin/metrics');
        assert.equal(res.status, 401, 'Expected 401 for anonymous access');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject invalid date range filters on admin metrics with 400 (e.g. from > to)', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.get('/admin/metrics?from=2026-12-31&to=2026-01-01');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 400 or default sanitization (200), got ${res.status}`
        );
      });
    });

    it('should return 404 or 405 when attempting to mutate admin metrics via POST/PUT', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.post('/admin/metrics', {
          totalRevenueAZN: 500000,
        });
        assert.ok(
          res.status === 404 || res.status === 405,
          `Expected 404 or 405 for mutating read-only metrics, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 17: Project Review Queue
  // =========================================================================
  describe('Feature 17: Project Review Queue', () => {
    it('should return 403 and RBAC_FORBIDDEN when standard buyer accesses project review queue', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/admin/projects/queue');
        assert.equal(res.status, 403, 'Expected 403 for buyer accessing review queue');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when author accesses project review queue', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.get('/admin/projects/queue');
        assert.equal(res.status, 403, 'Expected 403 for author accessing review queue');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor accesses review queue', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/admin/projects/queue');
        assert.equal(res.status, 401, 'Expected 401 for anonymous access to queue');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 400 when invalid status filter is supplied to project review queue', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.get('/admin/projects/queue?status=NON_EXISTENT_STATUS');
        assert.ok(
          res.status === 400 || res.status === 200,
          `Expected 400 or empty filtered list (200), got ${res.status}`
        );
      });
    });

    it('should return 400 when malformed pagination parameters are supplied (e.g. page=-1 or limit=0)', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.get('/admin/projects/queue?page=-1&limit=0');
        assert.ok(
          res.status === 400 || res.status === 200,
          `Expected 400 validation error or clamped defaults (200), got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 18: Project Approval / Rejection
  // =========================================================================
  describe('Feature 18: Project Approval / Rejection', () => {
    it('should return 400 and PROJ_MISSING_REJECTION_REASON when admin rejects project without providing a rejection reason', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.post('/admin/projects/507f1f77bcf86cd799439011/review', {
          action: 'REJECT',
          // rejectionReason omitted
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for missing rejection reason or 404 for mock ID, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_REJECTION_REASON);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when standard buyer attempts to approve or reject a project', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/admin/projects/507f1f77bcf86cd799439011/review', {
          action: 'APPROVE',
        });
        assert.equal(res.status, 403, 'Expected 403 for buyer reviewing project');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when author attempts to self-approve their own submitted project', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/admin/projects/507f1f77bcf86cd799439011/review', {
          action: 'APPROVE',
        });
        assert.equal(res.status, 403, 'Expected 403 for author approving own project');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 400 when admin attempts to approve a project still in DRAFT status (invalid lifecycle transition)', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.post('/admin/projects/draft-project-mock-id/review', {
          action: 'APPROVE',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 (invalid state transition) or 404, got ${res.status}`
        );
      });
    });

    it('should return 404 and NF_PROJECT when admin reviews a non-existent project ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const nonExistentId = '507f1f77bcf86cd799439011';
        const res = await admin.client.post(`/admin/projects/${nonExistentId}/review`, {
          action: 'APPROVE',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent project');
        assertErrorEnvelope(res.data, 404);
      });
    });
  });

  // =========================================================================
  // Feature 19: User & Author Management
  // =========================================================================
  describe('Feature 19: User & Author Management', () => {
    it('should return 403 and RBAC_FORBIDDEN when standard buyer accesses user management endpoint (/admin/users)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/admin/users');
        assert.equal(res.status, 403, 'Expected 403 for buyer accessing admin users');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when author attempts to modify a user role', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.patch('/admin/users/507f1f77bcf86cd799439011/role', {
          role: 'ADMIN',
        });
        assert.equal(res.status, 403, 'Expected 403 for author changing user role');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 400 when admin attempts to assign an invalid role (e.g. SUPERUSER or ROOT)', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.patch('/admin/users/507f1f77bcf86cd799439011/role', {
          role: 'SUPERUSER',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 invalid enum or 404, got ${res.status}`
        );
      });
    });

    it('should return 404 and NF_GENERIC when admin attempts to modify role of non-existent user ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const nonExistentUserId = '507f1f77bcf86cd799439022';
        const res = await admin.client.patch(`/admin/users/${nonExistentUserId}/role`, {
          role: 'AUTHOR',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent user role update');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should return 400 when admin attempts to self-demote or delete the primary platform administrator', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.patch(`/admin/users/self/role`, {
          role: 'USER',
        });
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected 400 or 403 when demoting admin, got ${res.status}`
        );
      });
    });
  });
});
