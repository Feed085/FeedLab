import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertValidId,
} from '../utils/assertions.ts';
import {
  withOfflineSkip,
  executeStrictStep,
  getCachedAdminSession,
  ensureAuthorSession,
  fetchSeededComponents,
  createApprovedProjectWithBom,
  createDraftProjectWithBom,
  rejectTestProject,
  extractList,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 1: Component-Based Project Finder (Features 41 - 42)', () => {
  const client = new ApiClient();

  // =========================================================================
  // Feature 41: Project Catalog Extensions (domain, difficulty, component)
  // =========================================================================
  describe('Feature 41: Project Catalog Extensions', () => {
    it('F41.1: GET /projects?domain=... filters approved projects by domain', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const targetDomain = 'Kənd təsərrüfatı';
        let projectId: string | null = null;

        try {
          const project = await createApprovedProjectWithBom(author, admin, {
            title: `F41 Domain Test ${uniqueTag('agri')}`,
            domains: [targetDomain],
            difficulty: 'BEGINNER',
          });
          projectId = project.id;

          const res = await executeStrictStep(() =>
            client.get(`/projects?domain=${encodeURIComponent(targetDomain)}&limit=50`)
          );
          assert.equal(res.status, 200);
          const list = extractList(res.data);
          assert.ok(list.length >= 1, 'Expected at least 1 project for domain filter');

          const found = list.find((p: any) => (p._id || p.id) === project.id || p.slug === project.slug);
          assert.ok(found, 'Newly approved project with domain must be returned by GET /projects?domain=...');

          for (const item of list) {
            if (Array.isArray(item.domains)) {
              assert.ok(
                item.domains.includes(targetDomain),
                `Returned project "${item.title}" domains ${JSON.stringify(item.domains)} must include "${targetDomain}"`
              );
            }
          }
        } finally {
          await rejectTestProject(admin, projectId);
        }
      });
    });

    it('F41.2: GET /projects?difficulty=BEGINNER returns only BEGINNER difficulty projects', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        let projectId: string | null = null;

        try {
          const project = await createApprovedProjectWithBom(author, admin, {
            title: `F41 Difficulty Test ${uniqueTag('beg')}`,
            difficulty: 'BEGINNER',
          });
          projectId = project.id;

          const res = await executeStrictStep(() => client.get('/projects?difficulty=BEGINNER&limit=50'));
          assert.equal(res.status, 200);
          const list = extractList(res.data);
          assert.ok(list.length >= 1, 'Expected at least 1 BEGINNER project');

          const found = list.find((p: any) => (p._id || p.id) === project.id || p.slug === project.slug);
          assert.ok(found, 'Newly approved BEGINNER project must appear in difficulty filter');

          for (const item of list) {
            if (item.difficulty) {
              assert.equal(item.difficulty, 'BEGINNER', `Expected BEGINNER, got ${item.difficulty}`);
            }
          }
        } finally {
          await rejectTestProject(admin, projectId);
        }
      });
    });

    it('F41.3: GET /projects?component=<slug> returns projects referencing that component', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const uniqueSlug = uniqueTag('f41-comp');
        let projectId: string | null = null;

        try {
          const project = await createApprovedProjectWithBom(author, admin, {
            title: `F41 Component Query ${uniqueTag('proj')}`,
            components: [
              { name: `Sensor ${uniqueSlug}`, quantity: 1, estimatedCostAzn: 10, componentSlug: uniqueSlug },
            ],
          });
          projectId = project.id;

          const res = await executeStrictStep(() =>
            client.get(`/projects?component=${encodeURIComponent(uniqueSlug)}`)
          );
          assert.equal(res.status, 200);
          const list = extractList(res.data);
          const found = list.find((p: any) => (p._id || p.id) === project.id || p.slug === project.slug);
          assert.ok(found, `Expected project ${project.id} when querying ?component=${uniqueSlug}`);
        } finally {
          await rejectTestProject(admin, projectId);
        }
      });
    });

    it('F41.4: Existing homepage PUBLISHED status and project detail commission-hiding contracts preserved', async (t) => {
      await withOfflineSkip(t, async () => {
        const homeRes = await executeStrictStep(() => client.get('/projects/homepage'));
        assert.equal(homeRes.status, 200);

        const homeItems = [
          ...(Array.isArray(homeRes.data?.featuredProjects) ? homeRes.data.featuredProjects : []),
          ...(Array.isArray(homeRes.data?.latestProjects) ? homeRes.data.latestProjects : []),
        ];
        assert.ok(homeItems.length > 0, 'Homepage must return at least 1 featured or latest project');
        for (const item of homeItems) {
          assert.equal(item.status, 'PUBLISHED', 'Homepage items must preserve status: PUBLISHED');
        }

        const listRes = await executeStrictStep(() => client.get('/projects?limit=5'));
        assert.equal(listRes.status, 200);
        const projects = extractList(listRes.data);
        assert.ok(projects.length > 0, 'GET /projects?limit=5 must return at least 1 approved project');

        const slugOrId = projects[0].slug || projects[0]._id || projects[0].id;
        assert.ok(slugOrId, 'First project must expose slug or id');
        const detailRes = await executeStrictStep(() => client.get(`/projects/${slugOrId}`));
        assert.equal(detailRes.status, 200);
        assert.equal(
          detailRes.data?.platformCommission,
          undefined,
          'platformCommission must remain hidden on public GET /projects/:slug'
        );
        assert.equal(
          detailRes.data?.authorEarnings,
          undefined,
          'authorEarnings must remain hidden on public GET /projects/:slug'
        );
      });
    });

    it('F41.5: Author POST /projects accepts domains[], difficulty, and structured BOM components[]', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);

        const draft = await createDraftProjectWithBom(author, {
          title: `F41 Structured BOM ${uniqueTag('bom')}`,
          domains: ['Ekologiya', 'Kənd təsərrüfatı'],
          difficulty: 'BEGINNER',
          components: [
            {
              name: 'ESP32',
              quantity: 1,
              estimatedCostAzn: 14.5,
              notes: 'Wi-Fi mikrokontroller',
              componentSlug: 'esp32',
            },
            {
              name: 'Torpaq Nəmliyi Sensoru',
              quantity: 1,
              estimatedCostAzn: 5.0,
              componentSlug: 'soil-moisture-sensor',
            },
          ],
        });

        assert.deepEqual(draft.data.domains, ['Ekologiya', 'Kənd təsərrüfatı']);
        assert.equal(draft.data.difficulty, 'BEGINNER');
        assert.ok(Array.isArray(draft.data.components) && draft.data.components.length === 2);
        assert.equal(draft.data.components[0].componentSlug, 'esp32');
      });
    });
  });

  // =========================================================================
  // Feature 42: Component Matching Engine (POST /projects/match-components)
  // =========================================================================
  describe('Feature 42: Component Matching Engine', () => {
    it('F42.1: Selecting all components of an approved project returns it in fullMatches[] with N/N label', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('f42full');
        const c1 = `chip-a-${tag}`;
        const c2 = `sensor-b-${tag}`;
        let projectId: string | null = null;

        try {
          const project = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Full Match ${tag}`,
            domains: ['İT'],
            difficulty: 'BEGINNER',
            price: 15,
            components: [
              { name: `Chip A ${tag}`, quantity: 1, componentSlug: c1 },
              { name: `Sensor B ${tag}`, quantity: 1, componentSlug: c2 },
            ],
          });
          projectId = project.id;

          const res = await executeStrictStep(() =>
            client.post('/projects/match-components', { components: [c1, c2] })
          );
          assert.equal(res.status, 200);

          const match = (res.data?.fullMatches || []).find(
            (m: any) => (m.project?._id || m.project?.id) === project.id || m.project?.slug === project.slug
          );
          assert.ok(match, 'Approved project must appear in fullMatches[] when all components selected');
          assert.equal(match.matchedCount, 2);
          assert.equal(match.totalRequired, 2);
          assert.equal(match.matchLabel, '2/2 komponent mövcuddur');
          assert.deepEqual(match.missingComponents, []);
        } finally {
          await rejectTestProject(admin, projectId);
        }
      });
    });

    it('F42.2: Selecting N-1 components returns project in partialMatches[] with exact missing component', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('f42part');
        const c1 = `part-1-${tag}`;
        const c2 = `part-2-${tag}`;
        const c3 = `part-3-${tag}`;
        const missingName = `HC-SR04 Missing ${tag}`;
        let projectId: string | null = null;

        try {
          const project = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Partial Match ${tag}`,
            domains: ['Kompüter mühəndisliyi'],
            difficulty: 'INTERMEDIATE',
            price: 20,
            components: [
              { name: `Part 1 ${tag}`, quantity: 1, componentSlug: c1 },
              { name: `Part 2 ${tag}`, quantity: 1, componentSlug: c2 },
              { name: missingName, quantity: 1, componentSlug: c3 },
            ],
          });
          projectId = project.id;

          const res = await executeStrictStep(() =>
            client.post('/projects/match-components', { components: [c1, c2] })
          );
          assert.equal(res.status, 200);

          const match = (res.data?.partialMatches || []).find(
            (m: any) => (m.project?._id || m.project?.id) === project.id || m.project?.slug === project.slug
          );
          assert.ok(match, 'Approved project must appear in partialMatches[] when N-1 components selected');
          assert.equal(match.matchedCount, 2);
          assert.equal(match.totalRequired, 3);
          assert.equal(match.matchLabel, '2/3 komponent mövcuddur');
          assertAzerbaijaniText(match.matchLabel);
          assert.ok(Array.isArray(match.missingComponents) && match.missingComponents.length === 1);
          assert.equal(match.missingComponents[0], missingName);
        } finally {
          await rejectTestProject(admin, projectId);
        }
      });
    });

    it('F42.3: Response includes selectedComponents, accurate counts, and zero overlap between fullMatches and partialMatches', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('f42counts');
        const c1 = `cnt-1-${tag}`;
        const c2 = `cnt-2-${tag}`;
        const c3 = `cnt-3-${tag}`;
        const createdIds: string[] = [];

        try {
          const p1 = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Full Group ${tag}`,
            components: [
              { name: `Cnt 1 ${tag}`, quantity: 1, componentSlug: c1 },
              { name: `Cnt 2 ${tag}`, quantity: 1, componentSlug: c2 },
            ],
          });
          createdIds.push(p1.id);
          const p2 = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Partial Group ${tag}`,
            components: [
              { name: `Cnt 1 ${tag}`, quantity: 1, componentSlug: c1 },
              { name: `Cnt 2 ${tag}`, quantity: 1, componentSlug: c2 },
              { name: `Cnt 3 ${tag}`, quantity: 1, componentSlug: c3 },
            ],
          });
          createdIds.push(p2.id);

          const res = await executeStrictStep(() =>
            client.post('/projects/match-components', { components: [c1, c2] })
          );
          assert.equal(res.status, 200);

          assert.ok(Array.isArray(res.data.selectedComponents));
          assert.equal(res.data.totalFull, res.data.fullMatches.length);
          assert.equal(res.data.totalPartial, res.data.partialMatches.length);
          assert.ok(res.data.totalFull >= 1);
          assert.ok(res.data.totalPartial >= 1);

          const fullIds = new Set(res.data.fullMatches.map((m: any) => String(m.project?._id || m.project?.id)));
          for (const pm of res.data.partialMatches) {
            const pid = String(pm.project?._id || pm.project?.id);
            assert.ok(!fullIds.has(pid), `Project ${pid} must not appear in both fullMatches and partialMatches`);
          }
        } finally {
          for (const id of createdIds) {
            await rejectTestProject(admin, id);
          }
        }
      });
    });

    it('F42.4: Filtering match-components by domain narrows results exclusively to matching domain', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('f42dom');
        const sharedComp = `dom-comp-${tag}`;
        const createdIds: string[] = [];

        try {
          const energyProj = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Energy ${tag}`,
            domains: ['Energetika'],
            components: [{ name: `Shared ${tag}`, quantity: 1, componentSlug: sharedComp }],
          });
          createdIds.push(energyProj.id);
          const healthProj = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Health ${tag}`,
            domains: ['Səhiyyə'],
            components: [{ name: `Shared ${tag}`, quantity: 1, componentSlug: sharedComp }],
          });
          createdIds.push(healthProj.id);

          const res = await executeStrictStep(() =>
            client.post('/projects/match-components', {
              components: [sharedComp],
              domain: 'Energetika',
            })
          );
          assert.equal(res.status, 200);
          const allIds = [...res.data.fullMatches, ...res.data.partialMatches].map(
            (m: any) => m.project?._id || m.project?.id
          );
          assert.ok(allIds.includes(energyProj.id), 'Energetika project must be included');
          assert.ok(!allIds.includes(healthProj.id), 'Səhiyyə project must be excluded by Energetika filter');
        } finally {
          for (const id of createdIds) {
            await rejectTestProject(admin, id);
          }
        }
      });
    });

    it('F42.5: Filtering match-components by priceType (free vs paid) and minPrice/maxPrice works accurately', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('f42price');
        const sharedComp = `price-comp-${tag}`;
        const createdIds: string[] = [];

        try {
          const freeProj = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Free ${tag}`,
            price: 0,
            components: [{ name: `PriceComp ${tag}`, quantity: 1, componentSlug: sharedComp }],
          });
          createdIds.push(freeProj.id);
          const paidProj = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Paid ${tag}`,
            price: 35,
            components: [{ name: `PriceComp ${tag}`, quantity: 1, componentSlug: sharedComp }],
          });
          createdIds.push(paidProj.id);

          const freeRes = await executeStrictStep(() =>
            client.post('/projects/match-components', {
              components: [sharedComp],
              priceType: 'free',
            })
          );
          assert.equal(freeRes.status, 200);
          const freeAll = [...freeRes.data.fullMatches, ...freeRes.data.partialMatches];
          assert.ok(freeAll.some((m: any) => (m.project?._id || m.project?.id) === freeProj.id));
          assert.ok(!freeAll.some((m: any) => (m.project?._id || m.project?.id) === paidProj.id));
          for (const m of freeAll) {
            assert.equal(m.project.price, 0);
          }

          const paidRes = await executeStrictStep(() =>
            client.post('/projects/match-components', {
              components: [sharedComp],
              priceType: 'paid',
              minPrice: 20,
              maxPrice: 50,
            })
          );
          assert.equal(paidRes.status, 200);
          const paidAll = [...paidRes.data.fullMatches, ...paidRes.data.partialMatches];
          assert.ok(paidAll.some((m: any) => (m.project?._id || m.project?.id) === paidProj.id));
          assert.ok(!paidAll.some((m: any) => (m.project?._id || m.project?.id) === freeProj.id));
          for (const m of paidAll) {
            assertAznCurrency(m.project.price);
            assert.ok(m.project.price >= 20 && m.project.price <= 50);
          }
        } finally {
          for (const id of createdIds) {
            await rejectTestProject(admin, id);
          }
        }
      });
    });

    it('F42.6: Filtering match-components by difficulty narrows results to matching level', async (t) => {
      await withOfflineSkip(t, async () => {
        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('f42diff');
        const sharedComp = `diff-comp-${tag}`;
        const createdIds: string[] = [];

        try {
          const advProj = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Advanced ${tag}`,
            difficulty: 'ADVANCED',
            components: [{ name: `DiffComp ${tag}`, quantity: 1, componentSlug: sharedComp }],
          });
          createdIds.push(advProj.id);
          const begProj = await createApprovedProjectWithBom(author, admin, {
            title: `F42 Beginner ${tag}`,
            difficulty: 'BEGINNER',
            components: [{ name: `DiffComp ${tag}`, quantity: 1, componentSlug: sharedComp }],
          });
          createdIds.push(begProj.id);

          const res = await executeStrictStep(() =>
            client.post('/projects/match-components', {
              components: [sharedComp],
              difficulty: 'ADVANCED',
            })
          );
          assert.equal(res.status, 200);
          const all = [...res.data.fullMatches, ...res.data.partialMatches];
          assert.ok(all.some((m: any) => (m.project?._id || m.project?.id) === advProj.id));
          assert.ok(!all.some((m: any) => (m.project?._id || m.project?.id) === begProj.id));
        } finally {
          for (const id of createdIds) {
            await rejectTestProject(admin, id);
          }
        }
      });
    });

    it('F42.7: Passing a seeded component Mongo id/_id resolves by ID and matches projects using that component', async (t) => {
      await withOfflineSkip(t, async () => {
        const seeded = await fetchSeededComponents(client);
        assert.ok(seeded.items.length >= 1, 'Expected at least 1 seeded component');
        const targetComp =
          seeded.items.find((c: any) => c.slug === 'esp32' || c.slug === 'dht22') || seeded.items[0];
        const targetId = String(targetComp.id || targetComp._id);
        assertValidId(targetId, 'Seeded component must have valid Mongo id/_id');

        const admin = await getCachedAdminSession();
        const author = await ensureAuthorSession(admin);
        const tag = uniqueTag('f42byid');
        let projectId: string | null = null;

        try {
          const project = await createApprovedProjectWithBom(author, admin, {
            title: `F42 By Component ID ${tag}`,
            components: [
              { name: targetComp.name, quantity: 1, componentSlug: targetComp.slug },
            ],
          });
          projectId = project.id;

          const res = await executeStrictStep(() =>
            client.post('/projects/match-components', {
              components: [targetId],
            })
          );
          assert.equal(res.status, 200, `Expected 200 matching by component ID ${targetId}, got ${res.status}`);
          assert.ok(
            Array.isArray(res.data?.selectedComponents) &&
              res.data.selectedComponents.includes(targetComp.slug),
            `Expected selectedComponents to resolve ID ${targetId} to slug "${targetComp.slug}", got ${JSON.stringify(res.data?.selectedComponents)}`
          );

          const match = (res.data?.fullMatches || []).find(
            (m: any) => (m.project?._id || m.project?.id) === project.id || m.project?.slug === project.slug
          );
          assert.ok(match, 'Project referencing seeded component must appear in fullMatches[] when queried by component Mongo ID');
          assert.equal(match.matchedCount, 1);
          assert.equal(match.totalRequired, 1);
          assert.equal(match.matchLabel, '1/1 komponent mövcuddur');
          assert.deepEqual(match.missingComponents, []);
        } finally {
          await rejectTestProject(admin, projectId);
        }
      });
    });
  });
});
