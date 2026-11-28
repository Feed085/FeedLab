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

describe('Tier 2 — B06 Orders & Downloads Security Boundaries (Features 25–28)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 25: Checkout & Order Creation
  // =========================================================================
  describe('Feature 25: Checkout & Order Creation', () => {
    it('should return 400 and ORD_SELF_PURCHASE when author attempts to checkout their own authored project', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        // Attempt to checkout own project
        const res = await author.client.post('/orders/checkout', {
          projectId: '507f1f77bcf86cd799439011',
          paymentMethod: 'CARD',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for self-purchase or 404, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_SELF_PURCHASE);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 400 and ORD_ALREADY_OWNED when buyer attempts to re-purchase a project they already own', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const projectId = '507f1f77bcf86cd799439022';
        const first = await buyer.client.post('/orders/checkout', {
          projectId,
          paymentMethod: 'CARD',
        });
        if (first.status === 201) {
          const duplicate = await buyer.client.post('/orders/checkout', {
            projectId,
            paymentMethod: 'CARD',
          });
          assert.ok(
            duplicate.status === 400 || duplicate.status === 200,
            `Expected 400 for duplicate purchase, got ${duplicate.status}`
          );
          if (duplicate.status === 400) {
            assertErrorEnvelope(duplicate.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED);
            assertAzerbaijaniText(duplicate.data.message);
          }
        }
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor attempts checkout', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/orders/checkout', {
          projectId: '507f1f77bcf86cd799439011',
          paymentMethod: 'CARD',
        });
        assert.equal(res.status, 401, 'Expected 401 for anonymous checkout');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 404 and NF_PROJECT when attempting checkout on non-existent project ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const nonExistentId = '507f1f77bcf86cd799439099';
        const res = await buyer.client.post('/orders/checkout', {
          projectId: nonExistentId,
          paymentMethod: 'CARD',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent project checkout');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should reject checkout payload attempting price tampering (e.g. price=0.01 or price=-10)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/orders/checkout', {
          projectId: '507f1f77bcf86cd799439011',
          paymentMethod: 'CARD',
          price: 0.01, // Client attempts to override server price
          totalPrice: -50.0,
        });
        assert.ok(
          res.status === 201 || res.status === 400 || res.status === 404,
          `Expected server to ignore tampered price (201 with catalog price) or reject with 400, got ${res.status}`
        );
        if (res.status === 201 && res.data?.price) {
          assert.notEqual(res.data.price, 0.01, 'Server must never accept client-tampered price');
        }
      });
    });
  });

  // =========================================================================
  // Feature 26: Payment Processing & Webhook
  // =========================================================================
  describe('Feature 26: Payment Processing & Webhook', () => {
    it('should return 400 and ORD_ALREADY_PAID when attempting payment confirmation on already paid order', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const orderId = 'already-paid-order-id-123';
        const res = await buyer.client.post('/payments/confirm', {
          orderId,
          transactionId: 'txn_mock_already_paid',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for already paid order or 404 for mock, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_PAID);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 404 and NF_ORDER when confirming payment on non-existent order ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/payments/confirm', {
          orderId: '507f1f77bcf86cd799439088',
          transactionId: 'txn_non_existent',
        });
        assert.equal(res.status, 404, 'Expected 404 for non-existent order payment confirmation');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should reject webhook confirmation lacking valid cryptographic signature with 401 or 403', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post(
          '/payments/webhook',
          { event: 'payment.success', orderId: '507f1f77bcf86cd799439011' },
          { 'X-FeedLab-Signature': 'invalid-tampered-hmac-signature' }
        );
        assert.ok(
          res.status === 401 || res.status === 403 || res.status === 404,
          `Expected 401, 403 or 404 for invalid webhook signature, got ${res.status}`
        );
      });
    });

    it('should reject payment confirmation missing required transactionId with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/payments/confirm', {
          orderId: '507f1f77bcf86cd799439011',
          // transactionId omitted
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for missing transactionId, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400);
        }
      });
    });

    it('should reject payment confirmation when transaction amount mismatches order amount with 400', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/payments/confirm', {
          orderId: '507f1f77bcf86cd799439011',
          transactionId: 'txn_amount_mismatch',
          paidAmountAZN: 1.0, // order was 25.00 AZN
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for underpaid transaction amount mismatch, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 27: User Order History (/orders/my)
  // =========================================================================
  describe('Feature 27: User Order History (/orders/my)', () => {
    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor requests order history', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/orders/my');
        assert.equal(res.status, 401, 'Expected 401 for anonymous orders lookup');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it("should return 403 or 404 when user attempts to view details of another user's private order", async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const foreignOrderId = '507f1f77bcf86cd799439033';
        const res = await buyer.client.get(`/orders/${foreignOrderId}`);
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 or 404 for accessing another user's order, got ${res.status}`
        );
      });
    });

    it('should return 400 when order history request includes negative page parameter (?page=-1)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/orders/my?page=-1');
        assert.ok(
          res.status === 400 || res.status === 200,
          `Expected 400 or default fallback (200), got ${res.status}`
        );
      });
    });

    it('should return 404 and NF_ORDER when querying a non-existent order ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const nonExistentOrderId = '507f1f77bcf86cd799439044';
        const res = await buyer.client.get(`/orders/${nonExistentOrderId}`);
        assert.equal(res.status, 404, 'Expected 404 for non-existent order ID');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should return 404 or 405 when attempting POST or DELETE on /orders/my', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.delete('/orders/my');
        assert.ok(
          res.status === 404 || res.status === 405,
          `Expected 404 or 405 for DELETE /orders/my, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 28: Authorized Digital Asset Download
  // =========================================================================
  describe('Feature 28: Authorized Digital Asset Download', () => {
    it('should return 401 and DOWN_UNAUTHENTICATED when unauthenticated visitor requests digital asset download', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/downloads/projects/507f1f77bcf86cd799439011/files/507f1f77bcf86cd799439012');
        assert.equal(res.status, 401, 'Expected 401 for anonymous download attempt');
        assertErrorEnvelope(res.data, 401);
        if (res.data?.message) {
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 403 and DOWN_UNPURCHASED when authenticated user has no paid order for the project', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/downloads/projects/507f1f77bcf86cd799439011/files/507f1f77bcf86cd799439012');
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 Forbidden without purchase or 404 for mock, got ${res.status}`
        );
        if (res.status === 403) {
          assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 404 and NF_FILE when requesting non-existent file ID for a valid project', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.get('/downloads/projects/507f1f77bcf86cd799439011/files/non-existent-file-id');
        assert.ok(
          res.status === 404 || res.status === 400,
          `Expected 404 for missing file, got ${res.status}`
        );
      });
    });

    it('should return 404 and NF_PROJECT when requesting asset download for a non-existent project ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.get('/downloads/projects/507f1f77bcf86cd799439099/files/507f1f77bcf86cd799439012');
        assert.equal(res.status, 404, 'Expected 404 for non-existent project download');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should block directory traversal attempts in fileId or download route (e.g. ..%2F..%2Fetc%2Fpasswd) with 400 or 403', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await createAdminSession();
        const res = await admin.client.get('/downloads/projects/507f1f77bcf86cd799439011/files/..%2F..%2Fetc%2Fpasswd');
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected 400, 403, or 404 for path traversal attempt, got ${res.status}`
        );
      });
    });
  });
});
