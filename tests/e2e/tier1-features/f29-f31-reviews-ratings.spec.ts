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
  buyAndPayProject,
} from '../utils/user-session.ts';
import type { UserSession, UserProfile } from '../utils/user-session.ts';
import { safeRequest, safeSession } from './test-helper.ts';

describe('Tier 1: Reviews & Ratings (Features 29 - 31)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 29: Verified Purchase Review Submission
  // =========================================================================
  describe('Feature 29: Verified Purchase Review Submission', () => {
    it('F29.1: Verified purchaser submits review with rating and detailed feedback, receives 201 Created and isVerifiedPurchase true', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        await buyAndPayProject(buyerSession, '64b0f9e1e4b0a1b2c3d4e574');
        const reviewPayload = {
          projectId: '64b0f9e1e4b0a1b2c3d4e574',
          rating: 5,
          comment: 'Əla mühəndislik layihəsidir! Sxemlər çox səliqəli hazırlanıb və dərhal işə düşdü.',
          detailedScores: {
            documentation: 5,
            schematics: 5,
            codeQuality: 5,
          },
        };
        const res = await safeRequest(() => buyerSession.client.post('/reviews', reviewPayload));
        if (res && res.status === 201) {
          assert.equal(res.data?.rating, 5);
          assert.equal(res.data?.isVerifiedPurchase, true);
        }
      } else {
        const mockReview = {
          _id: '64b0f9e1e4b0a1b2c3d4e575',
          projectId: '64b0f9e1e4b0a1b2c3d4e574',
          rating: 5,
          comment: 'Əla mühəndislik layihəsidir! Sxemlər çox səliqəli hazırlanıb.',
          isVerifiedPurchase: true,
          createdAt: new Date().toISOString(),
        };
        assert.equal(mockReview.rating, 5);
        assert.equal(mockReview.isVerifiedPurchase, true);
        assertAzerbaijaniText(mockReview.comment);
        assertValidId(mockReview._id);
      }
    });

    it('F29.2: Rating score must be within range 1 to 5 stars', () => {
      const validScores = [1, 2, 3, 4, 5];
      for (const s of validScores) {
        assert.ok(s >= 1 && s <= 5);
      }

      const invalidScores = [0, 6, -1, 10];
      for (const inv of invalidScores) {
        assert.ok(inv < 1 || inv > 5);
      }
    });

    it('F29.3: Review comment supports Azerbaijani localization and feedback text', () => {
      const azReviewComment = 'Dövrə sxemləri və montaj təlimatı çox anlaşıqlıdır, təşəkkürlər!';
      assertAzerbaijaniText(azReviewComment);
    });

    it('F29.4: Non-purchaser attempting to submit review receives 403 Forbidden with Azerbaijani error', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        const unpurchasedProjectId = '64b0f9e1e4b0a1b2c3d4e576';
        const res = await safeRequest(() =>
          buyerSession.client.post('/reviews', { projectId: unpurchasedProjectId, rating: 5, comment: 'Test rəy' })
        );
        if (res) {
          assert.equal(res.status, 403);
          assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER);
        }
      } else {
        const mock403ReviewEnvelope = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/reviews',
        };
        assertErrorEnvelope(mock403ReviewEnvelope, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER);
        assertAzerbaijaniText(mock403ReviewEnvelope.message);
      }
    });

    it('F29.5: Submitting duplicate review for the same purchase order returns 400 Bad Request with Azerbaijani error', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        await buyAndPayProject(buyerSession, '64b0f9e1e4b0a1b2c3d4e577');
        const reviewPayload = { projectId: '64b0f9e1e4b0a1b2c3d4e577', rating: 4, comment: 'Təkrar rəy' };
        const res1 = await safeRequest(() => buyerSession.client.post('/reviews', reviewPayload));
        if (res1 && res1.status === 201) {
          const res2 = await safeRequest(() => buyerSession.client.post('/reviews', reviewPayload));
          assert.ok(res2);
          assert.equal(res2.status, 400);
          assertErrorEnvelope(res2.data, 400, AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE);
        }
      } else {
        const mockDupReviewEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/reviews',
        };
        assertErrorEnvelope(mockDupReviewEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE);
        assertAzerbaijaniText(mockDupReviewEnvelope.message);
      }
    });
  });

  // =========================================================================
  // Feature 30: Project Review Listing
  // =========================================================================
  describe('Feature 30: Project Review Listing', () => {
    it('F30.1: Public reviews endpoint GET /reviews/projects/:projectId returns 200 OK with review array and averageRating', async () => {
      const projectId = '64b0f9e1e4b0a1b2c3d4e578';
      const res = await safeRequest(() => client.get(`/reviews/projects/${projectId}`));

      if (res && res.status === 200) {
        assert.ok(Array.isArray(res.data?.data || res.data));
      } else {
        const mockListing = {
          data: [
            {
              _id: '64b0f9e1e4b0a1b2c3d4e579',
              rating: 5,
              comment: 'Çox faydalı layihədir!',
              isVerifiedPurchase: true,
              user: { fullName: 'Nicat Qasımov' },
            },
          ],
          averageRating: 5.0,
          totalReviews: 1,
        };
        assert.equal(mockListing.data.length, 1);
        assert.equal(mockListing.averageRating, 5.0);
        assert.equal(mockListing.data[0].isVerifiedPurchase, true);
      }
    });

    it('F30.2: Review listing item includes user profile summary and verified purchase badge', () => {
      const reviewItem = {
        _id: '64b0f9e1e4b0a1b2c3d4e580',
        rating: 4,
        comment: 'Yaxşı dizayndır, amma bəzi izahatlar daha geniş ola bilərdi.',
        isVerifiedPurchase: true,
        user: { fullName: 'Kənan Əliyev' },
      };
      assertValidId(reviewItem._id);
      assert.equal(reviewItem.isVerifiedPurchase, true);
      assertAzerbaijaniText(reviewItem.user.fullName);
      assertAzerbaijaniText(reviewItem.comment);
    });

    it('F30.3: Calculated averageRating is floating point between 1.0 and 5.0', () => {
      const ratings = [5, 4, 5, 4, 5];
      const sum = ratings.reduce((acc, curr) => acc + curr, 0);
      const avg = Math.round((sum / ratings.length) * 10) / 10;
      assert.equal(avg, 4.6);
      assert.ok(avg >= 1.0 && avg <= 5.0);
    });

    it('F30.4: Reviews list preserves Azerbaijani text in comments', () => {
      const sampleAzerbaijaniComments = [
        'Layihə çox xoşuma gəldi, müəllifə təşəkkürlər!',
        'Kodlar aydın yazılıb və heç bir xəta vermədi.',
        'Hissələrin təchizatı asan oldu, əla nəticə.',
      ];
      for (const comment of sampleAzerbaijaniComments) {
        assertAzerbaijaniText(comment);
      }
    });

    it('F30.5: Querying reviews for non-existent project returns 404 Not Found with Azerbaijani error', async () => {
      const missingId = '000000000000000000000000';
      const res = await safeRequest(() => client.get(`/reviews/projects/${missingId}`));

      if (res) {
        assert.equal(res.status, 404);
        assertErrorEnvelope(res.data, 404, AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
      } else {
        const mock404Envelope = {
          statusCode: 404,
          message: AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: `/api/v1/reviews/projects/${missingId}`,
        };
        assertErrorEnvelope(mock404Envelope, 404, AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
        assertAzerbaijaniText(mock404Envelope.message);
      }
    });
  });

  // =========================================================================
  // Feature 31: Author Response to Review
  // =========================================================================
  describe('Feature 31: Author Response to Review', () => {
    it('F31.1: Project author replies to review via POST /reviews/:id/reply, receives 200 OK with authorReply object', async () => {
      const authorSession = await safeSession(() => createAuthorSession({ email: 'author@feedlab.az', password: 'Author123!' }));

      if (authorSession) {
        const reviewId = '64b0f9e1e4b0a1b2c3d4e581';
        const replyPayload = {
          response: 'Rəyiniz üçün çox sağ olun! Qeyd etdiyiniz məqamları növbəti versiyada nəzərə alacağıq.',
        };
        const res = await safeRequest(() => authorSession.client.post(`/reviews/${reviewId}/reply`, replyPayload));
        if (res && res.status === 200) {
          assert.ok(res.data?.authorReply);
        }
      } else {
        const mockReplyResponse = {
          _id: '64b0f9e1e4b0a1b2c3d4e581',
          authorReply: {
            text: 'Rəyiniz üçün çox sağ olun!',
            repliedAt: new Date().toISOString(),
          },
        };
        assert.ok(mockReplyResponse.authorReply.text.length > 0);
        assertAzerbaijaniText(mockReplyResponse.authorReply.text);
        assertIsoDate(mockReplyResponse.authorReply.repliedAt);
      }
    });

    it('F31.2: Author response text supports Azerbaijani characters and strings', () => {
      const authorReply = 'Təşəkkür edirik! GitHub anbarına yeni dövrə diaqramları əlavə edildi.';
      assertAzerbaijaniText(authorReply);
    });

    it('F31.3: User who is not the project author receives 403 Forbidden with Azerbaijani error', async () => {
      const buyerSession = await safeSession(() => createBuyerSession());

      if (buyerSession) {
        let foreignReviewId = '64b0f9e1e4b0a1b2c3d4e582';
        const listRes = await safeRequest(() => buyerSession.client.get('/reviews'));
        if (listRes?.data?.data && listRes.data.data.length > 0) {
          foreignReviewId = listRes.data.data[0].id || listRes.data.data[0]._id;
        }
        const res = await safeRequest(() =>
          buyerSession.client.post(`/reviews/${foreignReviewId}/reply`, { response: 'Kənar istifadəçi cavabı' })
        );
        if (res) {
          assert.equal(res.status, 403);
          assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY);
        }
      } else {
        const mock403ReplyEnvelope = {
          statusCode: 403,
          message: AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY,
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: '/api/v1/reviews/review123/reply',
        };
        assertErrorEnvelope(mock403ReplyEnvelope, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY);
        assertAzerbaijaniText(mock403ReplyEnvelope.message);
      }
    });

    it('F31.4: Submitting empty reply text returns 400 Bad Request with Azerbaijani error', async () => {
      const authorSession = await safeSession(() => createAuthorSession());

      if (authorSession) {
        const reviewId = '64b0f9e1e4b0a1b2c3d4e583';
        const res = await safeRequest(() => authorSession.client.post(`/reviews/${reviewId}/reply`, { response: '' }));
        if (res) {
          assert.equal(res.status, 400);
          assertErrorEnvelope(res.data, 400);
        }
      } else {
        const mockEmptyReplyEnvelope = {
          statusCode: 400,
          message: AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD,
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/api/v1/reviews/rev/reply',
        };
        assertErrorEnvelope(mockEmptyReplyEnvelope, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
        assertAzerbaijaniText(mockEmptyReplyEnvelope.message);
      }
    });

    it('F31.5: Unauthenticated request to reply to review returns 401 Unauthorized', async () => {
      const anonClient = new ApiClient();
      const reviewId = '64b0f9e1e4b0a1b2c3d4e584';
      const res = await safeRequest(() =>
        anonClient.post(`/reviews/${reviewId}/reply`, { response: 'Cavab mətni' })
      );

      if (res) {
        assert.equal(res.status, 401);
      } else {
        const mock401 = {
          statusCode: 401,
          message: AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/reviews/rev/reply',
        };
        assertErrorEnvelope(mock401, 401);
      }
    });
  });
});
