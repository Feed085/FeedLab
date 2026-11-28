import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
} from '../utils/assertions.ts';
import type { UserSession } from '../utils/user-session.ts';
import {
  isNetworkOfflineError,
  getCachedAdminSession,
  ensureAuthorSession,
  fetchSeededComponents,
  createApprovedProjectWithBom,
  rejectTestProject,
  extractList,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 4 Scenario S8: Teacher Browses Electronics Library -> Component Educational Page -> All Linked Projects -> Project Details', () => {
  let skippedOffline = false;
  const teacherClient = new ApiClient();
  let adminSessionForCleanup: UserSession | null = null;
  let createdProjectId: string | null = null;
  let selectedCategoryKey: string;
  let selectedSlug: string;
  let selectedProjectSlug: string;

  async function runStep(t: { skip: (msg?: string) => void }, fn: () => Promise<void>): Promise<void> {
    if (skippedOffline) {
      t.skip('Backend offline (skipped in earlier step)');
      return;
    }
    try {
      await fn();
    } catch (err: any) {
      if (isNetworkOfflineError(err) && process.env.E2E_STRICT_LIVE !== '1') {
        skippedOffline = true;
        t.skip(`Backend offline (${err.message || 'connection failed'})`);
        return;
      }
      throw err;
    }
  }

  it('Step 1: Teacher opens Electronics Library and inspects Azerbaijani category taxonomy', async (t) => {
    await runStep(t, async () => {
      const seeded = await fetchSeededComponents(teacherClient);
      assert.ok(seeded.items.length >= 1, 'Library must contain seeded educational components');
      assert.ok(seeded.categories.length >= 1, 'Library must expose category facets');

      for (const cat of seeded.categories) {
        assert.ok(typeof cat.key === 'string' && cat.key.length > 0);
        assert.ok(typeof cat.label === 'string' && cat.label.trim().length > 0);
        assert.equal(typeof cat.count, 'number');
      }
      assertAzerbaijaniText(
        seeded.categories.map((c) => c.label).join(' '),
        'Library category taxonomy must be localized in Azerbaijani'
      );

      const preferred =
        seeded.items.find((i: any) => i.slug.includes('esp32') || i.slug.includes('dht22')) ||
        seeded.items[0];
      selectedCategoryKey = preferred.category;
      selectedSlug = preferred.slug;
    });
  });

  it('Step 2: Teacher filters by category and searches for microcontroller/sensor keyword', async (t) => {
    await runStep(t, async () => {
      const catRes = await teacherClient.get(
        `/components?category=${encodeURIComponent(selectedCategoryKey)}`
      );
      assert.equal(catRes.status, 200);
      assert.ok(catRes.data.items.length >= 1);
      for (const item of catRes.data.items) {
        assert.equal(item.category, selectedCategoryKey);
      }

      const targetItem = catRes.data.items.find((i: any) => i.slug === selectedSlug) || catRes.data.items[0];
      const keyword = targetItem.name.split(/\s+/)[0];

      const searchRes = await teacherClient.get(
        `/components?category=${encodeURIComponent(selectedCategoryKey)}&q=${encodeURIComponent(keyword)}`
      );
      assert.equal(searchRes.status, 200);
      assert.ok(
        searchRes.data.items.some((i: any) => i.slug === targetItem.slug),
        `Expected "${targetItem.slug}" when searching with category + keyword "${keyword}"`
      );
      selectedSlug = targetItem.slug;
    });
  });

  it('Step 3: Teacher opens component detail page and verifies all 8 educational sections', async (t) => {
    await runStep(t, async () => {
      const res = await teacherClient.get(`/components/${encodeURIComponent(selectedSlug)}`);
      assert.equal(res.status, 200);
      const c = res.data;

      // 1. Definition (Nədir və nə işə yarayır)
      assertAzerbaijaniText(c.definition, 'Section 1 (definition) must be Azerbaijani prose');
      // 2. Working principle (İş prinsipi)
      assertAzerbaijaniText(c.workingPrinciple, 'Section 2 (workingPrinciple) must be Azerbaijani prose');
      // 3. Applications (İstifadə sahələri)
      assert.ok(Array.isArray(c.applications) && c.applications.length >= 1, 'Section 3 (applications) required');
      // 4. Technical specs (Texniki göstəricilər)
      assert.ok(Array.isArray(c.specs) && c.specs.length >= 1, 'Section 4 (specs) required');
      // 5. Pinout
      assert.ok(Array.isArray(c.pinout), 'Section 5 (pinout) required');
      // 6. Wiring guide + optional code example
      assertAzerbaijaniText(c.wiringGuide, 'Section 6 (wiringGuide) must be Azerbaijani prose');
      if (c.codeExample) {
        assert.ok(typeof c.codeExample.code === 'string' && c.codeExample.code.length > 0);
      }
      // 7. Pros, limitations, alternatives
      assert.ok(Array.isArray(c.pros) && c.pros.length >= 1, 'Section 7a (pros) required');
      assert.ok(Array.isArray(c.limitations) && c.limitations.length >= 1, 'Section 7b (limitations) required');
      assert.ok(Array.isArray(c.alternatives), 'Section 7c (alternatives) required');
      // 8. Featured projects & totalProjectsCount
      assert.ok(Array.isArray(c.featuredProjects), 'Section 8 (featuredProjects) required');
      assert.equal(typeof c.totalProjectsCount, 'number');
    });
  });

  it('Step 4: Teacher clicks "Bütün layihələri gör" and views paginated approved projects for component', async (t) => {
    await runStep(t, async () => {
      let projectsRes = await teacherClient.get(
        `/components/${encodeURIComponent(selectedSlug)}/projects?page=1&limit=20`
      );
      assert.equal(projectsRes.status, 200);
      let list = extractList(projectsRes.data);

      // If this seeded component has 0 linked projects yet, publish one referencing it
      if (list.length === 0) {
        const admin = await getCachedAdminSession();
        adminSessionForCleanup = admin;
        const author = await ensureAuthorSession(admin);
        const created = await createApprovedProjectWithBom(author, admin, {
          title: `Müəllim Dərs Layihəsi ${uniqueTag('s8')}`,
          domains: ['Kompüter mühəndisliyi'],
          difficulty: 'BEGINNER',
          price: 0,
          components: [{ name: selectedSlug.toUpperCase(), quantity: 1, componentSlug: selectedSlug }],
        });
        createdProjectId = created.id;

        projectsRes = await teacherClient.get(
          `/components/${encodeURIComponent(selectedSlug)}/projects?page=1&limit=20`
        );
        assert.equal(projectsRes.status, 200);
        list = extractList(projectsRes.data);
      }

      assert.ok(list.length >= 1, 'Expected >= 1 approved project linked to component');
      for (const proj of list) {
        if (proj.status) {
          assert.ok(proj.status === 'APPROVED' || proj.status === 'PUBLISHED');
        }
      }

      selectedProjectSlug = list[0].slug || list[0]._id || list[0].id;
      assert.ok(selectedProjectSlug, 'Linked project must have slug or id');
    });
  });

  it('Step 5: Teacher opens linked project details and inspects BOM, installation guide, and AZN price', async (t) => {
    await runStep(t, async () => {
      const detailRes = await teacherClient.get(`/projects/${encodeURIComponent(selectedProjectSlug)}`);
      assert.equal(detailRes.status, 200);

      const p = detailRes.data;
      assert.ok(typeof p.title === 'string' && p.title.length > 0);
      assertAznCurrency(p.price);
      assert.ok(Array.isArray(p.components) && p.components.length >= 1, 'Project BOM components[] must be present');
      assert.ok(
        typeof p.installationGuide === 'string' || typeof p.fullDescription === 'string' || typeof p.description === 'string',
        'Project educational description/installation guide must be present'
      );
      assert.equal(p.platformCommission, undefined, 'Public project details must hide platformCommission');
      assert.equal(p.authorEarnings, undefined, 'Public project details must hide authorEarnings');
    });
  });

  after(async () => {
    if (createdProjectId) {
      const admin = adminSessionForCleanup || (await getCachedAdminSession());
      await rejectTestProject(admin, createdProjectId);
    }
  });
});
