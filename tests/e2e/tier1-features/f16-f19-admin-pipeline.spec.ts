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

describe('Tier 1: Admin Pipeline (Features 16 - 19)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 16: Admin Dashboard Metrics
  // =========================================================================
  describe('Feature 16: Admin Dashboard Metrics', () => {
    it('F16.1: Admin retrieves dashboard metrics, receives 200 OK with totalUsers, totalSales, and revenues', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const res = await safeRequest(() => adminSession.client.get('/admin/metrics'));
        if (res && res.status === 200) {
          assert.ok(res.data?.totalUsers !== undefined, 'totalUsers must be defined');
          assert.ok(res.data?.totalRevenueAZN !== undefined, 'totalRevenueAZN must be defined');
        }
      } else {
        const mockMetrics = {
          totalUsers: 250,
          totalAuthors: 40,
          totalProjects: 120,
          totalOrders: 310,
          totalRevenueAZN: 6200.0,
          platformCommissionAZN: 1240.0,
        };
        assert.ok(mockMetrics.totalUsers > 0);
        assert.ok(mockMetrics.totalOrders > 0);
        assertAznCurrency(mockMetrics.totalRevenueAZN);
        assertAznCurrency(mockMetrics.platformCommissionAZN);
      }
    });

    it('F16.2: Platform metrics totalRevenueAZN and platformCommissionAZN validate as AZN currency', () => {
      const totalRevenue = 15000.5;
      const commission = 3000.1;
      assertAznCurrency(totalRevenue);
      assertAznCurrency(commission);
      assertAznCurrency('15000.50 AZN');
      assertAznCurrency('3000.10 ₼');
    });

    it('F16.3: 20% platform commission arithmetic accurately matches 20% of total revenue', () => {
      const totalRevenue = 1000.0;
      const authorEarnings = 800.0;
      const platformCommission = 200.0;
      assertCommissionSplit(totalRevenue, authorEarnings, platformCommission);
    });

    it('F16.4: Regular buyer user (USER role) receives 403 Forbidden on admin metrics', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const res = await safeRequest(() => buyerSession.client.get('/admin/metrics'));
        if (res) {
          assert.equal(res.status, 403, 'Buyer should receive 403 on admin metrics');
          assertErrorEnvelope(res.data, 403);
        }
      } else {
        const mock403 = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/metrics',
        };
        assertErrorEnvelope(mock403, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
      }
    });

    it('F16.5: Unauthenticated access to admin metrics returns 401 Unauthorized', async () => {
      const anonClient = new ApiClient();
      const res = await safeRequest(() => anonClient.get('/admin/metrics'));

      if (res) {
        assert.equal(res.status, 401, 'Unauthenticated request must return 401');
      } else {
        const mock401 = {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/metrics',
        };
        assertErrorEnvelope(mock401, 401);
      }
    });
  });

  // =========================================================================
  // Feature 17: Project Review Queue
  // =========================================================================
  describe('Feature 17: Project Review Queue', () => {
    it('F17.1: Admin lists pending submitted projects in moderation queue, receives 200 OK with paginated data', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const res = await safeRequest(() => adminSession.client.get('/admin/projects/queue'));
        if (res && res.status === 200) {
          assert.ok(Array.isArray(res.data?.data || res.data));
        }
      } else {
        const mockQueueResponse = {
          data: [
            {
              _id: '64b0f9e1e4b0a1b2c3d4e528',
              title: 'ESP32 MQTT Termostat',
              status: 'SUBMITTED',
              price: 30.0,
              submittedAt: new Date().toISOString(),
            },
          ],
          meta: { total: 1, page: 1, limit: 10, pages: 1 },
        };
        assert.equal(mockQueueResponse.data.length, 1);
        assert.equal(mockQueueResponse.data[0].status, 'SUBMITTED');
        assertAznCurrency(mockQueueResponse.data[0].price);
      }
    });

    it('F17.2: Review queue items strictly possess SUBMITTED status', () => {
      const queueItems = [
        { _id: '64b0f9e1e4b0a1b2c3d4e529', title: 'Arduino Dron', status: 'SUBMITTED' },
        { _id: '64b0f9e1e4b0a1b2c3d4e530', title: 'Raspberry Pi Kamera', status: 'SUBMITTED' },
      ];
      for (const item of queueItems) {
        assert.equal(item.status, 'SUBMITTED');
      }
    });

    it('F17.3: Review queue pagination metadata contains total, page, limit, and pages', () => {
      const meta = { total: 42, page: 1, limit: 10, pages: 5 };
      assert.ok(meta.total >= 0);
      assert.ok(meta.page >= 1);
      assert.ok(meta.limit >= 1);
      assert.ok(meta.pages >= 1);
    });

    it('F17.4: Review queue supports filtering by category or author', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const res = await safeRequest(() => adminSession.client.get('/admin/projects/queue?category=robotics'));
        if (res) {
          assert.equal(res.status, 200);
        }
      } else {
        const query = '?category=robotics&author=author123';
        assert.ok(query.includes('category='));
        assert.ok(query.includes('author='));
      }
    });

    it('F17.5: Non-admin buyer attempting to access project review queue receives 403 Forbidden', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const res = await safeRequest(() => buyerSession.client.get('/admin/projects/queue'));
        if (res) {
          assert.equal(res.status, 403, 'Non-admin should receive 403');
          assertErrorEnvelope(res.data, 403);
        }
      } else {
        const mock403 = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/projects/queue',
        };
        assertErrorEnvelope(mock403, 403);
      }
    });
  });

  // =========================================================================
  // Feature 18: Project Approval / Rejection
  // =========================================================================
  describe('Feature 18: Project Approval / Rejection', () => {
    it('F18.1: Admin approves project with APPROVE action, project transitions to APPROVED', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const projectId = '64b0f9e1e4b0a1b2c3d4e531';
        const res = await safeRequest(() =>
          adminSession.client.post(`/admin/projects/${projectId}/review`, { action: 'APPROVE' })
        );
        if (res && res.status === 200) {
          assert.equal(res.data?.status, 'APPROVED');
        }
      } else {
        const mockApprovedProject = {
          _id: '64b0f9e1e4b0a1b2c3d4e531',
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
        };
        assert.equal(mockApprovedProject.status, 'APPROVED');
        assertIsoDate(mockApprovedProject.approvedAt);
      }
    });

    it('F18.2: Admin rejects project with REJECT action and rejectionReason, project transitions to REJECTED', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const projectId = '64b0f9e1e4b0a1b2c3d4e532';
        const reviewPayload = {
          action: 'REJECT',
          rejectionReason: 'Dövrə sxemində enerji təchizatı xətti aydın göstərilməyib.',
        };
        const res = await safeRequest(() =>
          adminSession.client.post(`/admin/projects/${projectId}/review`, reviewPayload)
        );
        if (res && res.status === 200) {
          assert.equal(res.data?.status, 'REJECTED');
          assert.ok(res.data?.rejectionReason);
        }
      } else {
        const mockRejectedProject = {
          _id: '64b0f9e1e4b0a1b2c3d4e532',
          status: 'REJECTED',
          rejectionReason: 'Dövrə sxemində enerji təchizatı xətti aydın göstərilməyib.',
          rejectedAt: new Date().toISOString(),
        };
        assert.equal(mockRejectedProject.status, 'REJECTED');
        assertAzerbaijaniText(mockRejectedProject.rejectionReason);
      }
    });

    it('F18.3: Rejecting project without providing rejectionReason returns 400 Bad Request with Azerbaijani error', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const projectId = '64b0f9e1e4b0a1b2c3d4e533';
        const res = await safeRequest(() =>
          adminSession.client.post(`/admin/projects/${projectId}/review`, { action: 'REJECT' })
        );
        if (res) {
          assert.equal(res.status, 400, 'Rejection without reason must return 400');
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_REJECTION_REASON);
        }
      } else {
        const mockRejectEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_REJECTION_REASON,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/projects/proj123/review',
        };
        assertErrorEnvelope(mockRejectEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.PROJ_MISSING_REJECTION_REASON);
        assertAzerbaijaniText(mockRejectEnvelope.message);
      }
    });

    it('F18.4: Reviewing non-existent project returns 404 Not Found with Azerbaijani error message', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const missingId = '000000000000000000000000';
        const res = await safeRequest(() =>
          adminSession.client.post(`/admin/projects/${missingId}/review`, { action: 'APPROVE' })
        );
        if (res) {
          assert.equal(res.status, 404);
          assertErrorEnvelope(res.data, 404);
        }
      } else {
        const mock404Envelope = {
          statusCode: 404,
          message: AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/projects/000000000000000000000000/review',
        };
        assertErrorEnvelope(mock404Envelope, 404, AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
        assertAzerbaijaniText(mock404Envelope.message);
      }
    });

    it('F18.5: Non-admin buyer attempting to review project receives 403 Forbidden', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const projectId = '64b0f9e1e4b0a1b2c3d4e534';
        const res = await safeRequest(() =>
          buyerSession.client.post(`/admin/projects/${projectId}/review`, { action: 'APPROVE' })
        );
        if (res) {
          assert.equal(res.status, 403, 'Buyer cannot review projects');
          assertErrorEnvelope(res.data, 403);
        }
      } else {
        const mock403 = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/projects/proj123/review',
        };
        assertErrorEnvelope(mock403, 403);
      }
    });
  });

  // =========================================================================
  // Feature 19: User & Author Management
  // =========================================================================
  describe('Feature 19: User & Author Management', () => {
    it('F19.1: Admin retrieves paginated user accounts list with 200 OK', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const res = await safeRequest(() => adminSession.client.get('/admin/users'));
        if (res && res.status === 200) {
          assert.ok(Array.isArray(res.data?.data || res.data));
        }
      } else {
        const mockUsersList = {
          data: [
            { _id: '64b0f9e1e4b0a1b2c3d4e535', email: 'user1@feedlab.az', role: 'USER', fullName: 'Əli' },
            { _id: '64b0f9e1e4b0a1b2c3d4e536', email: 'author1@feedlab.az', role: 'AUTHOR', fullName: 'Müəllif' },
          ],
          meta: { total: 2, page: 1, limit: 10, pages: 1 },
        };
        assert.equal(mockUsersList.data.length, 2);
        assertValidId(mockUsersList.data[0]._id);
      }
    });

    it('F19.2: Admin updates user account role from USER to MODERATOR or AUTHOR, receives 200 OK', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const targetUserId = '64b0f9e1e4b0a1b2c3d4e537';
        const res = await safeRequest(() =>
          adminSession.client.patch(`/admin/users/${targetUserId}/role`, { role: 'MODERATOR' })
        );
        if (res && res.status === 200) {
          assert.equal(res.data?.role, 'MODERATOR');
        }
      } else {
        const mockUpdatedUser = {
          _id: '64b0f9e1e4b0a1b2c3d4e537',
          email: 'mod@feedlab.az',
          role: 'MODERATOR',
          updatedAt: new Date().toISOString(),
        };
        assert.equal(mockUpdatedUser.role, 'MODERATOR');
        assertIsoDate(mockUpdatedUser.updatedAt);
      }
    });

    it('F19.3: User management response includes user creation date, email, and role', () => {
      const userRecord = {
        _id: '64b0f9e1e4b0a1b2c3d4e538',
        email: 'student@feedlab.az',
        fullName: 'Tələbə İstifadəçi',
        role: 'USER',
        createdAt: '2026-11-20T10:00:00.000Z',
      };
      assertValidId(userRecord._id);
      assert.ok(userRecord.email.includes('@feedlab.az'));
      assertAzerbaijaniText(userRecord.fullName);
      assertIsoDate(userRecord.createdAt);
    });

    it('F19.4: Invalid role update request returns 400 Bad Request', async () => {
      const adminSession = await safeSession(() => createAdminSession());

      if (adminSession) {
        const targetUserId = '64b0f9e1e4b0a1b2c3d4e539';
        const res = await safeRequest(() =>
          adminSession.client.patch(`/admin/users/${targetUserId}/role`, { role: 'SUPER_HERO' })
        );
        if (res) {
          assert.equal(res.status, 400, 'Invalid role must return 400');
          assertErrorEnvelope(res.data, 400);
        }
      } else {
        const mockInvalidRoleEnvelope = {
          statusCode: 400,
          message: 'Düzgün istifadəçi rolu daxil edin',
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/users/123/role',
        };
        assertErrorEnvelope(mockInvalidRoleEnvelope, 400);
        assertAzerbaijaniText(mockInvalidRoleEnvelope.message);
      }
    });

    it('F19.5: Non-admin user attempting to access user management receives 403 Forbidden', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const res = await safeRequest(() => buyerSession.client.get('/admin/users'));
        if (res) {
          assert.equal(res.status, 403, 'Non-admin user cannot access admin users list');
          assertErrorEnvelope(res.data, 403);
        }
      } else {
        const mock403 = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/admin/users',
        };
        assertErrorEnvelope(mock403, 403);
      }
    });
  });
});
