import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import { assertAznCurrency } from '../utils/assertions.ts';
import {
  withOfflineSkip,
  executeStrictStep,
  getCachedAdminSession,
  ensureAuthorSession,
  createApprovedProjectWithBom,
  rejectTestProject,
  extractList,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 3 Pairwise: C05 Component Finder Filter Matrix (Components x Domain x PriceType x Difficulty)', () => {
  const client = new ApiClient();

  it('C05.1: Components x domain=Ekologiya x priceType=free x difficulty=BEGINNER returns only free beginner Ecology matches', async (t) => {
    await withOfflineSkip(t, async () => {
      const admin = await getCachedAdminSession();
      const author = await ensureAuthorSession(admin);
      const tag = uniqueTag('c05m1');
      const compA = `c05-esp-${tag}`;
      const compB = `c05-dht-${tag}`;
      const createdIds: string[] = [];

      try {
        const freeEcoBeg = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Free Eco Beginner ${tag}`,
          domains: ['Ekologiya'],
          difficulty: 'BEGINNER',
          price: 0,
          components: [
            { name: `ESP32 ${tag}`, quantity: 1, componentSlug: compA },
            { name: `DHT22 ${tag}`, quantity: 1, componentSlug: compB },
          ],
        });
        createdIds.push(freeEcoBeg.id);

        const paidEcoInter = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Paid Eco Intermediate ${tag}`,
          domains: ['Ekologiya'],
          difficulty: 'INTERMEDIATE',
          price: 35,
          components: [
            { name: `ESP32 ${tag}`, quantity: 1, componentSlug: compA },
            { name: `DHT22 ${tag}`, quantity: 1, componentSlug: compB },
          ],
        });
        createdIds.push(paidEcoInter.id);

        const res = await executeStrictStep(() =>
          client.post('/projects/match-components', {
            components: [compA, compB],
            domain: 'Ekologiya',
            priceType: 'free',
            difficulty: 'BEGINNER',
          })
        );
        assert.equal(res.status, 200);

        const all = [...res.data.fullMatches, ...res.data.partialMatches];
        assert.ok(
          all.some((m: any) => (m.project?._id || m.project?.id) === freeEcoBeg.id),
          'Free Beginner Ecology project must be returned'
        );
        assert.ok(
          !all.some((m: any) => (m.project?._id || m.project?.id) === paidEcoInter.id),
          'Paid Intermediate project must be excluded'
        );

        for (const m of all) {
          assert.equal(m.project.price, 0);
          if (m.project.difficulty) assert.equal(m.project.difficulty, 'BEGINNER');
          if (Array.isArray(m.project.domains)) assert.ok(m.project.domains.includes('Ekologiya'));
        }
      } finally {
        for (const id of createdIds) {
          await rejectTestProject(admin, id);
        }
      }
    });
  });

  it('C05.2: Same components x priceType=paid x minPrice=10 x maxPrice=60 x difficulty=INTERMEDIATE flips match set cleanly', async (t) => {
    await withOfflineSkip(t, async () => {
      const admin = await getCachedAdminSession();
      const author = await ensureAuthorSession(admin);
      const tag = uniqueTag('c05m2');
      const compA = `c05-p-a-${tag}`;
      const compB = `c05-p-b-${tag}`;
      const createdIds: string[] = [];

      try {
        const freeProj = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Free Proj ${tag}`,
          domains: ['Ekologiya'],
          difficulty: 'BEGINNER',
          price: 0,
          components: [
            { name: `A ${tag}`, quantity: 1, componentSlug: compA },
            { name: `B ${tag}`, quantity: 1, componentSlug: compB },
          ],
        });
        createdIds.push(freeProj.id);

        const paidInRange = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Paid In Range ${tag}`,
          domains: ['Ekologiya'],
          difficulty: 'INTERMEDIATE',
          price: 42.5,
          components: [
            { name: `A ${tag}`, quantity: 1, componentSlug: compA },
            { name: `B ${tag}`, quantity: 1, componentSlug: compB },
          ],
        });
        createdIds.push(paidInRange.id);

        const paidOutOfRange = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Paid Expensive ${tag}`,
          domains: ['Ekologiya'],
          difficulty: 'INTERMEDIATE',
          price: 95,
          components: [
            { name: `A ${tag}`, quantity: 1, componentSlug: compA },
            { name: `B ${tag}`, quantity: 1, componentSlug: compB },
          ],
        });
        createdIds.push(paidOutOfRange.id);

        const res = await executeStrictStep(() =>
          client.post('/projects/match-components', {
            components: [compA, compB],
            domain: 'Ekologiya',
            priceType: 'paid',
            minPrice: 10,
            maxPrice: 60,
            difficulty: 'INTERMEDIATE',
          })
        );
        assert.equal(res.status, 200);

        const all = [...res.data.fullMatches, ...res.data.partialMatches];
        assert.ok(all.some((m: any) => (m.project?._id || m.project?.id) === paidInRange.id));
        assert.ok(!all.some((m: any) => (m.project?._id || m.project?.id) === freeProj.id));
        assert.ok(!all.some((m: any) => (m.project?._id || m.project?.id) === paidOutOfRange.id));

        for (const m of all) {
          assertAznCurrency(m.project.price);
          assert.ok(m.project.price >= 10 && m.project.price <= 60);
        }
      } finally {
        for (const id of createdIds) {
          await rejectTestProject(admin, id);
        }
      }
    });
  });

  it('C05.3: Adding missing 5th component promotes partialMatches (4/5) to fullMatches (5/5)', async (t) => {
    await withOfflineSkip(t, async () => {
      const admin = await getCachedAdminSession();
      const author = await ensureAuthorSession(admin);
      const tag = uniqueTag('c05prom');
      const slugs = [1, 2, 3, 4, 5].map((i) => `c05-s${i}-${tag}`);
      let projectId: string | null = null;

      try {
        const project = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Promotion Project ${tag}`,
          components: slugs.map((s, idx) => ({
            name: `Comp ${idx + 1} ${tag}`,
            quantity: 1,
            componentSlug: s,
          })),
        });
        projectId = project.id;

        const beforeRes = await executeStrictStep(() =>
          client.post('/projects/match-components', { components: slugs.slice(0, 4) })
        );
        assert.equal(beforeRes.status, 200);
        const beforePartial = beforeRes.data.partialMatches.find(
          (m: any) => (m.project?._id || m.project?.id) === project.id
        );
        assert.ok(beforePartial, 'Project must start in partialMatches with 4/5');
        assert.equal(beforePartial.matchLabel, '4/5 komponent mövcuddur');
        assert.equal(beforePartial.missingComponents.length, 1);

        const afterRes = await executeStrictStep(() =>
          client.post('/projects/match-components', { components: slugs })
        );
        assert.equal(afterRes.status, 200);
        const afterFull = afterRes.data.fullMatches.find(
          (m: any) => (m.project?._id || m.project?.id) === project.id
        );
        assert.ok(afterFull, 'Project must promote into fullMatches once missing component is added');
        assert.equal(afterFull.matchLabel, '5/5 komponent mövcuddur');
        assert.deepEqual(afterFull.missingComponents, []);
        assert.ok(
          !afterRes.data.partialMatches.some((m: any) => (m.project?._id || m.project?.id) === project.id),
          'Promoted project must no longer appear in partialMatches'
        );
      } finally {
        await rejectTestProject(admin, projectId);
      }
    });
  });

  it('C05.4: Removing 1 component demotes fullMatches item back to partialMatches with missing component name', async (t) => {
    await withOfflineSkip(t, async () => {
      const admin = await getCachedAdminSession();
      const author = await ensureAuthorSession(admin);
      const tag = uniqueTag('c05dem');
      const c1 = `c05-d1-${tag}`;
      const c2 = `c05-d2-${tag}`;
      const c3 = `c05-d3-${tag}`;
      const removedName = `Servo Motor ${tag}`;
      let projectId: string | null = null;

      try {
        const project = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Demotion Project ${tag}`,
          components: [
            { name: `MCU ${tag}`, quantity: 1, componentSlug: c1 },
            { name: `Driver ${tag}`, quantity: 1, componentSlug: c2 },
            { name: removedName, quantity: 1, componentSlug: c3 },
          ],
        });
        projectId = project.id;

        const fullRes = await executeStrictStep(() =>
          client.post('/projects/match-components', { components: [c1, c2, c3] })
        );
        assert.equal(fullRes.status, 200);
        assert.ok(fullRes.data.fullMatches.some((m: any) => (m.project?._id || m.project?.id) === project.id));

        const demotedRes = await executeStrictStep(() =>
          client.post('/projects/match-components', { components: [c1, c2] })
        );
        assert.equal(demotedRes.status, 200);
        assert.ok(!demotedRes.data.fullMatches.some((m: any) => (m.project?._id || m.project?.id) === project.id));
        const demoted = demotedRes.data.partialMatches.find(
          (m: any) => (m.project?._id || m.project?.id) === project.id
        );
        assert.ok(demoted, 'Project must demote into partialMatches after removing 1 component');
        assert.equal(demoted.matchLabel, '2/3 komponent mövcuddur');
        assert.deepEqual(demoted.missingComponents, [removedName]);
      } finally {
        await rejectTestProject(admin, projectId);
      }
    });
  });

  it('C05.5: Cross-check consistency between GET /projects?component=&domain=&difficulty= and POST /projects/match-components', async (t) => {
    await withOfflineSkip(t, async () => {
      const admin = await getCachedAdminSession();
      const author = await ensureAuthorSession(admin);
      const tag = uniqueTag('c05xchk');
      const targetComp = `c05-x-${tag}`;
      let projectId: string | null = null;

      try {
        const proj = await createApprovedProjectWithBom(author, admin, {
          title: `C05 Cross Check ${tag}`,
          domains: ['Energetika'],
          difficulty: 'INTERMEDIATE',
          components: [{ name: `XComp ${tag}`, quantity: 1, componentSlug: targetComp }],
        });
        projectId = proj.id;

        const catalogRes = await executeStrictStep(() =>
          client.get(
            `/projects?component=${encodeURIComponent(targetComp)}&domain=${encodeURIComponent('Energetika')}&difficulty=INTERMEDIATE`
          )
        );
        assert.equal(catalogRes.status, 200);
        const catalogIds = new Set(extractList(catalogRes.data).map((p: any) => String(p._id || p.id)));

        const matchRes = await executeStrictStep(() =>
          client.post('/projects/match-components', {
            components: [targetComp],
            domain: 'Energetika',
            difficulty: 'INTERMEDIATE',
          })
        );
        assert.equal(matchRes.status, 200);
        const matchIds = new Set(
          [...matchRes.data.fullMatches, ...matchRes.data.partialMatches].map((m: any) =>
            String(m.project?._id || m.project?.id)
          )
        );

        assert.ok(catalogIds.has(proj.id), 'Catalog query must return the approved project');
        assert.ok(matchIds.has(proj.id), 'Match engine must return the same approved project');
      } finally {
        await rejectTestProject(admin, projectId);
      }
    });
  });
});
