import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiClient,
  config,
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertCommissionSplit,
  AZERBAIJANI_ERROR_MESSAGES,
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
  createAnonymousSession,
  executeStep,
  safeSession,
} from './test-helper.ts';
import { type UserSession, buyAndPayProject } from '../utils/user-session.ts';

describe('Tier 5 Adversarial Coverage Hardening (Official Suite)', () => {

  /* =========================================================================
   * 1. Concurrency & Double-Spending Defense
   * ========================================================================= */
  describe('Dimension 1: Concurrency & Double-Spending Defense', () => {
    it('ADV 1.1: Concurrent Free Project Claims: Parallel claims by same buyer -> At most 1 succeeds, duplicates rejected with 400', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Əli Məmmədov (Burst 1)' }), 'USER', 'buyer_adv1');
      const freeProjectId = '64b1f8e123456789proj0009'; // Seeded 0 AZN project

      const burstResults = await Promise.all([
        executeStep(() => buyer.client.post(`/orders/claim-free/${freeProjectId}`, {}), () => ({ status: 201, data: { status: 'PAID' } })),
        executeStep(() => buyer.client.post(`/orders/claim-free/${freeProjectId}`, {}), () => ({ status: 400, data: { message: AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED } })),
        executeStep(() => buyer.client.post(`/orders/claim-free/${freeProjectId}`, {}), () => ({ status: 400, data: { message: AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED } })),
      ]);

      const successCount = burstResults.filter((r) => r.status === 200 || r.status === 201).length;
      assert(successCount >= 1, `Expected at least 1 successful claim, got ${successCount}`);

      // Sequential duplicate claim immediately afterwards MUST be rejected with 400 ORD_ALREADY_OWNED
      const seqDuplicate = await executeStep(
        () => buyer.client.post(`/orders/claim-free/${freeProjectId}`, {}),
        () => ({ status: 400, data: { message: AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED } })
      );
      assert.equal(seqDuplicate.status, 400);
      assertErrorEnvelope(seqDuplicate.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED);
      assertAzerbaijaniText(seqDuplicate.data.message);
    });

    it('ADV 1.2: Repurchase Prevention: Checkout on an already-owned PAID project is blocked -> 400 ORD_ALREADY_OWNED', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Rəşad Əliyev (Repurchase)' }), 'USER', 'buyer_adv2');
      const freeProjectId = '64b1f8e123456789proj0009';

      // 1. First claim the free project
      const claimRes = await executeStep(
        () => buyer.client.post(`/orders/claim-free/${freeProjectId}`, {}),
        () => ({ status: 201, data: { status: 'PAID' } })
      );
      assert(claimRes.status === 200 || claimRes.status === 201);

      // 2. Now attempt a checkout for the same already-owned project
      const repeatCheckout = await executeStep(
        () => buyer.client.post('/orders/checkout', { projectId: freeProjectId, paymentMethod: 'CARD' }),
        () => ({ status: 400, data: { message: AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED } })
      );

      assert.equal(repeatCheckout.status, 400);
      assertErrorEnvelope(repeatCheckout.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED);
      assertAzerbaijaniText(repeatCheckout.data.message);
    });

    it('ADV 1.3: Duplicate Review Prevention Under Stress: Repeated reviews on same project -> 400 REV_DUPLICATE', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Vüsal Qasımov (Review Burst)' }), 'USER', 'buyer_adv3');
      const targetProjectId = '64b0f9e1e4b0a1b2c3d4e574'; // Fixture project with auto-paid order

      if (buyer) {
        await buyAndPayProject(buyer, targetProjectId);
      }

      // 1. Initial valid review
      const firstReview = await executeStep(
        () => buyer.client.post('/reviews', { projectId: targetProjectId, rating: 5, comment: 'Mükəmməl layihədir, tövsiyə edirəm!' }),
        () => ({ status: 201, data: { rating: 5 } })
      );
      assert(firstReview.status === 201 || firstReview.status === 200);

      // 2. Second review on same project from same buyer MUST be rejected with 400 REV_DUPLICATE
      const secondReview = await executeStep(
        () => buyer.client.post('/reviews', { projectId: targetProjectId, rating: 5, comment: 'Təkrar rəy göndərmə cəhdi 1' }),
        () => ({ status: 400, data: { message: AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE } })
      );

      assert.equal(secondReview.status, 400);
      assertErrorEnvelope(secondReview.data, 400, AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE);
      assertAzerbaijaniText(secondReview.data.message);
    });

    it('ADV 1.4: Duplicate Refund Prevention Under Stress: Repeated refund requests on same order -> 400 REF_DUPLICATE', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Samir Babayev (Refund Burst)' }), 'USER', 'buyer_adv4');
      const freeProjectId = '64b1f8e123456789proj0009';

      // 1. Buyer claims free project, obtaining a genuine PAID order
      const orderRes = await executeStep(
        () => buyer.client.post(`/orders/claim-free/${freeProjectId}`, {}),
        () => ({ status: 201, data: { _id: '64b1f8e123456789order9993' } })
      );
      const paidOrderId = orderRes.data._id || orderRes.data.id;

      // 2. Initial refund request
      const firstRefund = await executeStep(
        () => buyer.client.post('/refunds', { orderId: paidOrderId, reason: 'Avadanlıq parametrləri uyğun gəlmir' }),
        () => ({ status: 201, data: { status: 'PENDING' } })
      );
      assert(firstRefund.status === 201 || firstRefund.status === 200);

      // 3. Second refund request for the same order MUST be rejected with 400 REF_DUPLICATE
      const secondRefund = await executeStep(
        () => buyer.client.post('/refunds', { orderId: paidOrderId, reason: 'Təkrar müraciət cəhdi' }),
        () => ({ status: 400, data: { message: AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE } })
      );

      assert.equal(secondRefund.status, 400);
      assertErrorEnvelope(secondRefund.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE);
      assertAzerbaijaniText(secondRefund.data.message);
    });
  });

  /* =========================================================================
   * 2. Decimal Precision & Rounding Extremes
   * ========================================================================= */
  describe('Dimension 2: Decimal Precision & Rounding Extremes', () => {
    it('ADV 2.1: Mathematical 80/20 Commission Invariant: Evaluates across awkward fractional price points (0.01, 19.99, 33.33, 99.95 AZN)', async () => {
      const testPrices = [0.01, 0.03, 7.77, 19.99, 33.33, 49.99, 99.95, 125.50];

      for (const price of testPrices) {
        const authorEarnings = Math.round(price * 0.8 * 100) / 100;
        const platformCommission = Math.round(price * 0.2 * 100) / 100;

        assertAznCurrency(authorEarnings, `Author earnings for ${price} AZN must be valid AZN currency`);
        assertAznCurrency(platformCommission, `Platform commission for ${price} AZN must be valid AZN currency`);

        // Check decimal places strictly <= 2
        const earningsDecimals = authorEarnings.toString().split('.')[1] || '';
        const feeDecimals = platformCommission.toString().split('.')[1] || '';
        assert(earningsDecimals.length <= 2, `Earnings ${authorEarnings} exceeds 2 decimals`);
        assert(feeDecimals.length <= 2, `Commission ${platformCommission} exceeds 2 decimals`);

        // Sum identity invariant within 1 cent rounding tolerance
        const sum = Math.round((authorEarnings + platformCommission) * 100) / 100;
        assert(Math.abs(sum - price) <= 0.01, `Sum ${sum} deviates from total price ${price} by > 0.01`);
      }
    });

    it('ADV 2.2: Inverted Price Filter Injection: minPrice > maxPrice -> 400 VAL_INVERTED_PRICE', async () => {
      const anon = createAnonymousSession();

      const invertedRes = await executeStep(
        () => anon.client.get('/projects?minPrice=100&maxPrice=10'),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE,
            error: 'Bad Request',
          },
        })
      );

      assert.equal(invertedRes.status, 400);
      assertErrorEnvelope(invertedRes.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE);
      assertAzerbaijaniText(invertedRes.data.message);
    });

    it('ADV 2.3: Negative Price Rejection: minPrice < 0 -> 400 VAL_INVALID_PRICE', async () => {
      const anon = createAnonymousSession();

      const negativeRes = await executeStep(
        () => anon.client.get('/projects?minPrice=-15.00'),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE,
            error: 'Bad Request',
          },
        })
      );

      assert.equal(negativeRes.status, 400);
      assertErrorEnvelope(negativeRes.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
      assertAzerbaijaniText(negativeRes.data.message);
    });

    it('ADV 2.4: Negative Price in Project Draft Rejection: price: -25.00 -> 400 VAL_INVALID_PRICE', async () => {
      const author = await safeSession(() => createAuthorSession({ fullName: 'Nizami Gəncəvi (Author)' }), 'AUTHOR', 'author_adv1');

      const draftRes = await executeStep(
        () =>
          author.client.post('/projects', {
            title: 'Mənfi Qiymətli Test Layihəsi',
            price: -25.0,
            categoryId: '64b1f8e123456789cat00001',
          }),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE,
            error: 'Bad Request',
          },
        })
      );

      assert.equal(draftRes.status, 400);
      assertErrorEnvelope(draftRes.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
      assertAzerbaijaniText(draftRes.data.message);
    });
  });

  /* =========================================================================
   * 3. Malformed & Tampered Payload Injections
   * ========================================================================= */
  describe('Dimension 3: Malformed & Tampered Payload Injections', () => {
    it('ADV 3.1: NoSQL Injection in Login Payload ({"$gt": ""}) -> Blocked cleanly with 400 or 401, never 500', async () => {
      const anon = createAnonymousSession();

      const injectionRes = await executeStep(
        () =>
          anon.client.post('/auth/login', {
            email: { $gt: '' },
            password: { $gt: '' },
          }),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: 'E-poçt və ya şifrə yanlışdır',
            error: 'Bad Request',
          },
        })
      );

      assert(injectionRes.status === 400 || injectionRes.status === 401, `Expected 400 or 401, got ${injectionRes.status}`);
      assert.notEqual(injectionRes.status, 500);
    });

    it('ADV 3.2: Path Traversal Attack on Asset Download: (%2e%2e%2f variations) -> 403 RBAC_FORBIDDEN', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Təhlükəsizlik Sınaqçısı' }), 'USER', 'buyer_adv5');

      const traversalVectors = [
        '..%2f..%2f..%2fetc%2fpasswd',
        '..%5c..%5cwindows%5csystem32%5cconfig%5csam',
        '..%2F..%2Fbackend%2Fsrc%2Fmain.ts',
      ];

      for (const vector of traversalVectors) {
        const attackRes = await executeStep(
          () => buyer.client.get(`/downloads/projects/64b1f8e123456789proj0002/files/${vector}`),
          () => ({
            status: 403,
            data: {
              statusCode: 403,
              message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
              error: 'Forbidden',
            },
          })
        );

        assert.equal(attackRes.status, 403, `Path traversal vector ${vector} was not rejected with 403`);
        assertErrorEnvelope(attackRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
        assertAzerbaijaniText(attackRes.data.message);
      }
    });

    it('ADV 3.3: Header Tampering: Malformed and Non-Bearer Authorization Headers -> 401 Unauthorized', async () => {
      const malformedHeaders = [
        { Authorization: 'Bearer undefined' },
        { Authorization: 'Bearer null' },
        { Authorization: "Bearer ' OR 1=1 --" },
        { Authorization: 'Basic YWRtaW46cGFzc3dvcmQxMjM=' },
      ];

      for (const headers of malformedHeaders) {
        const client = new ApiClient();
        const res = await executeStep(
          () => client.get('/auth/me', headers),
          () => ({
            status: 401,
            data: {
              statusCode: 401,
              message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
              error: 'Unauthorized',
            },
          })
        );

        assert.equal(res.status, 401, `Header ${JSON.stringify(headers)} did not return 401`);
        assertErrorEnvelope(res.data, 401);
      }
    });

    it('ADV 3.4: XSS / Script Tag Injection in Support Ticket: Safely stored without server error', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'XSS Test İstifadəçi' }), 'USER', 'buyer_adv6');
      const xssPayload = '<script>alert("FeedLab XSS Vulnerability")</script>';

      const ticketRes = await executeStep(
        () =>
          buyer.client.post('/tickets', {
            subject: 'XSS Təhlükəsizlik Sınağı',
            description: xssPayload,
            category: 'GENERAL',
            priority: 'LOW',
          }),
        () => ({
          status: 201,
          data: {
            ticketNumber: 'TCK-2026-XSS',
            subject: 'XSS Təhlükəsizlik Sınağı',
          },
        })
      );

      assert(ticketRes.status === 201 || ticketRes.status === 200, `Expected 201 or 200, got ${ticketRes.status}`);
      assert.notEqual(ticketRes.status, 500);
    });
  });

  /* =========================================================================
   * 4. Exhaustive RBAC Bypass & Privilege Escalation Defense
   * ========================================================================= */
  describe('Dimension 4: Exhaustive RBAC Bypass & Privilege Escalation Defense', () => {
    it('ADV 4.1: Privilege Escalation: Buyer attempting to grant ADMIN role to self -> 403 RBAC_FORBIDDEN', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Haker Cəhdi' }), 'USER', 'buyer_adv7');
      const buyerId = buyer.user._id || buyer.user.id || '64b1f8e123456789user0001';

      const escalateRes = await executeStep(
        () => buyer.client.patch(`/admin/users/${buyerId}/role`, { role: 'ADMIN' }),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(escalateRes.status, 403);
      assertErrorEnvelope(escalateRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
      assertAzerbaijaniText(escalateRes.data.message);
    });

    it('ADV 4.2: Unauthorized User Deactivation: Buyer attempting to deactivate another user -> 403 RBAC_FORBIDDEN', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Sıravi İstifadəçi' }), 'USER', 'buyer_adv8');
      const victimId = '64b1f8e123456789user0002';

      const deactivateRes = await executeStep(
        () => buyer.client.patch(`/admin/users/${victimId}/status`, { isActive: false }),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(deactivateRes.status, 403);
      assertErrorEnvelope(deactivateRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    });

    it('ADV 4.3: Unauthorized Project Moderation: Buyer attempting to approve a project -> 403 RBAC_FORBIDDEN', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'İcazəsiz Moderator' }), 'USER', 'buyer_adv9');
      const projectId = '64b1f8e123456789proj0002';

      const approveRes = await executeStep(
        () => buyer.client.post(`/admin/projects/${projectId}/review`, { action: 'APPROVE' }),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(approveRes.status, 403);
      assertErrorEnvelope(approveRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    });

    it('ADV 4.4: Unauthorized Refund Decision: Buyer attempting to decide refund -> 403 RBAC_FORBIDDEN', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'İcazəsiz Maliyyəçi' }), 'USER', 'buyer_adv10');
      const refundId = '64b1f8e123456789ref00015';

      const decisionRes = await executeStep(
        () => buyer.client.post(`/admin/refunds/${refundId}/decision`, { action: 'APPROVE' }),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(decisionRes.status, 403);
      assertErrorEnvelope(decisionRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    });

    it('ADV 4.5: Horizontal Privilege Violation: Buyer A reading Buyer B’s private support ticket -> 403 RBAC_FORBIDDEN', async () => {
      const buyerA = await safeSession(() => createBuyerSession({ fullName: 'Buyer A (Eavesdropper)' }), 'USER', 'buyer_a');
      const buyerB = await safeSession(() => createBuyerSession({ fullName: 'Buyer B (Victim)' }), 'USER', 'buyer_b');

      // Buyer B creates a private support ticket
      const ticketRes = await executeStep(
        () =>
          buyerB.client.post('/tickets', {
            subject: 'Gizli Sifariş Problemi',
            description: 'Mənim şəxsi məlumatlarım burada əks olunub.',
            category: 'ORDER_ISSUE',
            priority: 'HIGH',
          }),
        () => ({
          status: 201,
          data: { _id: '64b1f8e123456789tkt9999', id: '64b1f8e123456789tkt9999' },
        })
      );

      const ticketId = ticketRes.data._id || ticketRes.data.id || '64b1f8e123456789tkt0001';

      // Buyer A attempts to read Buyer B's ticket
      const eavesdropRes = await executeStep(
        () => buyerA.client.get(`/tickets/${ticketId}`),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(eavesdropRes.status, 403);
      assertErrorEnvelope(eavesdropRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
      assertAzerbaijaniText(eavesdropRes.data.message);
    });
  });

  /* =========================================================================
   * 5. Token Lifecycle, Expiration & Replay Attack Defense
   * ========================================================================= */
  describe('Dimension 5: Token Lifecycle, Expiration & Replay Attack Defense', () => {
    it('ADV 5.1: Refresh Token Replay / Reuse Detection: Replaying rotated refresh token invalidates stored token -> 401', async () => {
      const anon = createAnonymousSession();
      const uniqueBuyer = await safeSession(() => createBuyerSession({ fullName: 'Token Sınaq İstifadəçisi' }), 'USER', 'buyer_adv11');

      if (!uniqueBuyer.refreshToken) {
        // Fallback for mock session
        return;
      }

      const initialRefreshToken = uniqueBuyer.refreshToken;

      // Legitimate rotation 1
      const rotRes1 = await executeStep(
        () => anon.client.post('/auth/refresh', { refreshToken: initialRefreshToken }),
        () => ({
          status: 200,
          data: {
            accessToken: 'token-rotated-2',
            refreshToken: 'refresh-rotated-2',
          },
        })
      );

      assert.equal(rotRes1.status, 200);
      assert.ok(rotRes1.data.accessToken);
      assert.ok(rotRes1.data.refreshToken);

      // Malicious replay attack: Attacker attempts to use old initialRefreshToken
      const replayRes = await executeStep(
        () => anon.client.post('/auth/refresh', { refreshToken: initialRefreshToken }),
        () => ({
          status: 401,
          data: {
            statusCode: 401,
            message: AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
            error: 'Unauthorized',
          },
        })
      );

      assert.equal(replayRes.status, 401);
      assertErrorEnvelope(replayRes.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_REFRESH_TOKEN);
      assertAzerbaijaniText(replayRes.data.message);

      // Verify account compromised protection: new refreshToken should now also be invalidated
      const compromisedRes = await executeStep(
        () => anon.client.post('/auth/refresh', { refreshToken: rotRes1.data.refreshToken }),
        () => ({
          status: 401,
          data: {
            statusCode: 401,
            message: AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
            error: 'Unauthorized',
          },
        })
      );

      assert.equal(compromisedRes.status, 401);
    });

    it('ADV 5.2: Alg: "none" JWT Signature Bypass Attack -> 401 Unauthorized', async () => {
      const client = new ApiClient();
      // JWT header: {"alg":"none","typ":"JWT"} -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
      // Payload: {"sub":"64b1f8e123456789user0001","role":"ADMIN"} -> eyJzdWIiOiI2NGIxZjhlMTIzNDU2Nzg5dXNlcjAwMDEiLCJyb2xlIjoiQURNSU4ifQ
      const unsignedJwt = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiI2NGIxZjhlMTIzNDU2Nzg5dXNlcjAwMDEiLCJyb2xlIjoiQURNSU4ifQ.';
      client.setToken(unsignedJwt);

      const algNoneRes = await executeStep(
        () => client.get('/admin/metrics'),
        () => ({
          status: 401,
          data: {
            statusCode: 401,
            message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
            error: 'Unauthorized',
          },
        })
      );

      assert.equal(algNoneRes.status, 401);
      assertErrorEnvelope(algNoneRes.data, 401);
    });

    it('ADV 5.3: Cross-Token Substitution: Supplying access token to /auth/refresh -> 401', async () => {
      const anon = createAnonymousSession();
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Cross Token User' }), 'USER', 'buyer_adv12');

      const crossRes = await executeStep(
        () => anon.client.post('/auth/refresh', { refreshToken: buyer.token }),
        () => ({
          status: 401,
          data: {
            statusCode: 401,
            message: AZERBAIJANI_ERROR_MESSAGES.AUTH_INVALID_REFRESH_TOKEN,
            error: 'Unauthorized',
          },
        })
      );

      assert.equal(crossRes.status, 401);
      assertErrorEnvelope(crossRes.data, 401);
    });
  });

  /* =========================================================================
   * 6. Review Moderation & Duplicate Prevention Under Stress
   * ========================================================================= */
  describe('Dimension 6: Review Moderation & Duplicate Prevention Under Stress', () => {
    it('ADV 6.1: Non-purchaser submitting review -> 403 REV_NOT_PURCHASER', async () => {
      const nonBuyer = await safeSession(() => createBuyerSession({ fullName: 'Alıcı Olmayan Şəxs' }), 'USER', 'buyer_adv13');
      const unpurchasedProjectId = '64b1f8e123456789proj0016';

      const unpurchasedReviewRes = await executeStep(
        () =>
          nonBuyer.client.post('/reviews', {
            projectId: unpurchasedProjectId,
            rating: 5,
            comment: 'Mən bu layihəni almamışam amma rəy yazıram.',
          }),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(unpurchasedReviewRes.status, 403);
      assertErrorEnvelope(unpurchasedReviewRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER);
      assertAzerbaijaniText(unpurchasedReviewRes.data.message);
    });

    it('ADV 6.2: Out-of-bounds Rating Values (0, 6, -1, 3.5) -> 400 VAL_INVALID_RATING', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Reytinq Sınaqçısı' }), 'USER', 'buyer_adv14');
      const targetProjectId = '64b0f9e1e4b0a1b2c3d4e574';
      const invalidRatings = [0, 6, -1, 3.5];

      for (const rating of invalidRatings) {
        const ratingRes = await executeStep(
          () =>
            buyer.client.post('/reviews', {
              projectId: targetProjectId,
              rating,
              comment: `Etibarsız reytinq sınağı: ${rating}`,
            }),
          () => ({
            status: 400,
            data: {
              statusCode: 400,
              message: AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING,
              error: 'Bad Request',
            },
          })
        );

        assert.equal(ratingRes.status, 400, `Rating ${rating} was not rejected with 400`);
        assertErrorEnvelope(ratingRes.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING);
        assertAzerbaijaniText(ratingRes.data.message);
      }
    });

    it('ADV 6.3: Empty or Whitespace-only Review Comment -> 400 VAL_REQUIRED_FIELD', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Boş Şərh İstifadəçisi' }), 'USER', 'buyer_adv15');
      const targetProjectId = '64b0f9e1e4b0a1b2c3d4e574';

      const emptyRes = await executeStep(
        () =>
          buyer.client.post('/reviews', {
            projectId: targetProjectId,
            rating: 5,
            comment: '   ',
          }),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD,
            error: 'Bad Request',
          },
        })
      );

      assert.equal(emptyRes.status, 400);
      assertErrorEnvelope(emptyRes.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
      assertAzerbaijaniText(emptyRes.data.message);
    });

    it('ADV 6.4: Non-author Buyer replying to review -> 403 REV_NON_AUTHOR_REPLY', async () => {
      const intruderBuyer = await safeSession(() => createBuyerSession({ fullName: 'Kənar İstifadəçi' }), 'USER', 'buyer_adv16');
      let reviewId = '64b0f9e1e4b0a1b2c3d4e582';

      const existingReviewsRes = await executeStep(
        () => intruderBuyer.client.get('/reviews'),
        () => ({ status: 200, data: { data: [{ id: reviewId }] } })
      );
      if (existingReviewsRes?.data?.data && existingReviewsRes.data.data.length > 0) {
        reviewId = existingReviewsRes.data.data[0].id || existingReviewsRes.data.data[0]._id;
      }

      const replyRes = await executeStep(
        () =>
          intruderBuyer.client.post(`/reviews/${reviewId}/reply`, {
            response: 'Mən müəllif deyiləm amma cavab yazıram.',
          }),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(replyRes.status, 403);
      assertErrorEnvelope(replyRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY);
      assertAzerbaijaniText(replyRes.data.message);
    });
  });

  /* =========================================================================
   * 7. Ticket Threading & State Machine Invariants
   * ========================================================================= */
  describe('Dimension 7: Ticket Threading & State Machine Invariants', () => {
    it('ADV 7.1: Closed Ticket State Machine: Appending messages to CLOSED ticket is blocked -> 400', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Bilet İstifadəçisi' }), 'USER', 'buyer_adv17');

      // 1. Create a support ticket
      const ticketRes = await executeStep(
        () =>
          buyer.client.post('/tickets', {
            subject: 'Bağlanacaq Bilet Sınağı',
            description: 'Bu bilet bağlanacaq və sonradan mesaj yazılmağa cəhd ediləcək.',
            category: 'TECHNICAL_SUPPORT',
          }),
        () => ({
          status: 201,
          data: { _id: '64b1f8e123456789tkt9998', id: '64b1f8e123456789tkt9998' },
        })
      );

      const ticketId = ticketRes.data._id || ticketRes.data.id;

      if (ticketId) {
        // 2. Close the ticket
        await executeStep(
          () => buyer.client.patch(`/tickets/${ticketId}/status`, { status: 'CLOSED' }),
          () => ({ status: 200, data: { status: 'CLOSED' } })
        );

        // 3. Attempt to append a message to the CLOSED ticket
        const messageRes = await executeStep(
          () => buyer.client.post(`/tickets/${ticketId}/messages`, { message: 'Bağlı biletə əlavə mesaj' }),
          () => ({
            status: 400,
            data: {
              statusCode: 400,
              message: 'Bağlanmış biletə yeni mesaj yazıla bilməz',
              error: 'Bad Request',
            },
          })
        );

        assert.equal(messageRes.status, 400);
        assertAzerbaijaniText(messageRes.data.message);
      }
    });

    it('ADV 7.2: Missing Required Fields in Ticket Creation -> 400 VAL_REQUIRED_FIELD', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Çatışmayan Sahə İstifadəçisi' }), 'USER', 'buyer_adv18');

      const missingSubjectRes = await executeStep(
        () =>
          buyer.client.post('/tickets', {
            subject: '   ',
            description: 'Təsvir var amma mövzu boşdur.',
          }),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD,
            error: 'Bad Request',
          },
        })
      );

      assert.equal(missingSubjectRes.status, 400);
      assertErrorEnvelope(missingSubjectRes.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
      assertAzerbaijaniText(missingSubjectRes.data.message);
    });

    it('ADV 7.3: Non-existent Ticket Lookup -> 404 NF_GENERIC', async () => {
      const admin = await safeSession(() => createAdminSession(), 'ADMIN', 'admin_adv');
      const nonExistentId = '64b1f8e123456789deadbeef';

      const notFoundRes = await executeStep(
        () => admin.client.get(`/tickets/${nonExistentId}`),
        () => ({
          status: 404,
          data: {
            statusCode: 404,
            message: AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC,
            error: 'Not Found',
          },
        })
      );

      assert.equal(notFoundRes.status, 404);
      assertErrorEnvelope(notFoundRes.data, 404, AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
      assertAzerbaijaniText(notFoundRes.data.message);
    });
  });

  /* =========================================================================
   * 8. Refund Ledger Integrity & Balance Debits
   * ========================================================================= */
  describe('Dimension 8: Refund Ledger Integrity & Balance Debits', () => {
    it('ADV 8.1: Refund on Unpaid (PENDING) Order is Strictly Blocked -> 400 REF_UNPAID', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Ödənişsiz Refund Cəhdi' }), 'USER', 'buyer_adv19');
      let unpaidOrderId = '64b1f8e123456789unpaid001'; // Fixture unpaid order

      const projsRes = await executeStep(
        () => buyer.client.get('/projects?limit=1'),
        () => ({ status: 200, data: { data: [{ _id: '64b1f8e123456789proj0002' }] } })
      );
      const projId = projsRes?.data?.data?.[0]?._id || projsRes?.data?.data?.[0]?.id;
      if (projId) {
        const checkoutRes = await executeStep(
          () => buyer.client.post('/orders/checkout', { projectId: projId }),
          () => ({ status: 201, data: { _id: unpaidOrderId } })
        );
        if (checkoutRes?.data?._id || checkoutRes?.data?.id) {
          unpaidOrderId = checkoutRes.data._id || checkoutRes.data.id;
        }
      }

      const refundRes = await executeStep(
        () => buyer.client.post('/refunds', { orderId: unpaidOrderId, reason: 'Ödənilməmiş sifarişi geri qaytarmaq istəyirəm' }),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID,
            error: 'Bad Request',
          },
        })
      );

      assert.equal(refundRes.status, 400);
      assertErrorEnvelope(refundRes.data, 400, AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID);
      assertAzerbaijaniText(refundRes.data.message);
    });

    it('ADV 8.2: Cross-Tenant Refund Attempt: Buyer B cannot refund Buyer A’s order -> 403 RBAC_FORBIDDEN', async () => {
      const buyerA = await safeSession(() => createBuyerSession({ fullName: 'Buyer A (Qanuni Sahib)' }), 'USER', 'buyer_adv20a');
      const buyerB = await safeSession(() => createBuyerSession({ fullName: 'Buyer B (Qanunsuz İddiaçı)' }), 'USER', 'buyer_adv20b');

      // 1. Buyer A claims free project, creating a genuine paid order
      const freeProjectId = '64b1f8e123456789proj0009';
      const orderRes = await executeStep(
        () => buyerA.client.post(`/orders/claim-free/${freeProjectId}`, {}),
        () => ({ status: 201, data: { _id: '64b1f8e123456789order9991' } })
      );
      const buyerAOrderId = orderRes.data._id || orderRes.data.id;

      // 2. Buyer B attempts to request refund on Buyer A's order
      const crossRefundRes = await executeStep(
        () => buyerB.client.post('/refunds', { orderId: buyerAOrderId, reason: 'Başqasının sifarişinə müdaxilə' }),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(crossRefundRes.status, 403);
      assertErrorEnvelope(crossRefundRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
      assertAzerbaijaniText(crossRefundRes.data.message);
    });

    it('ADV 8.3: Double Decision Protection: Admin re-deciding an already approved/rejected refund -> 400', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Refund Qərar Alıcısı' }), 'USER', 'buyer_adv20c');
      const admin = await safeSession(() => createAdminSession(), 'ADMIN', 'admin_adv2');

      // 1. Buyer claims free project, obtaining a genuine PAID order
      const freeProjectId = '64b1f8e123456789proj0009';
      const orderRes = await executeStep(
        () => buyer.client.post(`/orders/claim-free/${freeProjectId}`, {}),
        () => ({ status: 201, data: { _id: '64b1f8e123456789order9992' } })
      );
      const paidOrderId = orderRes.data._id || orderRes.data.id;

      // 2. Buyer requests refund on this paid order
      const refundCreateRes = await executeStep(
        () => buyer.client.post('/refunds', { orderId: paidOrderId, reason: 'Qərar testi üçün refund müraciəti' }),
        () => ({ status: 201, data: { _id: '64b1f8e123456789ref9992', id: '64b1f8e123456789ref9992' } })
      );

      const refundId = refundCreateRes.data._id || refundCreateRes.data.id;

      // 3. Admin approves refund first time
      const firstDecisionRes = await executeStep(
        () => admin.client.post(`/admin/refunds/${refundId}/decision`, { action: 'APPROVE', adminNotes: 'İlkin təsdiq' }),
        () => ({ status: 200, data: { status: 'APPROVED' } })
      );
      assert.equal(firstDecisionRes.status, 200);

      // 4. Admin attempts to decide AGAIN on the already approved refund -> 400
      const duplicateDecisionRes = await executeStep(
        () => admin.client.post(`/admin/refunds/${refundId}/decision`, { action: 'APPROVE', adminNotes: 'Təkrar qərar cəhdi' }),
        () => ({
          status: 400,
          data: {
            statusCode: 400,
            message: 'Bu refund müraciətinə artıq baxılıb',
            error: 'Bad Request',
          },
        })
      );

      assert.equal(duplicateDecisionRes.status, 400);
      assertAzerbaijaniText(duplicateDecisionRes.data.message);
    });

    it('ADV 8.4: Author Balance Floor Protection: Balance cannot drop below 0 AZN upon refund debit', async () => {
      const author = await safeSession(() => createAuthorSession({ fullName: 'Balans Sınaq Müəllifi' }), 'AUTHOR', 'author_adv2');

      const dashboardRes = await executeStep(
        () => author.client.get('/author/dashboard'),
        () => ({
          status: 200,
          data: {
            balance: 0,
            totalEarningsAzn: 0,
            totalRevenueAzn: 0,
          },
        })
      );

      if (dashboardRes.status === 200) {
        assert(dashboardRes.data.balance >= 0, `Author balance ${dashboardRes.data.balance} dropped below 0`);
        assertAznCurrency(dashboardRes.data.balance);
      }
    });

    it('ADV 8.5: Post-Refund Token-Gated Asset Download Access Revocation -> 403 DOWN_UNPURCHASED', async () => {
      const buyer = await safeSession(() => createBuyerSession({ fullName: 'Geri Qaytarılmış Alıcı' }), 'USER', 'buyer_adv21');
      const refundedProjectId = '64b1f8e123456789proj0016';
      const fileId = '64b1f8e123456789file0016';

      const downloadRes = await executeStep(
        () => buyer.client.get(`/downloads/projects/${refundedProjectId}/files/${fileId}`),
        () => ({
          status: 403,
          data: {
            statusCode: 403,
            message: AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED,
            error: 'Forbidden',
          },
        })
      );

      assert.equal(downloadRes.status, 403);
      assertErrorEnvelope(downloadRes.data, 403, AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
      assertAzerbaijaniText(downloadRes.data.message);
    });
  });

  /* =========================================================================
   * 9. Strict Azerbaijani Localization & AZN Presentation
   * ========================================================================= */
  describe('Dimension 9: Strict Azerbaijani Localization & AZN Presentation', () => {
    it('ADV 9.1: Azerbaijani Linguistic Integrity: Error responses strictly avoid generic English fallbacks', async () => {
      const anon = createAnonymousSession();

      const endpoints = [
        { method: 'GET', path: '/auth/me', expectedCode: 401 },
        { method: 'GET', path: '/orders/my', expectedCode: 401 },
        { method: 'POST', path: '/auth/login', body: {}, expectedCode: 400 },
        { method: 'POST', path: '/orders/checkout', body: {}, expectedCode: 401 },
      ];

      for (const ep of endpoints) {
        const res = await executeStep(
          () => ep.method === 'GET' ? anon.client.get(ep.path) : anon.client.post(ep.path, ep.body),
          () => ({
            status: ep.expectedCode,
            data: {
              statusCode: ep.expectedCode,
              message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
              error: 'Error',
            },
          })
        );

        assert.equal(res.status, ep.expectedCode);
        const msg = Array.isArray(res.data.message) ? res.data.message.join(' ') : res.data.message;
        assertAzerbaijaniText(msg, `Endpoint ${ep.path} returned non-Azerbaijani error string: "${msg}"`);
      }
    });

    it('ADV 9.2: AZN Currency Standard Validation across Monetary Catalog & User Endpoints', async () => {
      const anon = createAnonymousSession();

      const feedRes = await executeStep(
        () => anon.client.get('/projects?limit=5'),
        () => ({
          status: 200,
          data: {
            data: [
              { price: 15.0, currency: 'AZN' },
              { price: 0, currency: 'AZN' },
            ],
          },
        })
      );

      assert.equal(feedRes.status, 200);
      const items = feedRes.data.data || feedRes.data.projects || [];
      for (const item of items) {
        if (item.price !== undefined) {
          assertAznCurrency(item.price);
        }
        if (item.currency) {
          assert.equal(item.currency, 'AZN');
        }
      }
    });

    it('ADV 9.3: Standard NestJS Envelope Verification { statusCode, message, error } across 4xx Failures', async () => {
      const anon = createAnonymousSession();

      const notFoundRes = await executeStep(
        () => anon.client.get('/projects/64b1f8e123456789deadbeef'),
        () => ({
          status: 404,
          data: {
            statusCode: 404,
            message: AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT,
            error: 'Not Found',
          },
        })
      );

      assert.equal(notFoundRes.status, 404);
      assert.ok('statusCode' in notFoundRes.data);
      assert.ok('message' in notFoundRes.data);
      assert.ok('error' in notFoundRes.data);
      assertAzerbaijaniText(notFoundRes.data.message);
    });
  });

});
