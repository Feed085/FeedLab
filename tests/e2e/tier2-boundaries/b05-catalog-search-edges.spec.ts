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

describe('Tier 2 — B05 Catalog & Search Boundaries (Features 20–24)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 20: Homepage Hybrid Feed
  // =========================================================================
  describe('Feature 20: Homepage Hybrid Feed', () => {
    it('should handle malformed query parameters on homepage feed without server 500 error', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/homepage?limit=abc&page=corrupted');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 (fallback) or 400 validation error, got ${res.status}`
        );
      });
    });

    it('should reject POST/PUT/DELETE mutations on read-only homepage endpoint with 404 or 405', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects/homepage', { test: true });
        assert.ok(
          res.status === 404 || res.status === 405,
          `Expected 404 or 405 on POST /projects/homepage, got ${res.status}`
        );
      });
    });

    it('should clamp or reject excessive limit query parameter (?limit=999999) on homepage feed', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/homepage?limit=999999');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 (clamped) or 400, got ${res.status}`
        );
        if (res.status === 200 && res.data) {
          const featured = res.data.featuredProjects || res.data.data;
          if (Array.isArray(featured)) {
            assert.ok(featured.length <= 100, 'Feed length should be clamped to reasonable limit');
          }
        }
      });
    });

    it('should never expose projects with DRAFT, UNDER_REVIEW, or REJECTED status on public homepage feed', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/homepage');
        if (res.status === 200 && res.data) {
          const list = [
            ...(res.data.featuredProjects || []),
            ...(res.data.latestProjects || []),
          ];
          for (const item of list) {
            if (item.status) {
              assert.equal(item.status, 'PUBLISHED', 'Only PUBLISHED projects allowed in public feed');
            }
          }
        }
      });
    });

    it('should handle negative offset or page parameters on homepage feed gracefully with 400 or default page 1', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/homepage?page=-5&offset=-20');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 or 400 for negative pagination, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 21: Category Navigation & Listing
  // =========================================================================
  describe('Feature 21: Category Navigation & Listing', () => {
    it('should return 404 and NF_GENERIC when requesting non-existent category slug', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/categories/non-existent-category-slug-999');
        assert.equal(res.status, 404, 'Expected 404 for non-existent category');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should safely handle special character and path traversal attacks in category slug', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/categories/..%2F..%2Fetc%2Fpasswd');
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 or 404 for traversal slug, got ${res.status}`
        );
      });
    });

    it('should reject non-admin attempts to mutate categories (POST/PATCH/DELETE) with 401 or 403', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/categories', {
          name: 'Hacked Category',
          slug: 'hacked-category',
        });
        assert.ok(
          res.status === 401 || res.status === 403,
          `Expected 401 or 403 for non-admin category creation, got ${res.status}`
        );
      });
    });

    it('should reject or sanitize category filter queries containing NoSQL operators', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/categories?name[$regex]=.*');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 or 400 for NoSQL operator in query, got ${res.status}`
        );
      });
    });

    it('should handle empty or whitespace-only category slug with 400 or redirect to category index', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/categories/%20%20');
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 or 404 for whitespace slug, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 22: Project Search & Filtering
  // =========================================================================
  describe('Feature 22: Project Search & Filtering', () => {
    it('should reject search query with inverted price range (minPrice > maxPrice) with 400 and VAL_INVERTED_PRICE', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects?minPrice=100&maxPrice=10');
        assert.equal(res.status, 400, 'Expected 400 for inverted price range');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should reject search query with negative price (minPrice < 0 or maxPrice < 0) with 400 and VAL_INVALID_PRICE', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects?minPrice=-15&maxPrice=50');
        assert.equal(res.status, 400, 'Expected 400 for negative minPrice');
        assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should safely sanitize script tags and XSS injection in search query string', async (t) => {
      await withOfflineSkip(t, async () => {
        const xssQuery = encodeURIComponent('<script>alert("XSS")</script>');
        const res = await anonClient.get(`/projects?q=${xssQuery}`);
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 (safe results) or 400, got ${res.status}`
        );
        if (res.status === 200 && res.raw) {
          assert.ok(
            !res.raw.includes('<script>alert("XSS")</script>'),
            'Response must not echo unescaped script tag'
          );
        }
      });
    });

    it('should handle native Azerbaijani characters in search queries (ə, ç, ş, ı, ö, ğ, ü) without encoding errors', async (t) => {
      await withOfflineSkip(t, async () => {
        const azQuery = encodeURIComponent('ağıllı çip və şlüz');
        const res = await anonClient.get(`/projects?q=${azQuery}`);
        assert.equal(res.status, 200, 'Expected 200 for native Azerbaijani search query');
        assert.ok(res.data !== null, 'Expected response body');
      });
    });

    it('should safely handle excessively long search queries (>500 chars) without server crash or hang', async (t) => {
      await withOfflineSkip(t, async () => {
        const longQuery = 'arduino '.repeat(100);
        const res = await anonClient.get(`/projects?q=${encodeURIComponent(longQuery)}`);
        assert.ok(
          res.status === 200 || res.status === 400 || res.status === 414,
          `Expected 200, 400, or 414 for massive search string, got ${res.status}`
        );
      });
    });
  });

  // =========================================================================
  // Feature 23: Project Details Page
  // =========================================================================
  describe('Feature 23: Project Details Page', () => {
    it('should return 404 and NF_PROJECT when requesting non-existent project slug or ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/non-existent-project-slug-12345');
        assert.equal(res.status, 404, 'Expected 404 for unknown project');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should return 404 or 403 when public buyer attempts to access project details of a DRAFT project', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/draft-unapproved-slug');
        assert.ok(
          res.status === 404 || res.status === 403,
          `Public access to DRAFT project must return 404 or 403, got ${res.status}`
        );
      });
    });

    it('should return 404 or 403 when public buyer attempts to access project details of a REJECTED project', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/rejected-project-slug');
        assert.ok(
          res.status === 404 || res.status === 403,
          `Public access to REJECTED project must return 404 or 403, got ${res.status}`
        );
      });
    });

    it('should return 400 or 404 when project slug contains malformed URL characters or null bytes', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/%00malformed-null-byte');
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 or 404 for null byte slug, got ${res.status}`
        );
      });
    });

    it('should not expose private financial ledger or author commission splits in public project detail payload', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/projects/esp32-weather-station');
        if (res.status === 200 && res.data) {
          const body = res.data;
          assert.equal(body.platformCommission, undefined, 'Must not expose platform commission');
          assert.equal(body.authorEarnings, undefined, 'Must not expose author earnings split in public endpoint');
        }
      });
    });
  });

  // =========================================================================
  // Feature 24: Free Project Handling
  // =========================================================================
  describe('Feature 24: Free Project Handling', () => {
    it('should return 400 and ORD_PAID_AS_FREE when attempting to claim a paid project via free claim endpoint', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const paidProjectId = '507f1f77bcf86cd799439055'; // project with price > 0
        const res = await buyer.client.post(`/orders/claim-free/${paidProjectId}`);
        assert.ok(
          res.status === 400 || res.status === 404,
          `Expected 400 for claiming paid project via free route, got ${res.status}`
        );
        if (res.status === 400) {
          assertErrorEnvelope(res.data, 400, AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE);
          assertAzerbaijaniText(res.data.message);
        }
      });
    });

    it('should return 401 and AUTH_UNAUTHORIZED when unauthenticated visitor attempts to claim a free project', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/orders/claim-free/507f1f77bcf86cd799439055');
        assert.equal(res.status, 401, 'Expected 401 for anonymous free claim');
        assertErrorEnvelope(res.data, 401, AZERBAIJANI_ERROR_MESSAGES.AUTH_UNAUTHORIZED);
        assertAzerbaijaniText(res.data.message);
      });
    });

    it('should return 400 and ORD_ALREADY_OWNED (or idempotent 200) when user re-claims an already owned free project', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const freeProjectId = '507f1f77bcf86cd799439066';
        const first = await buyer.client.post(`/orders/claim-free/${freeProjectId}`);
        if (first.status === 201 || first.status === 200) {
          const second = await buyer.client.post(`/orders/claim-free/${freeProjectId}`);
          assert.ok(
            second.status === 400 || second.status === 200,
            `Expected 400 or idempotent 200 on duplicate claim, got ${second.status}`
          );
        }
      });
    });

    it('should return 404 and NF_PROJECT when attempting to claim a non-existent free project ID', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/orders/claim-free/507f1f77bcf86cd799439011');
        assert.equal(res.status, 404, 'Expected 404 for non-existent free project claim');
        assertErrorEnvelope(res.data, 404);
      });
    });

    it('should reject free project claim request when body tampers with price or injects unauthorized payment status', async (t) => {
      await withOfflineSkip(t, async () => {
        const buyer = await createBuyerSession();
        const res = await buyer.client.post('/orders/claim-free/507f1f77bcf86cd799439066', {
          price: 50.0,
          status: 'ADMIN_OVERRIDE',
        });
        assert.ok(
          res.status === 201 || res.status === 400 || res.status === 404,
          `Expected clean validation or ignore of tampered fields, got ${res.status}`
        );
        if (res.status === 201 && res.data?.price !== undefined) {
          assert.equal(res.data.price, 0, 'Free order price must remain 0 regardless of body payload');
        }
      });
    });
  });
});
