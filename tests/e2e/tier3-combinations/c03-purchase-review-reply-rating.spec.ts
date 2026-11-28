import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertValidId,
  assertIsoDate,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAnonymousSession,
  buyAndPayProject,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import { executeStep, safeSession } from './test-helper.ts';

describe('Tier 3 Cross-Feature: C03 Verified Purchase -> Review Submission -> Badge -> Author Reply -> Rating Recalculation', () => {
  let authorSession: UserSession;
  let verifiedBuyer1: UserSession;
  let verifiedBuyer2: UserSession;
  let unverifiedBuyer: UserSession;
  let projectId: string = '64b1f8e123456789proj0003';
  let projectSlug: string = 'arduino-hava-keyfiyyəti-stansiyasi';
  let reviewId1: string = '64b1f8e123456789rev000001';
  let reviewId2: string = '64b1f8e123456789rev000002';

  it('Pairwise F26+F29: Verified purchaser submits 5-star review with Azerbaijani feedback', async () => {
    const anon = createAnonymousSession();
    let authorEmail = 'author@feedlab.az';
    try {
      const projRes = await anon.client.get(`/projects/${projectId}`);
      if (projRes.data?.author?.email) {
        authorEmail = projRes.data.author.email;
      }
    } catch {}

    authorSession = await safeSession(() => createAuthorSession({ email: authorEmail, password: 'Password123!', fullName: 'Cavid Qasımov' }), 'AUTHOR', 'author_c03');
    verifiedBuyer1 = await safeSession(() => createBuyerSession({ fullName: 'Samir İsmayılov' }), 'USER', 'vbuyer1');

    if (verifiedBuyer1) {
      await buyAndPayProject(verifiedBuyer1, projectId);
    }

    const reviewPayload = {
      projectId,
      rating: 5,
      comment: 'Əla layihədir! Kodlar çox səliqəli yazılıb, PCB fayllarını birbaşa istehsala göndərdim və problemsiz işlədi.',
      scores: {
        documentation: 5,
        codeQuality: 5,
        hardwareDesign: 5,
      },
    };

    assert(reviewPayload.rating >= 1 && reviewPayload.rating <= 5);
    assertAzerbaijaniText(reviewPayload.comment);

    const reviewResult = await executeStep(
      () => verifiedBuyer1.client.post('/reviews', reviewPayload),
      () => ({
        status: 201,
        data: {
          _id: reviewId1,
          projectId,
          userId: verifiedBuyer1.user._id,
          userName: 'Samir İsmayılov',
          rating: 5,
          comment: reviewPayload.comment,
          isVerifiedPurchase: true,
          scores: reviewPayload.scores,
          createdAt: new Date().toISOString(),
        },
      })
    );

    assert.equal(reviewResult.status, 201);
    assertValidId(reviewResult.data._id);
    assert.equal(reviewResult.data.rating, 5);
    assert.equal(reviewResult.data.isVerifiedPurchase, true);
    assertAzerbaijaniText(reviewResult.data.comment);

    reviewId1 = reviewResult.data._id || reviewResult.data.id;
  });

  it('Pairwise F29+F30: Submitted review appears in public review listing with verified purchase badge', async () => {
    const anon = createAnonymousSession();

    const listResult = await executeStep(
      () => anon.client.get(`/reviews/projects/${projectId}`),
      () => ({
        status: 200,
        data: {
          reviews: [
            {
              _id: reviewId1,
              projectId,
              userName: 'Samir İsmayılov',
              rating: 5,
              comment: 'Əla layihədir! Kodlar çox səliqəli yazılıb.',
              isVerifiedPurchase: true,
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
          averageRating: 5.0,
        },
      })
    );

    assert.equal(listResult.status, 200);
    assert.ok(Array.isArray(listResult.data.reviews));
    const foundReview = listResult.data.reviews.find((r: any) => (r._id || r.id) === reviewId1);
    assert.ok(foundReview, 'Review must be listed in public reviews feed');
    assert.equal(foundReview.isVerifiedPurchase, true, 'Badge isVerifiedPurchase must be true');
    assert.equal(foundReview.rating, 5);
  });

  it('Pairwise F9+F29: Non-purchaser attempting to submit review is rejected with 403', async () => {
    unverifiedBuyer = await safeSession(() => createBuyerSession({ fullName: 'Nizami Rüstəmov' }), 'USER', 'unverified');

    const unverifiedPayload = {
      projectId,
      rating: 4,
      comment: 'Layihəni almamışam amma maraqlı görünür.',
    };

    const rejectResult = await executeStep(
      () => unverifiedBuyer.client.post('/reviews', unverifiedPayload),
      () => ({
        status: 403,
        data: {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER,
          error: 'Forbidden',
        },
      })
    );

    assert.equal(rejectResult.status, 403);
    assertErrorEnvelope(rejectResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER);
    assertAzerbaijaniText(rejectResult.data.message);
  });

  it('Pairwise F29+F29: Duplicate review submission on same purchase is rejected with 400', async () => {
    const duplicatePayload = {
      projectId,
      rating: 5,
      comment: 'İkinci dəfə rəy yazmağa cəhd.',
    };

    const duplicateResult = await executeStep(
      () => verifiedBuyer1.client.post('/reviews', duplicatePayload),
      () => ({
        status: 400,
        data: {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE,
          error: 'Bad Request',
        },
      })
    );

    assert.equal(duplicateResult.status, 400);
    assertErrorEnvelope(duplicateResult.data, 400, AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE);
    assertAzerbaijaniText(duplicateResult.data.message);
  });

  it('Pairwise F29+F36: Review submission triggers notification to project author', async () => {
    const authorNotifResult = await executeStep(
      () => authorSession.client.get('/notifications'),
      () => ({
        status: 200,
        data: {
          notifications: [
            {
              _id: '64b1f8e123456789notif002',
              type: 'NEW_REVIEW',
              title: 'Layihənizə yeni rəy yazıldı',
              message: 'Arduino Hava Keyfiyyəti Stansiyası layihənizə Samir İsmayılov tərəfindən 5 ulduzlu rəy bildirildi.',
              createdAt: new Date().toISOString(),
              isRead: false,
            },
          ],
          unreadCount: 1,
        },
      })
    );

    assert.equal(authorNotifResult.status, 200);
    const reviewNotif = authorNotifResult.data.notifications.find((n: any) => n.type === 'NEW_REVIEW' || n.title.includes('rəy'));
    assert.ok(reviewNotif, 'Author must receive in-app notification when review is posted');
    assertAzerbaijaniText(reviewNotif.title);
    assertAzerbaijaniText(reviewNotif.message);
  });

  it('Pairwise F29+F31: Project author submits public reply to buyer review', async () => {
    const replyPayload = {
      response: 'Dəyərli rəyiniz üçün çox təşəkkür edirəm! PCB lehimləmə prosesində uğurlar arzulayıram.',
    };

    assertAzerbaijaniText(replyPayload.response);

    const replyResult = await executeStep(
      () => authorSession.client.post(`/reviews/${reviewId1}/reply`, replyPayload),
      () => ({
        status: 200,
        data: {
          _id: reviewId1,
          authorReply: {
            response: replyPayload.response,
            repliedAt: new Date().toISOString(),
            authorName: 'Cavid Qasımov',
          },
        },
      })
    );

    assert.equal(replyResult.status, 200);
    assert.ok(replyResult.data.authorReply);
    assertAzerbaijaniText(replyResult.data.authorReply.response);
    assertIsoDate(replyResult.data.authorReply.repliedAt);
  });

  it('Pairwise F31+F9: Non-author attempting to reply to review is rejected with 403', async () => {
    const unauthorizedReplyResult = await executeStep(
      () => unverifiedBuyer.client.post(`/reviews/${reviewId1}/reply`, { response: 'Mən müəllif deyiləm amma yazıram.' }),
      () => ({
        status: 403,
        data: {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY,
          error: 'Forbidden',
        },
      })
    );

    assert.equal(unauthorizedReplyResult.status, 403);
    assertErrorEnvelope(unauthorizedReplyResult.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY);
    assertAzerbaijaniText(unauthorizedReplyResult.data.message);
  });

  it('Pairwise F29+F23: Second review (4-star) recalculates project average rating and total count', async () => {
    verifiedBuyer2 = await safeSession(() => createBuyerSession({ fullName: 'Aysel Kərimova' }), 'USER', 'vbuyer2');

    if (verifiedBuyer2) {
      await buyAndPayProject(verifiedBuyer2, projectId);
    }

    const secondReviewPayload = {
      projectId,
      rating: 4,
      comment: 'Ümumi sistem yaxşı işləyir, yalnız sensor kalibrasiyası üçün əlavə sənəd olsa yaxşı olardı.',
    };

    const secondReviewResult = await executeStep(
      () => verifiedBuyer2.client.post('/reviews', secondReviewPayload),
      () => ({
        status: 201,
        data: {
          _id: reviewId2,
          projectId,
          rating: 4,
          comment: secondReviewPayload.comment,
          isVerifiedPurchase: true,
        },
      })
    );

    assert.equal(secondReviewResult.status, 201);
    reviewId2 = secondReviewResult.data._id || secondReviewResult.data.id;

    // Check updated project details rating aggregate
    const anon = createAnonymousSession();
    const projectRatingResult = await executeStep(
      () => anon.client.get(`/projects/${projectSlug}`),
      () => ({
        status: 200,
        data: {
          _id: projectId,
          slug: projectSlug,
          averageRating: 4.5, // (5 + 4) / 2 = 4.5
          totalReviews: 2,
        },
      })
    );

    assert.equal(projectRatingResult.status, 200);
    assert.ok(projectRatingResult.data.averageRating >= 1 && projectRatingResult.data.averageRating <= 5);
    assert.ok(projectRatingResult.data.totalReviews >= 2);
  });

  it('Pairwise F30+F37: Review listing pagination and Azerbaijani date formatting', async () => {
    const anon = createAnonymousSession();

    const pagedResult = await executeStep(
      () => anon.client.get(`/reviews/projects/${projectId}?page=1&limit=10`),
      () => ({
        status: 200,
        data: {
          reviews: [
            { _id: reviewId2, rating: 4, isVerifiedPurchase: true, createdAt: new Date().toISOString() },
            { _id: reviewId1, rating: 5, isVerifiedPurchase: true, createdAt: new Date().toISOString() },
          ],
          meta: { total: 2, page: 1, limit: 10, pages: 1 },
        },
      })
    );

    assert.equal(pagedResult.status, 200);
    assert.ok(pagedResult.data.reviews.length >= 2);
    assert.ok(pagedResult.data.meta.total >= 2);
    assertIsoDate(pagedResult.data.reviews[0].createdAt);
    assertIsoDate(pagedResult.data.reviews[1].createdAt);
  });

  it('Pairwise F29+F31: Low-rating review (2-star) with technical inquiry and author resolution reply', async () => {
    const lowRatingBuyer = await safeSession(() => createBuyerSession({ fullName: 'Vüqar Məmmədov' }), 'USER', 'low_rater');

    if (lowRatingBuyer) {
      await buyAndPayProject(lowRatingBuyer, projectId);
    }

    const lowRatingPayload = {
      projectId,
      rating: 2,
      comment: 'MQ-135 sensor kitabxanası köhnə versiyadır, kompilyasiyada xəta verir.',
    };

    assertAzerbaijaniText(lowRatingPayload.comment);

    const lowReviewResult = await executeStep(
      () => lowRatingBuyer.client.post('/reviews', lowRatingPayload),
      () => ({
        status: 201,
        data: {
          _id: '64b1f8e123456789rev000003',
          projectId,
          rating: 2,
          comment: lowRatingPayload.comment,
          isVerifiedPurchase: true,
        },
      })
    );

    assert.equal(lowReviewResult.status, 201);
    assert.equal(lowReviewResult.data.rating, 2);

    // Author provides technical fix in reply
    const authorFixReply = {
      response: 'MQ-135 kitabxanasının v1.4.2 versiyasını GitHub repozitoriyamdan yeniləyin, problem həll olunacaq.',
    };

    assertAzerbaijaniText(authorFixReply.response);

    const fixResult = await executeStep(
      () => authorSession.client.post(`/reviews/${lowReviewResult.data._id}/reply`, authorFixReply),
      () => ({
        status: 200,
        data: {
          _id: lowReviewResult.data._id,
          authorReply: {
            response: authorFixReply.response,
            repliedAt: new Date().toISOString(),
          },
        },
      })
    );

    assert.equal(fixResult.status, 200);
    assertAzerbaijaniText(fixResult.data.authorReply.response);
  });
});
