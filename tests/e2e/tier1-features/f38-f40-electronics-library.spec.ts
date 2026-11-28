import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertValidId,
} from '../utils/assertions.ts';
import {
  withOfflineSkip,
  executeStrictStep,
  getCachedAdminSession,
  fetchSeededComponents,
  createTestComponent,
  deleteTestComponent,
  extractList,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 1: Electronics Library (Features 38 - 40)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 38: Electronics Library Listing & Search
  // =========================================================================
  describe('Feature 38: Electronics Library Listing & Search', () => {
    it('F38.1: GET /components returns 200 with paginated items, metadata, categories, and seeded components', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await executeStrictStep(() => client.get('/components'));
        assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);

        assert.ok(Array.isArray(res.data?.items), 'Response must include items[]');
        assert.ok(res.data.items.length >= 1, 'Database OnModuleInit seed must populate >= 1 component');
        assert.equal(typeof res.data.total, 'number', 'total must be a number');
        assert.equal(typeof res.data.page, 'number', 'page must be a number');
        assert.equal(typeof res.data.limit, 'number', 'limit must be a number');
        assert.equal(typeof res.data.totalPages, 'number', 'totalPages must be a number');
        assert.ok(Array.isArray(res.data.categories), 'Response must include categories[]');

        const first = res.data.items[0];
        assertValidId(first.id || first._id);
        assert.ok(typeof first.slug === 'string' && first.slug.length > 0, 'Component must have slug');
        assert.ok(typeof first.name === 'string' && first.name.length > 0, 'Component must have name');
        assert.ok(typeof first.category === 'string' && first.category.length > 0, 'Component must have category');
        assert.ok(
          typeof first.categoryLabel === 'string' && first.categoryLabel.length > 0,
          'Component must have categoryLabel'
        );
        assert.ok(
          typeof first.shortDescription === 'string' && first.shortDescription.length > 0,
          'Component must have shortDescription'
        );
      });
    });

    it('F38.2: GET /components?q=ESP32 filters matching components by name or alias', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await executeStrictStep(() => client.get('/components?q=ESP32'));
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.data?.items), 'items[] must be an array');
        assert.ok(res.data.items.length >= 1, 'Expected at least 1 seeded component matching ESP32');

        const matchesEsp32 = res.data.items.some((item: any) => {
          const haystack = [
            item.name,
            item.slug,
            item.shortDescription,
            ...(Array.isArray(item.aliases) ? item.aliases : []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes('esp32');
        });
        assert.ok(matchesEsp32, 'Search results for q=ESP32 must match ESP32 in name, slug, alias, or description');
      });
    });

    it('F38.3: GET /components?category=<key> filters items strictly by category and returns categories[] taxonomy', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        assert.ok(seeded.categories.length >= 1, 'Expected at least 1 category in GET /components');

        const validCat = seeded.categories.find((c) => c.count > 0) || seeded.categories[0];
        assert.ok(typeof validCat.key === 'string' && validCat.key.length > 0, 'Category key required');
        assert.ok(typeof validCat.label === 'string' && validCat.label.length > 0, 'Category label required');
        assert.equal(typeof validCat.count, 'number', 'Category count must be numeric');

        const filtered = await executeStrictStep(() =>
          client.get(`/components?category=${encodeURIComponent(validCat.key)}`)
        );
        assert.equal(filtered.status, 200);
        assert.ok(Array.isArray(filtered.data?.items));

        for (const item of filtered.data.items) {
          assert.equal(
            item.category,
            validCat.key,
            `Filtered component "${item.slug}" category "${item.category}" must equal "${validCat.key}"`
          );
        }
      });
    });

    it('F38.4: GET /components?page=1&limit=3 respects pagination boundaries and totalPages calculation', async (t) => {
      await withOfflineSkip(t, async () => {
        const res = await executeStrictStep(() => client.get('/components?page=1&limit=3'));
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.data?.items));
        assert.ok(res.data.items.length <= 3, `Expected <= 3 items, got ${res.data.items.length}`);
        assert.equal(res.data.page, 1);
        assert.equal(res.data.limit, 3);
        const expectedTotalPages = Math.max(1, Math.ceil(res.data.total / 3));
        assert.equal(
          res.data.totalPages,
          expectedTotalPages,
          `Expected totalPages ${expectedTotalPages}, got ${res.data.totalPages}`
        );
      });
    });

    it('F38.5: Library categories and shortDescriptions are localized in Azerbaijani', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        assert.ok(seeded.categories.length >= 1, 'Categories list must not be empty');
        for (const cat of seeded.categories) {
          assert.ok(
            typeof cat.label === 'string' && cat.label.trim().length > 0,
            `Category "${cat.key}" label must be a non-empty string`
          );
        }
        assertAzerbaijaniText(
          seeded.categories.map((c) => c.label).join(' '),
          'Category taxonomy labels must be localized in Azerbaijani'
        );

        const sample = seeded.items[0];
        assert.ok(sample, 'Expected at least 1 component item');
        assertAzerbaijaniText(
          sample.shortDescription,
          `Component "${sample.slug}" shortDescription must be in Azerbaijani`
        );
      });
    });
  });

  // =========================================================================
  // Feature 39: Component Detail & Linked Projects
  // =========================================================================
  describe('Feature 39: Component Detail & Linked Projects', () => {
    it('F39.1: GET /components/:slug returns 200 with all required educational sections', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        assert.ok(seeded.items.length >= 1, 'Expected at least 1 seeded component');
        const targetSlug = seeded.items[0].slug;

        const res = await executeStrictStep(() => client.get(`/components/${encodeURIComponent(targetSlug)}`));
        assert.equal(res.status, 200, `Expected 200 for GET /components/${targetSlug}`);

        const detail = res.data;
        assertValidId(detail.id || detail._id);
        assert.equal(detail.slug, targetSlug);
        assert.ok(typeof detail.name === 'string' && detail.name.length > 0);
        assert.ok(Array.isArray(detail.aliases), 'aliases must be an array');
        assert.ok(typeof detail.definition === 'string' && detail.definition.length > 0, 'definition required');
        assert.ok(
          typeof detail.workingPrinciple === 'string' && detail.workingPrinciple.length > 0,
          'workingPrinciple required'
        );
        assert.ok(Array.isArray(detail.applications) && detail.applications.length >= 1, 'applications[] required');
        assert.ok(Array.isArray(detail.specs) && detail.specs.length >= 1, 'specs[] required');
        assert.ok(Array.isArray(detail.pinout), 'pinout[] must be an array');
        assert.ok(typeof detail.wiringGuide === 'string' && detail.wiringGuide.length > 0, 'wiringGuide required');
        assert.ok(Array.isArray(detail.pros) && detail.pros.length >= 1, 'pros[] required');
        assert.ok(Array.isArray(detail.limitations) && detail.limitations.length >= 1, 'limitations[] required');
        assert.ok(Array.isArray(detail.alternatives), 'alternatives[] must be an array');
      });
    });

    it('F39.2: Educational prose sections (definition, workingPrinciple, wiringGuide) are Azerbaijani text', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        const targetSlug = seeded.items[0].slug;

        const res = await executeStrictStep(() => client.get(`/components/${encodeURIComponent(targetSlug)}`));
        assert.equal(res.status, 200);
        assertAzerbaijaniText(res.data.definition, 'definition must be in Azerbaijani');
        assertAzerbaijaniText(res.data.workingPrinciple, 'workingPrinciple must be in Azerbaijani');
        assertAzerbaijaniText(res.data.wiringGuide, 'wiringGuide must be in Azerbaijani');
      });
    });

    it('F39.3: Technical specs, pinout entries, and microcontroller/sensor codeExample validate structure', async (t) => {
      await withOfflineSkip(t, async () => {
        const searchRes = await executeStrictStep(() => client.get('/components?q=ESP32'));
        assert.equal(searchRes.status, 200);
        const seeded = searchRes.data.items.length > 0 ? searchRes.data.items : (await fetchSeededComponents(client)).items;

        let checkedCodeExample = false;
        for (const summary of seeded.slice(0, 5)) {
          const detailRes = await executeStrictStep(() =>
            client.get(`/components/${encodeURIComponent(summary.slug)}`)
          );
          assert.equal(detailRes.status, 200);
          const d = detailRes.data;

          for (const spec of d.specs) {
            assert.ok(typeof spec.label === 'string' && spec.label.length > 0, 'spec.label required');
            assert.ok(typeof spec.value === 'string' && spec.value.length > 0, 'spec.value required');
          }

          for (const pin of d.pinout) {
            assert.ok(pin.pin !== undefined && String(pin.pin).length > 0, 'pinout[].pin required');
            assert.ok(typeof pin.name === 'string' && pin.name.length > 0, 'pinout[].name required');
            assert.ok(typeof pin.function === 'string' && pin.function.length > 0, 'pinout[].function required');
          }

          if (d.codeExample && d.codeExample.code) {
            assert.ok(typeof d.codeExample.language === 'string' && d.codeExample.language.length > 0);
            assert.ok(typeof d.codeExample.code === 'string' && d.codeExample.code.length > 0);
            checkedCodeExample = true;
            break;
          }
        }

        assert.ok(checkedCodeExample, 'Expected at least one seeded microcontroller/sensor component with codeExample');
      });
    });

    it('F39.4: GET /components/:slug includes featuredProjects[] and numeric totalProjectsCount', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        const targetSlug = seeded.items[0].slug;

        const res = await executeStrictStep(() => client.get(`/components/${encodeURIComponent(targetSlug)}`));
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.data.featuredProjects), 'featuredProjects must be an array');
        assert.equal(typeof res.data.totalProjectsCount, 'number', 'totalProjectsCount must be a number');
        assert.ok(res.data.totalProjectsCount >= res.data.featuredProjects.length);
      });
    });

    it('F39.5: GET /components/:slug/projects?page=1&limit=20 returns 200 with paginated approved/published projects', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        assert.ok(seeded.items.length >= 1, 'Expected at least 1 seeded component');

        const orderedCandidates = [
          ...seeded.items.filter((c: any) => ['esp32', 'dht22', 'arduino-uno'].includes(c.slug)),
          ...seeded.items.filter((c: any) => !['esp32', 'dht22', 'arduino-uno'].includes(c.slug)),
        ];

        let linkedList: any[] = [];
        let matchedSlug = '';
        for (const candidate of orderedCandidates.slice(0, 10)) {
          const res = await executeStrictStep(() =>
            client.get(`/components/${encodeURIComponent(candidate.slug)}/projects?page=1&limit=20`)
          );
          assert.equal(res.status, 200);
          const list = extractList(res.data);
          assert.ok(Array.isArray(list), 'Expected paginated project array in GET /components/:slug/projects');
          if (list.length > 0) {
            linkedList = list;
            matchedSlug = candidate.slug;
            break;
          }
        }

        assert.ok(
          linkedList.length > 0,
          'Expected at least 1 seeded component to have >= 1 linked approved/published project'
        );
        for (const proj of linkedList) {
          assert.ok(typeof proj.title === 'string' && proj.title.length > 0, `Project under ${matchedSlug} needs title`);
          assert.ok(
            proj.status === 'APPROVED' || proj.status === 'PUBLISHED',
            `Linked project status must be APPROVED or PUBLISHED, got ${proj.status}`
          );
        }
      });
    });

    it('F39.6: All project prices in featuredProjects and /:slug/projects validate as AZN currency', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        assert.ok(seeded.items.length >= 1, 'Expected at least 1 seeded component');

        const orderedCandidates = [
          ...seeded.items.filter((c: any) => ['esp32', 'dht22', 'arduino-uno'].includes(c.slug)),
          ...seeded.items.filter((c: any) => !['esp32', 'dht22', 'arduino-uno'].includes(c.slug)),
        ];

        let validatedProjectPrices = 0;
        for (const comp of orderedCandidates.slice(0, 5)) {
          const detailRes = await executeStrictStep(() =>
            client.get(`/components/${encodeURIComponent(comp.slug)}`)
          );
          assert.equal(detailRes.status, 200);
          const featured = Array.isArray(detailRes.data?.featuredProjects)
            ? detailRes.data.featuredProjects
            : [];
          for (const proj of featured) {
            assertAznCurrency(proj.price, `Featured project "${proj.title}" price must be valid AZN`);
            validatedProjectPrices += 1;
          }

          const res = await executeStrictStep(() =>
            client.get(`/components/${encodeURIComponent(comp.slug)}/projects?page=1&limit=10`)
          );
          assert.equal(res.status, 200);
          const list = extractList(res.data);
          for (const proj of list) {
            assertAznCurrency(proj.price, `Project "${proj.title}" price must be valid AZN`);
            validatedProjectPrices += 1;
          }
        }

        assert.ok(
          validatedProjectPrices > 0,
          'Expected at least 1 linked project in featuredProjects or /:slug/projects to validate AZN currency'
        );
      });
    });
  });

  // =========================================================================
  // Feature 40: Admin Component CRUD
  // =========================================================================
  describe('Feature 40: Admin Component CRUD', () => {
    it('F40.1: Admin creates a new educational component via POST /components -> 201 Created', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const slug = uniqueTag('f40-create');
        let createdId: string | null = null;

        try {
          const created = await createTestComponent(admin.client, {
            slug,
            name: 'F40 Test Ultrasonik Modul',
          });
          createdId = created.id;
          assertValidId(created.id);
          assert.equal(created.slug, slug);
          assert.equal(created.data.name, 'F40 Test Ultrasonik Modul');
        } finally {
          await deleteTestComponent(admin.client, createdId);
        }
      });
    });

    it('F40.2: Created component is immediately retrievable via public GET /components/:slug (200 OK)', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const slug = uniqueTag('f40-read');
        let createdId: string | null = null;

        try {
          const created = await createTestComponent(admin.client, {
            slug,
            name: 'F40 Oxuma Test Modulu',
            definition: 'Ultrasonik dalğalarla məsafə ölçən tədris sensorudur.',
          });
          createdId = created.id;

          const publicRes = await executeStrictStep(() => client.get(`/components/${encodeURIComponent(slug)}`));
          assert.equal(publicRes.status, 200);
          assert.equal(publicRes.data.slug, slug);
          assert.equal(publicRes.data.name, 'F40 Oxuma Test Modulu');
          assert.equal(publicRes.data.definition, 'Ultrasonik dalğalarla məsafə ölçən tədris sensorudur.');
        } finally {
          await deleteTestComponent(admin.client, createdId);
        }
      });
    });

    it('F40.3: Admin updates component via PATCH /components/:id and changes persist on GET', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const slug = uniqueTag('f40-patch');
        let createdId: string | null = null;

        try {
          const created = await createTestComponent(admin.client, { slug });
          createdId = created.id;

          const updatedShortDesc = 'Yenilənmiş yüksək dəqiqlikli sensor təsviri.';
          const updatedSpecs = [{ label: 'Yenilənmiş Gərginlik', value: '5V DC' }];
          const updatedAliases = ['updated-e2e-alias', 'e2e-sensor-v2'];

          const patchRes = await executeStrictStep(() =>
            admin.client.patch(`/components/${created.id}`, {
              shortDescription: updatedShortDesc,
              specs: updatedSpecs,
              aliases: updatedAliases,
            })
          );
          assert.equal(patchRes.status, 200, `Expected 200 on PATCH /components/${created.id}`);

          const getRes = await executeStrictStep(() => client.get(`/components/${encodeURIComponent(slug)}`));
          assert.equal(getRes.status, 200);
          assert.equal(getRes.data.shortDescription, updatedShortDesc);
          assert.equal(getRes.data.specs[0]?.label, 'Yenilənmiş Gərginlik');
          assert.ok(getRes.data.aliases.includes('updated-e2e-alias'));
        } finally {
          await deleteTestComponent(admin.client, createdId);
        }
      });
    });

    it('F40.4: Admin deletes component via DELETE /components/:id -> 200 or 204', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const slug = uniqueTag('f40-delete');
        let createdId: string | null = null;

        try {
          const created = await createTestComponent(admin.client, { slug });
          createdId = created.id;

          const delRes = await executeStrictStep(() => admin.client.delete(`/components/${created.id}`));
          assert.ok(
            delRes.status === 200 || delRes.status === 204,
            `Expected 200 or 204 on DELETE /components/${created.id}, got ${delRes.status}`
          );
          createdId = null;
        } finally {
          await deleteTestComponent(admin.client, createdId);
        }
      });
    });

    it('F40.5: Deleted component is no longer returned by GET /components/:slug (404 Not Found)', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const slug = uniqueTag('f40-gone');
        let createdId: string | null = null;

        try {
          const created = await createTestComponent(admin.client, { slug });
          createdId = created.id;

          const delRes = await executeStrictStep(() => admin.client.delete(`/components/${created.id}`));
          assert.ok(delRes.status === 200 || delRes.status === 204);
          createdId = null;

          const getRes = await executeStrictStep(() => client.get(`/components/${encodeURIComponent(slug)}`));
          assert.equal(getRes.status, 404, `Deleted component slug "${slug}" must return 404`);
          assertErrorEnvelope(getRes.data, 404);
        } finally {
          await deleteTestComponent(admin.client, createdId);
        }
      });
    });
  });
});
