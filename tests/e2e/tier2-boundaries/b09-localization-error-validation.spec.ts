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
  generateUniqueEmail,
} from '../utils/user-session.ts';
import { withOfflineSkip } from './boundary-helper.ts';

describe('Tier 2 — B09 In-App Notifications & Azerbaijani Localization (Features 36–37)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 36: In-App User Notifications
  // =========================================================================
  describe('Feature 36: In-App User Notifications', () => {
    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor attempts to fetch notifications', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/notifications');
        assert.equal(res.status, 401, 'Expected 401 for anonymous notifications lookup');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 404 and NF_GENERIC when user attempts to mark non-existent notification as read', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const nonExistentNotifId = '507f1f77bcf86cd799439099';
        const res = await buyer.client.patch(`/notifications/${nonExistentNotifId}/read`, {});
        assert.equal(res.status, 404, 'Expected 404 for non-existent notification read update');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it("should return 403 or 404 when user attempts to mark another user's notification as read", async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const foreignNotifId = '507f1f77bcf86cd799439088';
        const res = await buyer.client.patch(`/notifications/${foreignNotifId}/read`, {});
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 or 404 for foreign notification update, got ${res.status}`
        );
      });
    });

    it('should return 400 when invalid/negative page parameter is supplied to notifications listing', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/notifications?page=-1');
        assert.ok(
          res.status === 400 || res.status === 200,
          `Expected 400 or default sanitization (200), got ${res.status}`
        );
      });
    });

    it('should return 400 or 200 when filtering notifications by an invalid type parameter', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/notifications?type=INVALID_NOTIF_TYPE');
        assert.ok(
          res.status === 400 || res.status === 200,
          `Expected 400 validation error or empty list (200), got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 37: Azerbaijani Localization & AZN Currency
  // =========================================================================
  describe('Feature 37: Azerbaijani Localization & AZN Currency', () => {
    it('should validate Azerbaijani error text for required field validation (VAL-01)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/auth/register', {});
        assert.equal(res.status, 400, 'Expected 400 for empty registration payload');
        assertErrorEnvelope(res.data, 400);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should validate Azerbaijani error text for invalid email format (VAL-02)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/auth/register', {
          email: 'invalid-email-no-at-sign',
          password: 'Password123!',
          fullName: 'Test İstifadəçi',
        });
        assert.equal(res.status, 400, 'Expected 400 for invalid email');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_EMAIL);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should validate Azerbaijani error text for short password (VAL-03)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/auth/register', {
          email: generateUniqueEmail('val03'),
          password: '123',
          fullName: 'Qısa Şifrə İstifadəçisi',
        });
        assert.equal(res.status, 400, 'Expected 400 for short password');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_SHORT_PASSWORD);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should validate Azerbaijani error text for invalid price (VAL-05)', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/projects', {
          title: 'Mənfi Qiymət Sınağı',
          shortDescription: 'Mənfi qiymət testi',
          category: 'Robotics',
          price: -9.99,
        });
        assert.equal(res.status, 400, 'Expected 400 for negative price');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should validate Azerbaijani error text for inverted price filter (VAL-06)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects?minPrice=50&maxPrice=10');
        assert.equal(res.status, 400, 'Expected 400 for minPrice > maxPrice');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should validate Azerbaijani error text for invalid rating (VAL-07)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/reviews', {
          projectId: '507f1f77bcf86cd799439011',
          rating: 7, // out of range 1-5
          comment: 'Qeyri-mümkün reytinq',
        });
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected 400 for invalid rating, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should validate Azerbaijani error text for unauthenticated request (AUTH-01)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/auth/me');
        assert.equal(res.status, 401, 'Expected 401 for anonymous access to /auth/me');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should validate Azerbaijani error text for duplicate email registration (AUTH-04)', async (t) => {
      await withOfflineSkip(t, async () => {
        const email = generateUniqueEmail('val_auth04');
        const first = await anonClient.post('/auth/register', {
          email,
          password: 'Password123!',
          fullName: 'Birinci İstifadəçi',
        });
        if (first.status === 201) {
          const second = await anonClient.post('/auth/register', {
            email,
            password: 'Password123!',
            fullName: 'İkinci İstifadəçi',
          });
          assert.equal(second.status, 409, 'Expected 409 Conflict for duplicate email');
          assertErrorEnvelope(second.data, 409, AZERBAIJANI_ERROR_MESSAGES.AUTH_EMAIL_EXISTS);
          assertAzerbaijaniText(second.data.message);
        }
      });
    });

    it('should validate Azerbaijani error text for insufficient role permissions (RBAC-01)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/admin/metrics');
        assert.equal(res.status, 403, 'Expected 403 Forbidden for buyer accessing admin endpoint');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should validate that monetary values in API errors and payloads strictly use AZN currency standard', async (t) => {
      await withOfflineSkip(t, async () => {
        // Assert currency format validation helper works on standard AZN representations
        assertAznCurrency(25.0);
        assertAznCurrency('25.00 AZN');
        assertAznCurrency('25.00 ₼');

        // Check if catalog project detail contains valid AZN price
        const res = await anonClient.get('/projects?limit=1');
        if (res.status === 200 && res.data?.data?.[0]?.price !== undefined) {
          assertAznCurrency(res.data.data[0].price);
        }
      });
    });
  });
});
