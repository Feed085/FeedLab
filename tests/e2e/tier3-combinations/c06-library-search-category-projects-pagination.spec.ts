import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import {
  withOfflineSkip,
  executeStrictStep,
  getCachedAdminSession,
  ensureAuthorSession,
  fetchSeededComponents,
  createTestComponent,
  deleteTestComponent,
  createApprovedProjectWithBom,
  rejectTestProject,
  extractList,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 3 Pairwise: C06 Library Search x Category x Component Detail x Projects Pagination', () => {
  const client = new ApiClient();

  it('C06.1: GET /components?category=&q= narrows library results by both category and keyword', async (t) => {
    await withOfflineSkip(t, async () => {
      const seeded = await fetchSeededComponents(client);
      assert.ok(seeded.items.length >= 1, 'Expected seeded components');

      const sample = seeded.items[0];
      const keyword = sample.name.split(/\s+/)[0];

      const res = await executeStrictStep(() =>
        client.get(
          `/components?category=${encodeURIComponent(sample.category)}&q=${encodeURIComponent(keyword)}`
        )
      );
      assert.equal(res.status, 200);
      assert.ok(res.data.items.length >= 1, 'Expected at least 1 match for category + keyword');

      for (const item of res.data.items) {
        assert.equal(item.category, sample.category);
      }
      assert.ok(
        res.data.items.some((i: any) => i.slug === sample.slug),
        `Expected "${sample.slug}" in combined category+q search`
      );
    });
  });

  it('C06.2: Selecting component from filtered list opens detail matching category and totalProjectsCount', async (t) => {
    await withOfflineSkip(t, async () => {
      const seeded = await fetchSeededComponents(client);
      const validCat = seeded.categories.find((c) => c.count > 0) || seeded.categories[0];

      const listRes = await executeStrictStep(() =>
        client.get(`/components?category=${encodeURIComponent(validCat.key)}`)
      );
      assert.equal(listRes.status, 200);
      assert.ok(listRes.data.items.length >= 1);

      const picked = listRes.data.items[0];
      const detailRes = await executeStrictStep(() =>
        client.get(`/components/${encodeURIComponent(picked.slug)}`)
      );
      assert.equal(detailRes.status, 200);
      assert.equal(detailRes.data.category, validCat.key);

      const projectsRes = await executeStrictStep(() =>
        client.get(`/components/${encodeURIComponent(picked.slug)}/projects?page=1&limit=50`)
      );
      assert.equal(projectsRes.status, 200);
      const linkedList = extractList(projectsRes.data);
      const totalFromEndpoint =
        typeof projectsRes.data?.total === 'number'
          ? projectsRes.data.total
          : typeof projectsRes.data?.meta?.total === 'number'
            ? projectsRes.data.meta.total
            : linkedList.length;

      assert.equal(
        detailRes.data.totalProjectsCount,
        totalFromEndpoint,
        'Component detail totalProjectsCount must match /components/:slug/projects total'
      );
    });
  });

  it('C06.3: "Bütün layihələri gör" pagination across page 1 and page 2 returns non-overlapping project sets', async (t) => {
    await withOfflineSkip(t, async () => {
      const admin = await getCachedAdminSession();
      const author = await ensureAuthorSession(admin);
      const tag = uniqueTag('c06pag');
      let compId: string | null = null;
      const createdIds: string[] = [];

      try {
        const comp = await createTestComponent(admin.client, {
          slug: tag,
          name: `Pagination Test Chip ${tag}`,
        });
        compId = comp.id;

        for (let i = 1; i <= 3; i++) {
          const p = await createApprovedProjectWithBom(author, admin, {
            title: `C06 Paginated Project ${i} ${tag}`,
            components: [{ name: comp.payload.name, quantity: 1, componentSlug: tag }],
          });
          createdIds.push(p.id);
        }

        const page1Res = await executeStrictStep(() =>
          client.get(`/components/${encodeURIComponent(tag)}/projects?page=1&limit=2`)
        );
        assert.equal(page1Res.status, 200);
        const page1Items = extractList(page1Res.data);
        assert.equal(page1Items.length, 2, 'Page 1 with limit=2 must return 2 projects');

        const page2Res = await executeStrictStep(() =>
          client.get(`/components/${encodeURIComponent(tag)}/projects?page=2&limit=2`)
        );
        assert.equal(page2Res.status, 200);
        const page2Items = extractList(page2Res.data);
        assert.equal(page2Items.length, 1, 'Page 2 with limit=2 and 3 total projects must return 1 project');

        const p1Ids = new Set(page1Items.map((p: any) => String(p._id || p.id)));
        const p2Ids = new Set(page2Items.map((p: any) => String(p._id || p.id)));

        for (const id of p2Ids) {
          assert.ok(!p1Ids.has(id), `Project ${id} must not overlap between page 1 and page 2`);
        }

        const combinedIds = new Set([...p1Ids, ...p2Ids]);
        for (const id of createdIds) {
          assert.ok(combinedIds.has(id), `Created project ${id} must appear across paginated results`);
        }
      } finally {
        for (const id of createdIds) {
          await rejectTestProject(admin, id);
        }
        await deleteTestComponent(admin.client, compId);
      }
    });
  });

  it('C06.4: Following alternatives[].slug from component detail resolves a valid educational component', async (t) => {
    await withOfflineSkip(t, async () => {
      const seeded = await fetchSeededComponents(client);
      assert.ok(seeded.items.length >= 2, 'Expected at least 2 seeded components');

      let foundAltSlug: string | null = null;
      for (const comp of seeded.items.slice(0, 10)) {
        const dRes = await executeStrictStep(() =>
          client.get(`/components/${encodeURIComponent(comp.slug)}`)
        );
        assert.equal(dRes.status, 200);
        const altWithSlug = (dRes.data?.alternatives || []).find((a: any) => a && a.slug);
        if (altWithSlug) {
          foundAltSlug = altWithSlug.slug;
          break;
        }
      }

      if (foundAltSlug) {
        const altRes = await executeStrictStep(() =>
          client.get(`/components/${encodeURIComponent(foundAltSlug)}`)
        );
        assert.equal(altRes.status, 200, `Alternative slug "${foundAltSlug}" must resolve with 200 OK`);
        assert.equal(altRes.data.slug, foundAltSlug);
        assert.ok(typeof altRes.data.definition === 'string' && altRes.data.definition.length > 0);
      } else {
        // Fallback: create temporary component pointing alternative.slug to a seeded component
        const admin = await getCachedAdminSession();
        const targetSeeded = seeded.items[0];
        let compId: string | null = null;
        try {
          const temp = await createTestComponent(admin.client, {
            slug: uniqueTag('c06alt'),
            alternatives: [
              {
                slug: targetSeeded.slug,
                name: targetSeeded.name,
                reason: 'Alternativ komponent naviqasiyası testi',
              },
            ],
          });
          compId = temp.id;

          const detail = await executeStrictStep(() =>
            client.get(`/components/${encodeURIComponent(temp.slug)}`)
          );
          assert.equal(detail.status, 200);
          const altSlug = detail.data.alternatives[0].slug;
          const altRes = await executeStrictStep(() =>
            client.get(`/components/${encodeURIComponent(altSlug)}`)
          );
          assert.equal(altRes.status, 200);
          assert.equal(altRes.data.slug, targetSeeded.slug);
        } finally {
          await deleteTestComponent(admin.client, compId);
        }
      }
    });
  });

  it('C06.5: Admin create -> searchable via category & q -> delete -> vanishes from search results', async (t) => {
    await withOfflineSkip(t, async () => {
      const admin = await getCachedAdminSession();
      const tag = uniqueTag('c06life');
      const uniqueKeyword = `Zirvə${tag}`;
      let createdId: string | null = null;

      try {
        const created = await createTestComponent(admin.client, {
          slug: tag,
          name: `${uniqueKeyword} Sensoru`,
          category: 'sensors',
          categoryLabel: 'Sensorlar',
        });
        createdId = created.id;

        const searchBefore = await executeStrictStep(() =>
          client.get(`/components?category=sensors&q=${encodeURIComponent(uniqueKeyword)}`)
        );
        assert.equal(searchBefore.status, 200);
        assert.ok(
          searchBefore.data.items.some((i: any) => i.slug === tag),
          'Newly created component must be immediately searchable'
        );

        const delRes = await executeStrictStep(() => admin.client.delete(`/components/${createdId}`));
        assert.ok(delRes.status === 200 || delRes.status === 204);
        createdId = null;

        const searchAfter = await executeStrictStep(() =>
          client.get(`/components?category=sensors&q=${encodeURIComponent(uniqueKeyword)}`)
        );
        assert.equal(searchAfter.status, 200);
        assert.ok(
          !searchAfter.data.items.some((i: any) => i.slug === tag),
          'Deleted component must disappear from search results'
        );
      } finally {
        await deleteTestComponent(admin.client, createdId);
      }
    });
  });
});
