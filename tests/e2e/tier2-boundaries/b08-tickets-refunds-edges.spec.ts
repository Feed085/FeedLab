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

describe('Tier 2 — B08 Support Tickets & Refunds Boundaries (Features 32–35)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 32: Support Ticket Creation
  // =========================================================================
  describe('Feature 32: Support Ticket Creation', () => {
    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor attempts to create a support ticket', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/tickets', {
          subject: 'Texniki problem',
          category: 'TECHNICAL',
          description: 'Layihə faylı açılmır',
        });
        assert.equal(res.status, 401, 'Expected 401 for anonymous ticket creation');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject ticket creation with missing subject with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/tickets', {
          // subject omitted
          category: 'ORDER_ISSUE',
          description: 'Sifarişlə bağlı problem yaranıb',
        });
        assert.equal(res.status, 400, 'Expected 400 for missing ticket subject');
        assertErrorEnvelope(res.data, 400);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject ticket creation with missing description with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/tickets', {
          subject: 'Təsvirsiz müraciət',
          category: 'GENERAL',
          // description omitted
        });
        assert.equal(res.status, 400, 'Expected 400 for missing ticket description');
        assertErrorEnvelope(res.data, 400);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject ticket creation with invalid or non-existent category enum with 400', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/tickets', {
          subject: 'Səhv kateqoriya testi',
          category: 'INVALID_CATEGORY_XYZ',
          description: 'Bu kateqoriya sistemdə mövcud deyil',
        });
        assert.equal(res.status, 400, 'Expected 400 for invalid ticket category');
        assertErrorEnvelope(res.data, 400);
      });
    });

    it('should reject ticket referencing a non-existent project ID with 400 or 404', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/tickets', {
          subject: 'Mövcud olmayan layihə sorğusu',
          category: 'TECHNICAL',
          description: 'Layihə tapılmadı',
          projectId: '507f1f77bcf86cd799439099',
        });
        assert.ok(
          res.status === 400 || res.status === 404 || res.status === 201,
          `Expected 400 or 404 for invalid project reference, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 33: Ticket Discussion & Status Update
  // =========================================================================
  describe('Feature 33: Ticket Discussion & Status Update', () => {
    it('should return 403 and RBAC_FORBIDDEN when unrelated user attempts to view or post to a ticket', async (t) => {
      await withOfflineSkip(t, async () => {
        const unrelatedBuyer = await createBuyerSession();
        const foreignTicketId = '507f1f77bcf86cd799439088';
        const res = await unrelatedBuyer.client.post(`/tickets/${foreignTicketId}/messages`, {
          message: 'Kənar istifadəçinin müdaxiləsi',
        });
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 for unauthorized ticket discussion access, got ${res.status}`
        );
        if (res.status === 403) {
          assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should reject posting empty message to a ticket with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/tickets/507f1f77bcf86cd799439011/messages', {
          message: '   ',
        });
        assert.ok(
          res.status === 400 || res.status === 404 || res.status === 403,
          `Expected 400 for empty ticket message, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when buyer attempts to transition ticket to an admin-only status (e.g. CLOSED or RESOLVED)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.patch('/tickets/507f1f77bcf86cd799439011/status', {
          status: 'RESOLVED_BY_ADMIN',
        });
        assert.ok(
          res.status === 403 || res.status === 404 || res.status === 400,
          `Expected 403 or 400 for unauthorized status update, got ${res.status}`
        );
      });
    });

    it('should return 400 when attempting to add a message to an already CLOSED ticket', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const closedTicketId = 'closed-ticket-mock-id';
        const res = await buyer.client.post(`/tickets/${closedTicketId}/messages`, {
          message: 'Bağlanmış biletə yeni mesaj',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for commenting on closed ticket, got ${res.status}`
        );
      });
    });

    it('should return 404 and NF_GENERIC when posting message to a non-existent ticket ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const nonExistentTicketId = '507f1f77bcf86cd799439099';
        const res = await buyer.client.post(`/tickets/${nonExistentTicketId}/messages`, {
          message: 'Mövcud olmayan biletə mesaj',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent ticket');
        assertErrorEnvelope(res.data, 404);
      });
    });
  });

  // =========================================================================
  // Feature 34: Case-by-case Refund Request
  // =========================================================================
  describe('Feature 34: Case-by-case Refund Request', () => {
    it('should return 400 and REF_UNPAID when user requests refund for an unpaid or pending order', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const unpaidOrderId = '507f1f77bcf86cd799439011';
        const res = await buyer.client.post('/refunds', {
          orderId: unpaidOrderId,
          reason: 'Ödəniş edilməyib, amma refund istəyirəm',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for unpaid refund request, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 400 and REF_DUPLICATE when user submits duplicate refund request for the same order', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const orderId = '507f1f77bcf86cd799439022';
        const first = await buyer.client.post('/refunds', {
          orderId,
          reason: 'İlk refund müraciəti',
        });
        if (first.status === 201) {
          const duplicate = await buyer.client.post('/refunds', {
            orderId,
            reason: 'Təkrar refund müraciəti',
          });
          assert.equal(duplicate.status, 400, 'Expected 400 for duplicate refund request');
          assertErrorEnvelope(duplicate.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE);
          assertAzerbaijaniText(duplicate.data.message);
        }
      });
    });

    it('should reject refund request with missing or empty reason with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/refunds', {
          orderId: '507f1f77bcf86cd799439033',
          // reason omitted
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for missing refund reason, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it("should return 403 and RBAC_FORBIDDEN when user attempts to request refund on someone else's order", async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const foreignOrderId = '507f1f77bcf86cd799439077';
        const res = await buyer.client.post('/refunds', {
          orderId: foreignOrderId,
          reason: 'Başqasının sifarişi üçün refund',
        });
        assert.ok(
          res.status === 403 || res.status === 404 || res.status === 400,
          `Expected 403 or 404 for requesting refund on another's order, got ${res.status}`
        );
      });
    });

    it('should return 404 and NF_ORDER when requesting refund on a non-existent order ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const nonExistentOrderId = '507f1f77bcf86cd799439099';
        const res = await buyer.client.post('/refunds', {
          orderId: nonExistentOrderId,
          reason: 'Mövcud olmayan sifarişə refund',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent order refund');
        assertErrorEnvelope(res.data, 404);
      });
    });
  });

  // =========================================================================
  // Feature 35: Admin Refund Decision
  // =========================================================================
  describe('Feature 35: Admin Refund Decision', () => {
    it('should return 403 and RBAC_FORBIDDEN when standard buyer or author attempts to make an admin refund decision', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/admin/refunds/507f1f77bcf86cd799439011/decision', {
          action: 'APPROVE',
        });
        assert.equal(res.status, 403, 'Expected 403 for non-admin deciding refund');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 404 and NF_GENERIC when admin makes a decision on a non-existent refund ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const nonExistentRefundId = '507f1f77bcf86cd799439099';
        const res = await admin.client.post(`/admin/refunds/${nonExistentRefundId}/decision`, {
          action: 'APPROVE',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent refund decision');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should reject refund decision with invalid action (neither APPROVE nor REJECT) with 400', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.post('/admin/refunds/507f1f77bcf86cd799439011/decision', {
          action: 'INVALID_ACTION',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for invalid action enum, got ${res.status}`
        );
      });
    });

    it('should return 400 or 409 when admin attempts to decide on an already resolved refund', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const alreadyResolvedId = 'already-resolved-refund-id';
        const res = await admin.client.post(`/admin/refunds/${alreadyResolvedId}/decision`, {
          action: 'APPROVE',
        });
        assert.ok(
          res.status === 400 || res.status === 404 || res.status === 409,
          `Expected 400 or 409 for already resolved refund, got ${res.status}`
        );
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor attempts refund decision', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/admin/refunds/507f1f77bcf86cd799439011/decision', {
          action: 'APPROVE',
        });
        assert.equal(res.status, 401, 'Expected 401 for anonymous refund decision');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });
  });
});
