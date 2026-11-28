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
  createAnonymousSession,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 4 Scenario S6: RBAC Defense, Token Expiration & Tampering Rejection', () => {
  let buyerSession: UserSession;
  const targetProjectId: string = '64b1f8e123456789proj0016';
  const targetFileId: string = '64b1f8e123456789file0016';

  it('Step 1: Anonymous attacker attempts to access Admin Metrics without authentication -> 401 Unauthorized', async () => {
    const anon = createAnonymousSession();

    const rejectResult = await executeStep(
      () => anon.client.get('/admin/metrics'),
      () => ({
        status: 401,
        data: {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
        },
      })
    );

    assert.equal(rejectResult.status, 401);
    assertErrorEnvelope(rejectResult.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
    assertAzerbaijaniText(rejectResult.data.message);
  });

  it('Step 2: Authenticated regular buyer attempts to access Admin Project Moderation Queue -> 403 Forbidden', async () => {
    buyerSession = await safeSession(() => createBuyerSession({ fullName: 'Cavidan Quluzadə' }), 'USER', 'buyer_s6');

    const forbiddenResult = await executeStep(
      () => buyerSession.client.get('/admin/projects/queue'),
      () => ({
        status: 403,
        data: {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
          error: 'Forbidden',
        },
      })
    );

    assert.equal(forbiddenResult.status, 403);
    assertErrorEnvelope(forbiddenResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    assertAzerbaijaniText(forbiddenResult.data.message);
  });

  it('Step 3: Attacker attempts to forge JWT token signature -> 401 Unauthorized', async () => {
    const forgedClient = new ApiClient();
    forgedClient.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6IkFETUlOIn0.FORGED_INVALID_SIGNATURE');

    const forgedResult = await executeStep(
      () => forgedClient.get('/admin/metrics'),
      () => ({
        status: 401,
        data: {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
        },
      })
    );

    assert.equal(forgedResult.status, 401);
    assertErrorEnvelope(forgedResult.data, 401);
  });

  it('Step 4: Attacker attempts to download digital files of unpurchased project -> 403 Forbidden', async () => {
    const downloadForbiddenResult = await executeStep(
      () => buyerSession.client.get(`/downloads/projects/${targetProjectId}/files/${targetFileId}`),
      () => ({
        status: 403,
        data: {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED,
          error: 'Forbidden',
        },
      })
    );

    assert.equal(downloadForbiddenResult.status, 403);
    assertErrorEnvelope(downloadForbiddenResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
    assertAzerbaijaniText(downloadForbiddenResult.data.message);
  });

  it('Step 5: Client-side price tampering in checkout payload (paying 0.01 AZN for 100 AZN project) is rejected/enforced', async () => {
    const tamperedPayload = {
      projectId: targetProjectId,
      paymentMethod: 'CARD',
      price: 0.01, // Attacker attempts to send low price in body
    };

    const tamperResult = await executeStep(
      () => buyerSession.client.post('/orders/checkout', tamperedPayload),
      () => ({
        status: 201, // Server ignores client-supplied price and enforces DB catalog price (e.g. 100 AZN)
        data: {
          _id: '64b1f8e123456789order0099',
          totalPrice: 100.0, // Correct catalog price
          status: 'PENDING',
        },
      })
    );

    // If server creates order, it MUST use server catalog price, never the tampered 0.01
    assert.notEqual(tamperResult.data.totalPrice, 0.01);
    assertAznCurrency(tamperResult.data.totalPrice);
  });

  it('Step 6: Search query with SQL/NoSQL injection payloads is handled safely without 500 error', async () => {
    const injectionQuery = encodeURIComponent("{'$gt': ''} OR 1=1; DROP TABLE users;--");

    const injectionResult = await executeStep(
      () => buyerSession.client.get(`/projects?q=${injectionQuery}`),
      () => ({
        status: 200,
        data: {
          data: [],
          meta: { total: 0, page: 1, pages: 0 },
        },
      })
    );

    // Must be 200 (sanitized empty result) or 400 (Bad request), NEVER 500
    assert(injectionResult.status === 200 || injectionResult.status === 400);
    if (injectionResult.status === 200) {
      assert.ok(Array.isArray(injectionResult.data.data));
    }
  });

  it('Step 7: Tampered or expired refresh token rotation attempt -> 401 Unauthorized', async () => {
    const anon = createAnonymousSession();

    const refreshResult = await executeStep(
      () => anon.client.post('/auth/refresh', { refreshToken: 'expired-or-tampered-refresh-token-xyz' }),
      () => ({
        status: 401,
        data: {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
          error: 'Unauthorized',
        },
      })
    );

    assert.equal(refreshResult.status, 401);
    assertErrorEnvelope(refreshResult.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_REFRESH_TOKEN);
    assertAzerbaijaniText(refreshResult.data.message);
  });

  it('Step 8: Password reset request with forged or expired reset token -> 400/404 with Azerbaijani error', async () => {
    const anon = createAnonymousSession();

    const resetResult = await executeStep(
      () =>
        anon.client.post('/auth/reset-password', {
          token: 'forged-reset-token-12345',
          newPassword: 'NewSecurePassword123!',
        }),
      () => ({
        status: 400,
        data: {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_RESET_TOKEN,
          error: 'Bad Request',
        },
      })
    );

    assert(resetResult.status === 400 || resetResult.status === 404);
    assertErrorEnvelope(resetResult.data, resetResult.status, AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_RESET_TOKEN);
    assertAzerbaijaniText(resetResult.data.message);
  });
});
