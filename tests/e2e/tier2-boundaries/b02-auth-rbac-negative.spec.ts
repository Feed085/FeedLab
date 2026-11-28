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

describe('Tier 2 — B02 Auth & RBAC Negative & Boundary Cases (Features 4–9)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 4: User Registration Boundaries
  // =========================================================================
  describe('Feature 4: User Registration', () => {
    it('should reject registration when email is already registered with 409 Conflict and AUTH_EMAIL_EXISTS', async (t) => {
      await withOfflineSkip(t, async () => {
        const email = generateUniqueEmail('dup_user');
        // Register first time
        const first = await client.post('/auth/register', {
          email,
          password: 'Password123!',
          fullName: 'İlk Qeydiyyat',
        });
        if (first.status === 201) {
          // Register second time with same email
          const duplicate = await client.post('/auth/register', {
            email,
            password: 'Password123!',
            fullName: 'Təkrar Qeydiyyat',
          });
          assert.equal(duplicate.status, 409, 'Expected 409 Conflict for duplicate email');
          assertErrorEnvelope(duplicate.data, 409, AZERBAIJANI_ERROR_MESSAGES.AUTH_EMAIL_EXISTS);
          assertAzerbaijaniText(duplicate.data.message);
        }
      });
    });

    it('should reject registration when password is less than 8 characters with 400 and VAL_SHORT_PASSWORD', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/register', {
          email: generateUniqueEmail('short_pwd'),
          password: 'short',
          fullName: 'Qısa Şifrə',
        });
        assert.equal(res.status, 400, 'Expected 400 for short password');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_SHORT_PASSWORD);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject registration when email format is invalid with 400 and VAL_INVALID_EMAIL', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/register', {
          email: 'not-an-email-format',
          password: 'Password123!',
          fullName: 'Səhv Email',
        });
        assert.equal(res.status, 400, 'Expected 400 for invalid email format');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_EMAIL);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject registration when required fields are missing with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/register', {
          email: generateUniqueEmail('missing_field'),
          // password omitted
          fullName: 'Çatışmayan Xana',
        });
        assert.equal(res.status, 400, 'Expected 400 for missing password');
        assertErrorEnvelope(res.data, 400);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should ignore or reject direct role escalation to ADMIN or AUTHOR during registration', async (t) => {
      await withOfflineSkip(t, async () => {
        const email = generateUniqueEmail('escalate');
        const res = await client.post('/auth/register', {
          email,
          password: 'Password123!',
          fullName: 'Role Spoof User',
          role: 'ADMIN',
        });
        if (res.status === 201) {
          const userRole = res.data?.user?.role;
          assert.notEqual(userRole, 'ADMIN', 'Registration must not permit unauthorized role escalation to ADMIN');
        } else {
          assert.equal(res.status, 400, 'Expected 400 if server actively rejects privileged role payload');
        }
      });
    });
  });

  // =========================================================================
  // Feature 5: User Login Boundaries
  // =========================================================================
  describe('Feature 5: User Login', () => {
    it('should reject login with wrong password for existing user with 401 and AUTH_INVALID_CREDENTIALS', async (t) => {
      await withOfflineSkip(t, async () => {
        const email = generateUniqueEmail('wrong_pwd_user');
        await client.post('/auth/register', {
          email,
          password: 'CorrectPassword123!',
          fullName: 'Düzgün İstifadəçi',
        });

        const res = await client.post('/auth/login', {
          email,
          password: 'IncorrectPassword999!',
        });
        assert.equal(res.status, 401, 'Expected 401 Unauthorized for incorrect password');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject login for non-existent email with 401 and AUTH_INVALID_CREDENTIALS', async (t) => {
      await withOfflineSkip(t, async () => {
        const nonExistentEmail = `nonexistent_${Date.now()}@feedlab.az`;
        const res = await client.post('/auth/login', {
          email: nonExistentEmail,
          password: 'SomePassword123!',
        });
        assert.equal(res.status, 401, 'Expected 401 Unauthorized for non-existent email');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject login when email or password is missing with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/login', {
          email: 'test@feedlab.az',
          // password omitted
        });
        assert.equal(res.status, 400, 'Expected 400 Bad Request when password is missing');
        assertErrorEnvelope(res.data, 400);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject login with malformed email format with 400 and VAL_INVALID_EMAIL', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/login', {
          email: 'not-valid-email',
          password: 'Password123!',
        });
        assert.equal(res.status, 400, 'Expected 400 Bad Request for malformed email on login');
        assertErrorEnvelope(res.data, 400);
      });
    });

    it('should safely reject login attempt with extremely long password (>1000 chars) without crash', async (t) => {
      await withOfflineSkip(t, async () => {
        const longPassword = 'P'.repeat(1500) + '1!';
        const res = await client.post('/auth/login', {
          email: 'admin@feedlab.az',
          password: longPassword,
        });
        assert.ok(
          res.status === 400 || res.status === 401,
          `Expected 400 or 401 for oversized password, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 6: Refresh Token Rotation
  // =========================================================================
  describe('Feature 6: Refresh Token Rotation', () => {
    it('should reject refresh request with missing refresh token with 400 or 401', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/refresh', {});
        assert.ok(
          res.status === 400 || res.status === 401,
          `Expected 400 or 401 for empty refresh payload, got ${res.status}`
        );
      });
    });

    it('should reject refresh request with malformed or invalid token with 401 and AUTH_INVALID_REFRESH_TOKEN', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/refresh', {
          refreshToken: 'malformed.garbage.token-string',
        });
        assert.equal(res.status, 401, 'Expected 401 for invalid refresh token');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_REFRESH_TOKEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject refresh request with expired refresh token with 401 and AUTH_INVALID_REFRESH_TOKEN', async (t) => {
      await withOfflineSkip(t, async () => {
        // Expired mock token with past expiry
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.4-placeholder-sig';
        const res = await client.post('/auth/refresh', {
          refreshToken: expiredToken,
        });
        assert.equal(res.status, 401, 'Expected 401 for expired refresh token');
        assertErrorEnvelope(res.data, 401);
      });
    });

    it('should reject refresh request with tampered JWT signature with 401', async (t) => {
      await withOfflineSkip(t, async () => {
        const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.tamperedSignatureX999';
        const res = await client.post('/auth/refresh', {
          refreshToken: tamperedToken,
        });
        assert.equal(res.status, 401, 'Expected 401 for tampered token');
      });
    });

    it('should detect and reject reuse of an already rotated refresh token', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        if (buyer.refreshToken) {
          // First rotation
          const firstRefresh = await client.post('/auth/refresh', {
            refreshToken: buyer.refreshToken,
          });
          if (firstRefresh.status === 200) {
            // Second attempt using the now revoked previous token
            const secondRefresh = await client.post('/auth/refresh', {
              refreshToken: buyer.refreshToken,
            });
            assert.equal(secondRefresh.status, 401, 'Reused refresh token must be rejected with 401');
          }
        }
      });
    });
  });

  // =========================================================================
  // Feature 7: Current User Profile (/auth/me)
  // =========================================================================
  describe('Feature 7: Current User Profile (/auth/me)', () => {
    it('should return 401 and AUTH_UNAUTHORIZED when Authorization header is missing', async (t) => {
      await withOfflineSkip(t, async () => {
        const anonClient = new ApiClient();
        const res = await anonClient.get('/auth/me');
        assert.equal(res.status, 401, 'Expected 401 for missing Authorization header');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 401 when Authorization header contains invalid or garbage Bearer token', async (t) => {
      await withOfflineSkip(t, async () => {
        const anonClient = new ApiClient();
        const res = await anonClient.get('/auth/me', {
          Authorization: 'Bearer invalid.corrupted.jwt-token',
        });
        assert.equal(res.status, 401, 'Expected 401 for invalid Bearer token');
        assertErrorEnvelope(res.data, 401);
      });
    });

    it('should return 401 when Authorization scheme is not Bearer (e.g. Basic)', async (t) => {
      await withOfflineSkip(t, async () => {
        const anonClient = new ApiClient();
        const res = await anonClient.get('/auth/me', {
          Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
        });
        assert.equal(res.status, 401, 'Expected 401 for non-Bearer auth scheme');
      });
    });

    it('should return 401 when Bearer token is expired', async (t) => {
      await withOfflineSkip(t, async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.mock';
        const anonClient = new ApiClient();
        const res = await anonClient.get('/auth/me', {
          Authorization: `Bearer ${expiredToken}`,
        });
        assert.equal(res.status, 401, 'Expected 401 for expired token');
      });
    });

    it('should return 401 when Authorization header has empty Bearer token value', async (t) => {
      await withOfflineSkip(t, async () => {
        const anonClient = new ApiClient();
        const res = await anonClient.get('/auth/me', {
          Authorization: 'Bearer ',
        });
        assert.equal(res.status, 401, 'Expected 401 for empty Bearer token');
      });
    });
  });

  // =========================================================================
  // Feature 8: Password Reset Flow Boundaries
  // =========================================================================
  describe('Feature 8: Password Reset Flow', () => {
    it('should reject password reset request for invalid or malformed email format with 400 and VAL_INVALID_EMAIL', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/forgot-password', {
          email: 'not-a-valid-email-string',
        });
        assert.equal(res.status, 400, 'Expected 400 for malformed email on forgot-password');
        assertErrorEnvelope(res.data, 400);
      });
    });

    it('should reject reset confirmation with missing or empty reset token with 400 or 404', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/reset-password', {
          token: '',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 or 404 for empty reset token, got ${res.status}`
        );
      });
    });

    it('should reject reset confirmation with invalid or expired reset token with 400/404 and AUTH_INVALID_RESET_TOKEN', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/reset-password', {
          token: 'invalid-or-expired-reset-token-xyz',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 or 404 for invalid reset token, got ${res.status}`
        );
        if (res.status === 400 || res.status === 404) {
          assertErrorEnvelope(res.data, res.status, AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_RESET_TOKEN);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should reject reset confirmation when new password is less than 8 characters with 400 and VAL_SHORT_PASSWORD', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/reset-password', {
          token: 'sample-token',
          newPassword: 'short',
          confirmPassword: 'short',
        });
        assert.equal(res.status, 400, 'Expected 400 for short reset password');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_SHORT_PASSWORD);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject reset confirmation when passwords do not match with 400 and VAL_PASSWORD_MISMATCH', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await client.post('/auth/reset-password', {
          token: 'sample-token',
          newPassword: 'Password123!',
          confirmPassword: 'DifferentPassword456!',
        });
        assert.equal(res.status, 400, 'Expected 400 for password mismatch');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_PASSWORD_MISMATCH);
        assertAzerbaijaniText(res.data.message);
      });
    });
  });

  // =========================================================================
  // Feature 9: Role-Based Access Control (RBAC)
  // =========================================================================
  describe('Feature 9: Role-Based Access Control (RBAC)', () => {
    it('should return 403 and RBAC_FORBIDDEN when standard buyer accesses admin metrics (/admin/metrics)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/admin/metrics');
        assert.equal(res.status, 403, 'Expected 403 Forbidden for buyer accessing admin metrics');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when standard buyer accesses author dashboard (/authors/dashboard)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/authors/dashboard');
        assert.equal(res.status, 403, 'Expected 403 Forbidden for buyer accessing author dashboard');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor accesses protected review queue (/admin/projects/queue)', async (t) => {
      await withOfflineSkip(t, async () => {
        const anonClient = new ApiClient();
        const res = await anonClient.get('/admin/projects/queue');
        assert.equal(res.status, 401, 'Expected 401 Unauthorized for unauthenticated access to admin queue');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 403 and RBAC_FORBIDDEN when author attempts to access admin user management (/admin/users)', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.get('/admin/users');
        assert.equal(res.status, 403, 'Expected 403 Forbidden for author accessing admin user management');
        assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject requests attempting role spoofing via custom headers (e.g. X-User-Role: ADMIN)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.get('/admin/metrics', {
          'X-User-Role': 'ADMIN',
          'X-Role': 'ADMIN',
        });
        assert.equal(res.status, 403, 'Role spoofing headers must be ignored and return 403');
      });
    });
  });
});
