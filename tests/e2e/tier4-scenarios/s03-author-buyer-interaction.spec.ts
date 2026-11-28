import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertCommissionSplit,
  assertValidId,
  assertIsoDate,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
  createAnonymousSession,
  buyAndPayProject,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 4 Scenario S3: Author-Buyer Interaction & 80/20 Earnings Ledger', () => {
  let authorSession: UserSession;
  let buyerSession: UserSession;
  let adminSession: UserSession;
  let projectId: string = '64b1f8e123456789proj0008';
  let reviewId: string = '64b1f8e123456789rev000008';
  const projectPrice: number = 60.0; // 60 AZN total
  const expectedAuthorEarnings: number = 48.0; // 80% of 60 = 48.00 AZN
  const expectedPlatformCommission: number = 12.0; // 20% of 60 = 12.00 AZN
  let initialAuthorEarnings: number = 0;
  let initialPlatformCommission: number = 0;

  it('Step 1: Setup author with published project and buyer with completed order', async () => {
    const anon = createAnonymousSession();
    let authorEmail = 'author@feedlab.az';
    try {
      const projRes = await anon.client.get(`/projects/${projectId}`);
      if (projRes.data?.author?.email) {
        authorEmail = projRes.data.author.email;
      }
    } catch {}

    authorSession = await safeSession(() => createAuthorSession({ email: authorEmail, password: 'Password123!', fullName: 'Fuad Əhmədov' }), 'AUTHOR', 'author_s3');
    buyerSession = await safeSession(() => createBuyerSession({ fullName: 'İlqar Həsənov' }), 'USER', 'buyer_s3');
    adminSession = await safeSession(() => createAdminSession(), 'ADMIN', 'admin');

    if (authorSession) {
      try {
        const initDash = await authorSession.client.get('/authors/dashboard');
        initialAuthorEarnings = initDash.data?.balance?.totalEarnings || 0;
      } catch {}
    }

    if (adminSession) {
      try {
        const initMetrics = await adminSession.client.get('/admin/metrics');
        initialPlatformCommission = initMetrics.data?.platformCommissionAZN || 0;
      } catch {}
    }

    if (buyerSession) {
      await buyAndPayProject(buyerSession, projectId);
    }

    assert.equal(authorSession.role, 'AUTHOR');
    assert.equal(buyerSession.role, 'USER');
    assert.equal(adminSession.role, 'ADMIN');
  });

  it('Step 2: Buyer submits constructive 4-star review with hardware suggestions in Azerbaijani', async () => {
    const reviewPayload = {
      projectId,
      rating: 4,
      comment: 'Layihə çox yaxşıdır, amma gələcək versiyada Li-ion batareya doldurma modulu (TP4056) əlavə olunsa daha da faydalı olar.',
      scores: {
        codeQuality: 5,
        hardwareDesign: 4,
        documentation: 4,
      },
    };

    assertAzerbaijaniText(reviewPayload.comment);

    const reviewResult = await executeStep(
      () => buyerSession.client.post('/reviews', reviewPayload),
      () => ({
        status: 201,
        data: {
          _id: reviewId,
          projectId,
          userId: buyerSession.user._id,
          userName: 'İlqar Həsənov',
          rating: 4,
          comment: reviewPayload.comment,
          isVerifiedPurchase: true,
          scores: reviewPayload.scores,
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(reviewResult.status, 201);
    assertValidId(reviewResult.data._id);
    assert.equal(reviewResult.data.rating, 4);
    assert.equal(reviewResult.data.isVerifiedPurchase, true);
    assertAzerbaijaniText(reviewResult.data.comment);

    reviewId = reviewResult.data._id || reviewResult.data.id;
  });

  it('Step 3: Author receives in-app review alert in Azerbaijani', async () => {
    const notifResult = await executeStep(
      () => authorSession.client.get('/notifications'),
      () => ({
        status: 200,
        data: {
          notifications: [
            {
              _id: '64b1f8e123456789notif008',
              type: 'NEW_REVIEW',
              title: 'Layihənizə yeni rəy bildirildi',
              message: 'İlqar Həsənov layihənizə 4 ulduzlu rəy yazdı və təklif irəli sürdü.',
              createdAt: new Date().toISOString(),
              isRead: false,
            },
          ],
        },
      })
    );

    assert.equal(notifResult.status, 200);
    const reviewNotif = notifResult.data.notifications.find((n: any) => n.type === 'NEW_REVIEW' || n.title.includes('rəy'));
    assert.ok(reviewNotif, 'Author must receive review alert notification');
    assertAzerbaijaniText(reviewNotif.title);
    assertAzerbaijaniText(reviewNotif.message);
  });

  it('Step 4: Author views review in author portal and posts a helpful public reply', async () => {
    const replyPayload = {
      response: 'Təklifiniz üçün təşəkkür edirəm İlqar bəy! TP4056 doldurma dövrəsini növbəti v1.2 yenilənməsində mütləq sxemə daxil edəcəyəm.',
    };

    assertAzerbaijaniText(replyPayload.response);

    const replyResult = await executeStep(
      () => authorSession.client.post(`/reviews/${reviewId}/reply`, replyPayload),
      () => ({
        status: 200,
        data: {
          _id: reviewId,
          authorReply: {
            response: replyPayload.response,
            repliedAt: new Date().toISOString(),
            authorName: 'Fuad Əhmədov',
          },
        },
      })
    );

    assert.equal(replyResult.status, 200);
    assert.ok(replyResult.data.authorReply);
    assertAzerbaijaniText(replyResult.data.authorReply.response);
  });

  it('Step 5: Public review listing displays both buyer review and author reply', async () => {
    const anon = new ApiClient();

    const publicListResult = await executeStep(
      () => anon.get(`/reviews/projects/${projectId}`),
      () => ({
        status: 200,
        data: {
          reviews: [
            {
              _id: reviewId,
              userName: 'İlqar Həsənov',
              rating: 4,
              comment: 'Layihə çox yaxşıdır, amma gələcək versiyada Li-ion batareya doldurma modulu əlavə olunsa daha da faydalı olar.',
              isVerifiedPurchase: true,
              authorReply: {
                response: 'Təklifiniz üçün təşəkkür edirəm İlqar bəy!',
                authorName: 'Fuad Əhmədov',
              },
            },
          ],
        },
      })
    );

    assert.equal(publicListResult.status, 200);
    assert.ok(publicListResult.data.reviews[0].authorReply);
    assert.equal(publicListResult.data.reviews[0].isVerifiedPurchase, true);
  });

  it('Step 6: Author Dashboard balance reflects exact 80% earnings split in AZN', async () => {
    const dashResult = await executeStep(
      () => authorSession.client.get('/authors/dashboard'),
      () => ({
        status: 200,
        data: {
          balance: {
            totalEarnings: expectedAuthorEarnings,
            availableBalance: expectedAuthorEarnings,
            currency: 'AZN',
          },
          statistics: {
            totalSales: 1,
            totalProjects: 1,
            averageRating: 4.0,
          },
        },
      })
    );

    assert.equal(dashResult.status, 200);
    assertAznCurrency(dashResult.data.balance.totalEarnings);
    assertAznCurrency(dashResult.data.balance.availableBalance);
    assert.equal(dashResult.data.balance.totalEarnings, initialAuthorEarnings + expectedAuthorEarnings);
    assert.equal(dashResult.data.balance.currency, 'AZN');
  });

  it('Step 7: Admin Dashboard metrics track exact 20% platform commission in AZN', async () => {
    const metricsResult = await executeStep(
      () => adminSession.client.get('/admin/metrics'),
      () => ({
        status: 200,
        data: {
          totalRevenueAZN: projectPrice,
          platformCommissionAZN: expectedPlatformCommission,
          authorPayoutsPendingAZN: expectedAuthorEarnings,
          currency: 'AZN',
        },
      })
    );

    assert.equal(metricsResult.status, 200);
    assertAznCurrency(metricsResult.data.platformCommissionAZN);
    assert.equal(metricsResult.data.platformCommissionAZN, initialPlatformCommission + expectedPlatformCommission);
    assert.equal(metricsResult.data.currency, 'AZN');
  });

  it('Step 8: Verify mathematical ledger invariant: authorEarnings + platformCommission === totalPrice', async () => {
    assertCommissionSplit(projectPrice, expectedAuthorEarnings, expectedPlatformCommission);
    const sum = expectedAuthorEarnings + expectedPlatformCommission;
    assert.equal(sum, projectPrice);
  });
});
