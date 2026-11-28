import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import {
  assertAzerbaijaniText,
  assertErrorEnvelope,
} from '../utils/assertions.ts';
import {
  withOfflineSkip,
  getCachedAdminSession,
  ensureAuthorSession,
  createTestComponent,
  deleteTestComponent,
  createApprovedProjectWithBom,
  createDraftProjectWithBom,
  rejectTestProject,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 2: B11 Component Finder & Extended Filter Boundaries (Features 41 - 42)', () => {
  const anonClient = new ApiClient();

  // =========================================================================
  // Component Matching Boundaries (6 tests)
  // =========================================================================
  describe('Component Matching Boundaries', () => {
    it('B11.1: Empty components[] selection returns 400 or empty matches without fake 0/0 hits', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects/match-components', { components: [] });
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 (empty matches) or 400 (validation error), got ${res.status}`
        );

        if (res.status === 200) {
          assert.deepEqual(res.data?.fullMatches, []);
          assert.deepEqual(res.data?.partialMatches, []);
          assert.equal(res.data?.totalFull, 0);
          assert.equal(res.data?.totalPartial, 0);
        } else {
          assertErrorEnvelope(res.data, 400);
          const msg = Array.isArray(res.data.message) ? res.data.message.join(' ') : String(res.data.message);
          assertAzerbaijaniText(msg);
        }
      });
    });

    it('B11.2: Missing or non-array components field returns 400 with Azerbaijani error envelope', async (t) => {
      await withOfflineSkip(t, async () => {
        const missingRes = await anonClient.post('/projects/match-components', {});
        assert.equal(missingRes.status, 400, `Expected 400 when components omitted, got ${missingRes.status}`);
        assertErrorEnvelope(missingRes.data, 400);
        const msg1 = Array.isArray(missingRes.data.message)
          ? missingRes.data.message.join(' ')
          : String(missingRes.data.message);
        assertAzerbaijaniText(msg1);

        const stringRes = await anonClient.post('/projects/match-components', { components: 'esp32' });
        assert.equal(stringRes.status, 400, `Expected 400 when components is string, got ${stringRes.status}`);
        assertErrorEnvelope(stringRes.data, 400);
      });
    });

    it('B11.3: Alias and case-insensitive / normalized component matching resolves approved project BOM', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('b11alias');
        const compSlug = `alias-chip-${tag}`;
        const aliasToken = `ALiAs-CHiP-V3-${tag}`;
        let compId: string | null = null;
        let projectId: string | null = null;

        try {
          const created = await createTestComponent(admin.client, {
            slug: compSlug,
            name: `Alias Chip ${tag}`,
            aliases: [aliasToken],
          });
          compId = created.id;

          const project = await createApprovedProjectWithBom(author, admin, {
            title: `B11 Alias Match ${tag}`,
            components: [
              { name: `Alias Chip ${tag}`, quantity: 1, componentSlug: compSlug },
            ],
          });
          projectId = project.id;

          const res = await anonClient.post('/projects/match-components', {
            components: [aliasToken.toUpperCase()],
          });
          assert.equal(res.status, 200);

          const hit = (res.data?.fullMatches || []).find(
            (m: any) => (m.project?._id || m.project?.id) === project.id || m.project?.slug === project.slug
          );
          assert.ok(hit, 'Case-insensitive alias input must resolve and match approved project BOM');
          assert.ok(hit.matchedCount >= 1);
        } finally {
          await rejectTestProject(admin, projectId);
          await deleteTestComponent(admin.client, compId);
        }
      });
    });

    it('B11.4: Exact "4/5 komponent mövcuddur" label and single missingComponents entry for 5-component project', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('b11-4of5');
        const slugs = [1, 2, 3, 4, 5].map((i) => `b11-c${i}-${tag}`);
        const missingName = `HC-SR04 Ultrasonik Sensor ${tag}`;
        let projectId: string | null = null;

        try {
          const project = await createApprovedProjectWithBom(author, admin, {
            title: `B11 Five Component Project ${tag}`,
            components: [
              { name: `MCU ${tag}`, quantity: 1, componentSlug: slugs[0] },
              { name: `DHT22 ${tag}`, quantity: 1, componentSlug: slugs[1] },
              { name: `Relay ${tag}`, quantity: 1, componentSlug: slugs[2] },
              { name: `Pump ${tag}`, quantity: 1, componentSlug: slugs[3] },
              { name: missingName, quantity: 1, componentSlug: slugs[4] },
            ],
          });
          projectId = project.id;

          const res = await anonClient.post('/projects/match-components', {
            components: slugs.slice(0, 4),
          });
          assert.equal(res.status, 200);

          const partial = (res.data?.partialMatches || []).find(
            (m: any) => (m.project?._id || m.project?.id) === project.id || m.project?.slug === project.slug
          );
          assert.ok(partial, '5-component project with 4 matched components must be in partialMatches');
          assert.equal(partial.matchedCount, 4);
          assert.equal(partial.totalRequired, 5);
          assert.equal(partial.matchLabel, '4/5 komponent mövcuddur');
          assert.deepEqual(partial.missingComponents, [missingName]);
        } finally {
          await rejectTestProject(admin, projectId);
        }
      });
    });

    it('B11.5: Unknown or unlinked component names return 200 with empty match arrays (never 500)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects/match-components', {
          components: ['non-existent-chip-xyz-999', 'unknown-module-abc-777'],
        });
        assert.equal(res.status, 200);
        assert.deepEqual(res.data?.fullMatches, []);
        assert.deepEqual(res.data?.partialMatches, []);
        assert.equal(res.data?.totalFull, 0);
        assert.equal(res.data?.totalPartial, 0);
      });
    });

    it('B11.6: DRAFT and SUBMITTED projects never appear in fullMatches or partialMatches', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('b11-unpub');
        const secretSlug = `secret-unpub-${tag}`;

        const draftProj = await createDraftProjectWithBom(author, {
          title: `B11 Draft Only ${tag}`,
          components: [{ name: `Secret ${tag}`, quantity: 1, componentSlug: secretSlug }],
        });

        const subDraft = await createDraftProjectWithBom(author, {
          title: `B11 Submitted Only ${tag}`,
          components: [{ name: `Secret ${tag}`, quantity: 1, componentSlug: secretSlug }],
        });
        const formData = new FormData();
        formData.append('file', new Blob(['PK\x03\x04zip'], { type: 'application/zip' }), 'sub.zip');
        await author.client.upload(`/projects/${subDraft.id}/files`, formData);
        await author.client.post(`/projects/${subDraft.id}/submit`);

        const res = await anonClient.post('/projects/match-components', {
          components: [secretSlug],
        });
        assert.equal(res.status, 200);

        const allIds = [...(res.data?.fullMatches || []), ...(res.data?.partialMatches || [])].map(
          (m: any) => String(m.project?._id || m.project?.id)
        );
        assert.ok(!allIds.includes(draftProj.id), 'DRAFT project must NEVER appear in match-components');
        assert.ok(!allIds.includes(subDraft.id), 'SUBMITTED project must NEVER appear in match-components');
      });
    });
  });

  // =========================================================================
  // Filter Validation Boundaries (5 tests)
  // =========================================================================
  describe('Filter Validation Boundaries', () => {
    it('B11.7: Invalid difficulty enum returns 400 Bad Request on both match-components and GET /projects', async (t) => {
      await withOfflineSkip(t, async () => {
        const matchRes = await anonClient.post('/projects/match-components', {
          components: ['esp32'],
          difficulty: 'IMPOSSIBLE',
        });
        assert.equal(matchRes.status, 400, `Expected 400 for invalid difficulty on match-components, got ${matchRes.status}`);
        assertErrorEnvelope(matchRes.data, 400);
        const msg1 = Array.isArray(matchRes.data.message)
          ? matchRes.data.message.join(' ')
          : String(matchRes.data.message);
        assertAzerbaijaniText(msg1);

        const catalogRes = await anonClient.get('/projects?difficulty=IMPOSSIBLE');
        assert.equal(catalogRes.status, 400, `Expected 400 for invalid difficulty on GET /projects, got ${catalogRes.status}`);
        assertErrorEnvelope(catalogRes.data, 400);
      });
    });

    it('B11.8: Inverted price range (minPrice > maxPrice) returns 400 on match-components and GET /projects', async (t) => {
      await withOfflineSkip(t, async () => {
        const matchRes = await anonClient.post('/projects/match-components', {
          components: ['esp32'],
          minPrice: 100,
          maxPrice: 10,
        });
        assert.equal(matchRes.status, 400, `Expected 400 for inverted price range, got ${matchRes.status}`);
        assertErrorEnvelope(matchRes.data, 400);
        const msg1 = Array.isArray(matchRes.data.message)
          ? matchRes.data.message.join(' ')
          : String(matchRes.data.message);
        assertAzerbaijaniText(msg1);

        const catalogRes = await anonClient.get('/projects?minPrice=100&maxPrice=10');
        assert.equal(catalogRes.status, 400);
        assertErrorEnvelope(catalogRes.data, 400);
      });
    });

    it('B11.9: Negative minPrice returns 400 Bad Request on match-components', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects/match-components', {
          components: ['esp32'],
          minPrice: -5,
        });
        assert.equal(res.status, 400, `Expected 400 for negative minPrice, got ${res.status}`);
        assertErrorEnvelope(res.data, 400);
        const msg = Array.isArray(res.data.message) ? res.data.message.join(' ') : String(res.data.message);
        assertAzerbaijaniText(msg);
      });
    });

    it('B11.10: Invalid priceType enum returns 400 Bad Request on match-components', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects/match-components', {
          components: ['esp32'],
          priceType: 'crypto',
        });
        assert.equal(res.status, 400, `Expected 400 for invalid priceType, got ${res.status}`);
        assertErrorEnvelope(res.data, 400);
      });
    });

    it('B11.11: Non-matching domain filter returns 200 with empty matches or 400 (never 500)', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await anonClient.post('/projects/match-components', {
          components: ['esp32'],
          domain: 'Qeyri-Mövcud-Sahə',
        });
        assert.ok(
          res.status === 200 || res.status === 400,
          `Expected 200 (empty matches) or 400 (enum validation), got ${res.status}`
        );
        if (res.status === 200) {
          assert.deepEqual(res.data?.fullMatches, []);
          assert.deepEqual(res.data?.partialMatches, []);
        } else {
          assertErrorEnvelope(res.data, 400);
        }
      });
    });
  });
});
