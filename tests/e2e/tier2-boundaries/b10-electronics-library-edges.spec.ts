import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import {
  assertAzerbaijaniText,
  assertErrorEnvelope,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
} from '../utils/user-session.ts';
import {
  withOfflineSkip,
  getCachedAdminSession,
  ensureAuthorSession,
  fetchSeededComponents,
  createTestComponent,
  deleteTestComponent,
  extractList,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 2: B10 Electronics Library Boundaries & Security (Features 38 - 40)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Feature 38 Boundaries: Listing, Search, Category Filter & Pagination (5 tests)
  // =========================================================================
  describe('Feature 38 Boundaries: Listing, Search & Pagination', () => {
    it('B10.1 (F38): NoSQL operator injection and whitespace-only search queries never cause 500', async (t) => {
      await withOfflineSkip(t, async () => {
        const nosqlQuery = await anonClient.get('/components?q[$gt]=');
        assert.ok(
          nosqlQuery.status === 200 || nosqlQuery.status === 400,
          `Expected 200 (sanitized) or 400 for NoSQL q operator query, got ${nosqlQuery.status}`
        );

        const nosqlCat = await anonClient.get('/components?category[$ne]=sensors');
        assert.ok(
          nosqlCat.status === 200 || nosqlCat.status === 400,
          `Expected 200 (sanitized) or 400 for NoSQL category operator query, got ${nosqlCat.status}`
        );

        const blankQuery = await anonClient.get('/components?q=%20%20%20');
        assert.equal(blankQuery.status, 200, `Whitespace-only query must return 200, got ${blankQuery.status}`);
        assert.ok(Array.isArray(blankQuery.data?.items), 'Response must include items[]');
      });
    });

    it('B10.2 (F38): Azerbaijani search terms execute cleanly and non-matching gibberish returns empty items', async (t) => {
      await withOfflineSkip(t, async () => {
        for (const term of ['rütubət', 'sürət', 'ə']) {
          const azRes = await anonClient.get(`/components?q=${encodeURIComponent(term)}`);
          assert.equal(azRes.status, 200, `Search for "${term}" must return 200`);
          assert.ok(Array.isArray(azRes.data?.items), 'Response must include items[]');
        }

        const emptyRes = await anonClient.get('/components?q=zzzzzz99999nonexistent');
        assert.equal(emptyRes.status, 200);
        assert.deepEqual(emptyRes.data?.items, []);
        assert.equal(emptyRes.data?.total, 0);
      });
    });

    it('B10.3 (F38): Excessive or negative pagination parameters are clamped or rejected with 400 (never 500)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/components?page=-1&limit=999999');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 (clamped) or 400 for invalid pagination, got ${res.status}`
        );
        if (res.status === 200) {
          assert.ok(res.data.page >= 1, 'Clamped page must be >= 1');
          assert.ok(res.data.limit <= 100, `Clamped limit must be <= 100, got ${res.data.limit}`);
          assert.ok(res.data.items.length <= 100);
        } else {
          assertErrorEnvelope(res.data, 400);
        }
      });
    });

    it('B10.4 (F38): Out-of-range page number returns 200 with empty items[] and valid metadata', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/components?page=99999&limit=24');
        assert.equal(res.status, 200, `Expected 200 for out-of-range page, got ${res.status}`);
        assert.deepEqual(res.data?.items, []);
        assert.equal(res.data?.page, 99999);
        assert.equal(typeof res.data?.totalPages, 'number');
      });
    });

    it('B10.5 (F38): Unknown category filter returns empty items while preserving categories[] taxonomy', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/components?category=non-existent-category-xyz-999');
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 or 400 for unknown category, got ${res.status}`
        );
        if (res.status === 200) {
          assert.deepEqual(res.data?.items, []);
          assert.equal(res.data?.total, 0);
          assert.ok(Array.isArray(res.data?.categories) && res.data.categories.length >= 1);
        } else {
          assertErrorEnvelope(res.data, 400);
        }
      });
    });
  });

  // =========================================================================
  // Feature 39 Boundaries: Component Detail & Linked Projects (5 tests)
  // =========================================================================
  describe('Feature 39 Boundaries: Component Detail & Linked Projects', () => {
    it('B10.6 (F39): Unknown component slug returns 404 with Azerbaijani error envelope', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/components/non-existent-component-slug-xyz-999');
        assert.equal(res.status, 404, `Expected 404 for unknown component slug, got ${res.status}`);
        assertErrorEnvelope(res.data, 404);
        const msg = Array.isArray(res.data.message) ? res.data.message.join(' ') : String(res.data.message);
        assertAzerbaijaniText(msg);
      });
    });

    it('B10.7 (F39): Unknown component projects endpoint returns 404 with Azerbaijani error envelope', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.get('/components/non-existent-component-slug-xyz-999/projects');
        assert.equal(res.status, 404, `Expected 404 for unknown component projects, got ${res.status}`);
        assertErrorEnvelope(res.data, 404);
        const msg = Array.isArray(res.data.message) ? res.data.message.join(' ') : String(res.data.message);
        assertAzerbaijaniText(msg);
      });
    });

    it('B10.8 (F39): Path traversal and null-byte component slugs return 400 or 404 (never 500)', async (t) => {
      await withOfflineSkip(t, async () => {
        const traversal = await anonClient.get('/components/..%2F..%2Fetc%2Fpasswd');
        assert.ok(
          traversal.status === 400 || traversal.status === 404,
          `Expected 400 or 404 for traversal slug, got ${traversal.status}`
        );

        const nullByte = await anonClient.get('/components/esp32%00null');
        assert.ok(
          nullByte.status === 400 || nullByte.status === 404,
          `Expected 400 or 404 for null-byte slug, got ${nullByte.status}`
        );
      });
    });

    it('B10.9 (F39): Passive component without codeExample or linked projects returns clean empty project fields', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const slug = uniqueTag('b10-passive');
        let createdId: string | null = null;

        try {
          const created = await createTestComponent(admin.client, {
            slug,
            name: `220 Ohm Rezistor ${slug}`,
            category: 'passives',
            categoryLabel: 'Passiv komponentlər',
            shortDescription: 'Cərəyanı məhdudlaşdıran passiv elektron komponent.',
            codeExample: undefined,
          });
          createdId = created.id;

          const detailRes = await anonClient.get(`/components/${encodeURIComponent(slug)}`);
          assert.equal(detailRes.status, 200);
          assert.deepEqual(detailRes.data.featuredProjects, []);
          assert.equal(detailRes.data.totalProjectsCount, 0);
          assert.ok(
            detailRes.data.codeExample === undefined || detailRes.data.codeExample === null,
            'Passive component without codeExample should omit or null codeExample cleanly'
          );

          const projRes = await anonClient.get(`/components/${encodeURIComponent(slug)}/projects`);
          assert.equal(projRes.status, 200);
          const list = extractList(projRes.data);
          assert.equal(list.length, 0);
        } finally {
          await deleteTestComponent(admin.client, createdId);
        }
      });
    });

    it('B10.10 (F39): /:slug/projects clamps negative/excessive pagination, handles out-of-range page, and normalizes uppercase slug', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(anonClient);
        assert.ok(seeded.items.length >= 1, 'Expected at least 1 seeded component');
        const targetSlug = seeded.items[0].slug;

        const clampedRes = await anonClient.get(
          `/components/${encodeURIComponent(targetSlug.toUpperCase())}/projects?page=-1&limit=9999`
        );
        assert.ok(
          clampedRes.status === 200 || clampedRes.status === 400,
          `Expected 200 (clamped) or 400, got ${clampedRes.status}`
        );
        if (clampedRes.status === 200) {
          assert.ok(clampedRes.data.page >= 1, 'Clamped page must be >= 1');
          assert.ok(clampedRes.data.limit <= 100, 'Clamped limit must be <= 100');
          assert.ok(Array.isArray(extractList(clampedRes.data)));
        }

        const outOfRangeRes = await anonClient.get(
          `/components/${encodeURIComponent(targetSlug)}/projects?page=99999&limit=20`
        );
        assert.equal(outOfRangeRes.status, 200);
        assert.deepEqual(extractList(outOfRangeRes.data), []);
      });
    });
  });

  // =========================================================================
  // Feature 40 Boundaries: Admin Component CRUD Security & Validation (5 tests)
  // =========================================================================
  describe('Feature 40 Boundaries: Admin Component CRUD Security & Validation', () => {
    it('B10.11 (F40): Unauthenticated POST, PATCH, and DELETE /components return 401 Unauthorized', async (t) => {
      await withOfflineSkip(t, async () => {
        const postRes = await anonClient.post('/components', { name: 'Unauthorized' });
        assert.equal(postRes.status, 401);
        assertErrorEnvelope(postRes.data, 401);

        const patchRes = await anonClient.patch('/components/000000000000000000000000', { name: 'Unauthorized' });
        assert.equal(patchRes.status, 401);
        assertErrorEnvelope(patchRes.data, 401);

        const delRes = await anonClient.delete('/components/000000000000000000000000');
        assert.equal(delRes.status, 401);
        assertErrorEnvelope(delRes.data, 401);
      });
    });

    it('B10.12 (F40): Non-admin USER and AUTHOR attempting POST/PATCH/DELETE /components receive 403 Forbidden', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const buyer = await createBuyerSession();
        const author = await ensureAuthorSession(admin);

        for (const actor of [buyer, author]) {
          const postRes = await actor.client.post('/components', {
            slug: uniqueTag('forbidden'),
            name: 'Forbidden Component',
          });
          assert.equal(postRes.status, 403, `${actor.role} POST /components must return 403`);
          assertErrorEnvelope(postRes.data, 403);

          const patchRes = await actor.client.patch('/components/000000000000000000000000', {
            name: 'Forbidden Patch',
          });
          assert.equal(patchRes.status, 403, `${actor.role} PATCH /components/:id must return 403`);
          assertErrorEnvelope(patchRes.data, 403);

          const delRes = await actor.client.delete('/components/000000000000000000000000');
          assert.equal(delRes.status, 403, `${actor.role} DELETE /components/:id must return 403`);
          assertErrorEnvelope(delRes.data, 403);
        }
      });
    });

    it('B10.13 (F40): Duplicate component slug on POST /components returns 409 Conflict or 400 Bad Request', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const dupSlug = uniqueTag('b10-dup');
        let createdId: string | null = null;

        try {
          const first = await createTestComponent(admin.client, { slug: dupSlug });
          createdId = first.id;

          const dupRes = await admin.client.post('/components', {
            ...first.payload,
            slug: dupSlug,
          });
          assert.ok(
            dupRes.status === 409 || dupRes.status === 400,
            `Expected 409 or 400 for duplicate slug, got ${dupRes.status}`
          );
          assertErrorEnvelope(dupRes.data, dupRes.status);
          const msg = Array.isArray(dupRes.data.message)
            ? dupRes.data.message.join(' ')
            : String(dupRes.data.message);
          assertAzerbaijaniText(msg);
        } finally {
          await deleteTestComponent(admin.client, createdId);
        }
      });
    });

    it('B10.14 (F40): Missing required fields on POST /components returns 400 with Azerbaijani validation message', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();

        const emptyRes = await admin.client.post('/components', {});
        assert.equal(emptyRes.status, 400, `Expected 400 for empty payload, got ${emptyRes.status}`);
        assertErrorEnvelope(emptyRes.data, 400);
        const msg1 = Array.isArray(emptyRes.data.message)
          ? emptyRes.data.message.join(' ')
          : String(emptyRes.data.message);
        assertAzerbaijaniText(msg1);

        const partialRes = await admin.client.post('/components', {
          slug: uniqueTag('b10-missing'),
          name: '',
          definition: '',
        });
        assert.equal(partialRes.status, 400, `Expected 400 for empty name/definition, got ${partialRes.status}`);
        assertErrorEnvelope(partialRes.data, 400);
      });
    });

    it('B10.15 (F40): PATCH and DELETE with non-existent component ID return 404 Not Found', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const missingId = '000000000000000000000000';

        const patchRes = await admin.client.patch(`/components/${missingId}`, {
          shortDescription: 'Tapılmayan komponent yeniləməsi',
        });
        assert.equal(patchRes.status, 404, `Expected 404 on PATCH unknown ID, got ${patchRes.status}`);
        assertErrorEnvelope(patchRes.data, 404);

        const delRes = await admin.client.delete(`/components/${missingId}`);
        assert.equal(delRes.status, 404, `Expected 404 on DELETE unknown ID, got ${delRes.status}`);
        assertErrorEnvelope(delRes.data, 404);
      });
    });
  });
});
