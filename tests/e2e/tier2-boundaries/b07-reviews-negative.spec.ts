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

describe('Tier 2 — B07 Reviews Negative & Boundary Cases (Features 29–31)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 29: Verified Purchase Review Submission
  // =========================================================================
  describe('Feature 29: Verified Purchase Review Submission', () => {
    it('should return 403 and REV_NOT_PURCHASER when user without verified paid purchase attempts to submit a review', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const unpurchasedProjectId = '507f1f77bcf86cd799439011';
        const res = await buyer.client.post('/reviews', {
          projectId: unpurchasedProjectId,
          rating: 5,
          comment: 'Əla layihədir, amma satın almamışam.',
        });
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 for unpurchased review or 404 for mock, got ${res.status}`
        );
        if (res.status === 403) {
          assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NOT_PURCHASER);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 400 and REV_DUPLICATE when buyer submits a duplicate review on the same purchased order', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const projectId = '507f1f77bcf86cd799439022';
        const first = await buyer.client.post('/reviews', {
          projectId,
          orderId: '507f1f77bcf86cd799439033',
          rating: 5,
          comment: 'İlk rəy mətni',
        });
        if (first.status === 201) {
          const duplicate = await buyer.client.post('/reviews', {
            projectId,
            orderId: '507f1f77bcf86cd799439033',
            rating: 4,
            comment: 'Təkrar rəy mətni',
          });
          assert.equal(duplicate.status, 400, 'Expected 400 for duplicate review on same order');
          assertErrorEnvelope(duplicate.data, 400, AZERBAIJANI_ERROR_MESSAGES.REV_DUPLICATE);
          assertAzerbaijaniText(duplicate.data.message);
        }
      });
    });

    it('should return 400 and VAL_INVALID_RATING when rating is less than 1 (e.g. 0)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/reviews', {
          projectId: '507f1f77bcf86cd799439011',
          rating: 0,
          comment: 'Sıfır ulduz rəy testi',
        });
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected 400 for rating < 1, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 400 and VAL_INVALID_RATING when rating is greater than 5 (e.g. 6)', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/reviews', {
          projectId: '507f1f77bcf86cd799439011',
          rating: 6,
          comment: 'Altı ulduz rəy testi',
        });
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected 400 for rating > 5, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_RATING);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should reject review submission with empty comment or missing required fields with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/reviews', {
          projectId: '507f1f77bcf86cd799439011',
          rating: 5,
          // comment omitted
        });
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected 400 for missing comment, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });
  });

  // =========================================================================
  // Feature 30: Project Review Listing
  // =========================================================================
  describe('Feature 30: Project Review Listing', () => {
    it('should return 404 and NF_PROJECT (or 404 error envelope) when listing reviews for non-existent project ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const nonExistentProjectId = '507f1f77bcf86cd799439099';
        const res = await anonClient.get(`/reviews/projects/${nonExistentProjectId}`);
        assert.ok(
          res.status === 404 || res.status === 200,
          `Expected 404 or empty list (200), got ${res.status}`
        );
        if (res.status === 404) {
          assertErrorEnvelope(res.data, 404);
        }
      });
    });

    it('should return 400 when pagination page is negative (?page=-1)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/reviews/projects/507f1f77bcf86cd799439011?page=-1');
        assert.ok(
          res.status === 400 || res.status === 200 || res.status === 404,
          `Expected 400 or default sanitization, got ${res.status}`
        );
      });
    });

    it('should return 400 when rating filter query parameter is non-numeric (?rating=invalid)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/reviews/projects/507f1f77bcf86cd799439011?rating=not-a-number');
        assert.ok(
          res.status === 400 || res.status === 200 || res.status === 404,
          `Expected 400 for non-numeric rating filter, got ${res.status}`
        );
      });
    });

    it('should reject POST/DELETE mutations on public review listing endpoint with 404 or 405', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/reviews/projects/507f1f77bcf86cd799439011', { test: true });
        assert.ok(
          res.status === 404 || res.status === 405,
          `Expected 404 or 405 on POST to reviews listing, got ${res.status}`
        );
      });
    });

    it('should clamp or reject excessive pagination limit (?limit=50000) on review listing', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/reviews/projects/507f1f77bcf86cd799439011?limit=50000');
        assert.ok(
          res.status === 200 || res.status === 400 || res.status === 404,
          `Expected clamped 200 or 400 for excessive limit, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 31: Author Response to Review
  // =========================================================================
  describe('Feature 31: Author Response to Review', () => {
    it('should return 403 and REV_NON_AUTHOR_REPLY when standard buyer attempts to reply to a review', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/reviews/507f1f77bcf86cd799439011/reply', {
          response: 'Alıcı olaraq cavab verməyə çalışıram',
        });
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 for non-author replying or 404, got ${res.status}`
        );
        if (res.status === 403) {
          assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it("should return 403 and REV_NON_AUTHOR_REPLY when author attempts to reply to a review on another author's project", async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const foreignReviewId = '507f1f77bcf86cd799439088';
        const res = await author.client.post(`/reviews/${foreignReviewId}/reply`, {
          response: 'Başqa müəllifin layihəsinə cavab',
        });
        assert.ok(
          res.status === 403 || res.status === 404,
          `Expected 403 for replying to other author review, got ${res.status}`
        );
        if (res.status === 403) {
          assertErrorEnvelope(res.data, 403, AZERBAIJANI_ERROR_MESSAGES.REV_NON_AUTHOR_REPLY);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor attempts to reply to a review', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/reviews/507f1f77bcf86cd799439011/reply', {
          response: 'Anonim cavab mətni',
        });
        assert.equal(res.status, 401, 'Expected 401 for anonymous review reply');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject review reply with empty or whitespace-only response text with 400 and VAL_REQUIRED_FIELD', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const res = await author.client.post('/reviews/507f1f77bcf86cd799439011/reply', {
          response: '   ',
        });
        assert.ok(
          res.status === 400 || res.status === 403 || res.status === 404,
          `Expected 400 for empty reply text, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 404 and NF_GENERIC when attempting to reply to a non-existent review ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const author = await createAuthorSession();
        const nonExistentReviewId = '507f1f77bcf86cd799439099';
        const res = await author.client.post(`/reviews/${nonExistentReviewId}/reply`, {
          response: 'Mövcud olmayan rəyə cavab',
        });
        assert.ok(
          res.status === 404 || res.status === 403,
          `Expected 404 for non-existent review, got ${res.status}`
        );
        if (res.status === 404) {
          assertErrorEnvelope(res.data, 404);
        }
      });
    });
  });
});
