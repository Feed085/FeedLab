import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertCommissionSplit,
  assertValidId,
  assertIsoDate,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  generateUniqueUser,
} from '../utils/user-session.ts';
import type { UserSession } from '../utils/user-session.ts';
import {
  isNetworkOfflineError,
  getCachedAdminSession,
  ensureAuthorSession,
  fetchSeededComponents,
  createApprovedProjectWithBom,
  rejectTestProject,
  uniqueTag,
} from '../utils/r2-r3-helper.ts';

describe('Tier 4 Scenario S7: Student Uses Component Finder to Find Partial Match, Filters, Buys & Downloads', () => {
  let skippedOffline = false;
  let studentSession: UserSession;
  let adminSessionForCleanup: UserSession | null = null;
  let projectId: string;
  let projectSlug: string;
  let fileId: string;
  let orderId: string;
  const projectPrice = 25.0;
  const tag = uniqueTag('s7');
  const ownedSlugs = [
    `s7-mcu-${tag}`,
    `s7-soil-${tag}`,
    `s7-hum-${tag}`,
    `s7-sw-${tag}`,
  ];
  const missingSlug = `s7-pump-${tag}`;
  const missingName = `5V Su Pompası ${tag}`;
  const projectTitle = `Avtonom Bitki Suvarma Sistemi ${tag}`;

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

  it('Step 1: Student registers a fresh USER account and verifies profile via /auth/me', async (t) => {
    await runStep(t, async () => {
      const creds = generateUniqueUser('USER', 'student_s7');
      creds.fullName = 'Nigar Əhmədova';
      assertAzerbaijaniText(creds.fullName);

      studentSession = await createBuyerSession({
        email: creds.email,
        password: creds.password,
        fullName: creds.fullName,
      });
      assert.ok(studentSession.token, 'Student registration/login must yield JWT');

      const meRes = await studentSession.client.get('/auth/me');
      assert.equal(meRes.status, 200);
      const profile = meRes.data?.user || meRes.data;
      assert.equal(profile.email, creds.email);
      assert.equal(profile.role, 'USER');
    });
  });

  it('Step 2: Student browses component library (search & categories) and prepares 4-of-5 plant-watering inventory', async (t) => {
    await runStep(t, async () => {
      const seeded = await fetchSeededComponents(studentSession.client);
      assert.ok(seeded.items.length >= 1, 'Electronics library must contain seeded components');
      assert.ok(seeded.categories.length >= 1, 'Electronics library must expose categories');

      const searchRes = await studentSession.client.get('/components?q=ESP32');
      assert.equal(searchRes.status, 200);
      assert.ok(Array.isArray(searchRes.data?.items));

      const catKey = seeded.categories[0].key;
      const catRes = await studentSession.client.get(`/components?category=${encodeURIComponent(catKey)}`);
      assert.equal(catRes.status, 200);
      assert.ok(Array.isArray(catRes.data?.items));

      // Ensure deterministic 5-component plant-watering project exists and is approved
      const admin = await getCachedAdminSession();
      adminSessionForCleanup = admin;
      const author = await ensureAuthorSession(admin);
      const created = await createApprovedProjectWithBom(author, admin, {
        title: projectTitle,
        shortDescription: 'ESP32 və torpaq nəmliyi sensoru ilə avtomatik bitki suvarma sistemi.',
        domains: ['Kənd təsərrüfatı', 'Ekologiya'],
        difficulty: 'BEGINNER',
        price: projectPrice,
        components: [
          { name: `Mikrokontroller Bloku ${tag}`, quantity: 1, estimatedCostAzn: 14, componentSlug: ownedSlugs[0] },
          { name: `Torpaq Nəmliyi Sensoru ${tag}`, quantity: 1, estimatedCostAzn: 4, componentSlug: ownedSlugs[1] },
          { name: `Hava Rütubət Sensoru ${tag}`, quantity: 1, estimatedCostAzn: 7, componentSlug: ownedSlugs[2] },
          { name: `Güc Açar Modulu ${tag}`, quantity: 1, estimatedCostAzn: 3, componentSlug: ownedSlugs[3] },
          { name: missingName, quantity: 1, estimatedCostAzn: 8, componentSlug: missingSlug },
        ],
      });

      projectId = created.id;
      projectSlug = created.slug;
      fileId = created.fileId;
      assertValidId(projectId);
    });
  });

  it('Step 3: Student runs POST /projects/match-components with 4 components and sees "4/5 komponent mövcuddur"', async (t) => {
    await runStep(t, async () => {
      const res = await studentSession.client.post('/projects/match-components', {
        components: ownedSlugs,
      });
      assert.equal(res.status, 200);

      const match = (res.data?.partialMatches || []).find(
        (m: any) => (m.project?._id || m.project?.id) === projectId || m.project?.slug === projectSlug
      );
      assert.ok(match, 'Plant-watering project must appear in partialMatches');
      assert.equal(match.matchedCount, 4);
      assert.equal(match.totalRequired, 5);
      assert.equal(match.matchLabel, '4/5 komponent mövcuddur');
      assert.deepEqual(match.missingComponents, [missingName]);
      assert.equal(match.matchedComponents.length, 4);
    });
  });

  it('Step 4: Student filters match results by domain, difficulty, and paid priceType', async (t) => {
    await runStep(t, async () => {
      const filteredRes = await studentSession.client.post('/projects/match-components', {
        components: ownedSlugs,
        domain: 'Kənd təsərrüfatı',
        difficulty: 'BEGINNER',
        priceType: 'paid',
      });
      assert.equal(filteredRes.status, 200);

      const match = (filteredRes.data?.partialMatches || []).find(
        (m: any) => (m.project?._id || m.project?.id) === projectId || m.project?.slug === projectSlug
      );
      assert.ok(match, 'Plant-watering project must remain visible after matching domain/difficulty/paid filters');
      assertAznCurrency(match.project.price);
      assert.ok(match.project.price > 0);
    });
  });

  it('Step 5: Student opens project details, inspects full 5-item BOM, and confirms no commission leakage', async (t) => {
    await runStep(t, async () => {
      const detailRes = await studentSession.client.get(`/projects/${encodeURIComponent(projectSlug)}`);
      assert.equal(detailRes.status, 200);

      const p = detailRes.data;
      assert.equal(p._id || p.id, projectId);
      assertAznCurrency(p.price);
      assert.equal(p.price, projectPrice);
      assert.ok(Array.isArray(p.components) && p.components.length === 5, 'Full BOM must list 5 components');
      assert.equal(p.platformCommission, undefined, 'Public project details must hide platformCommission');
      assert.equal(p.authorEarnings, undefined, 'Public project details must hide authorEarnings');

      if (!fileId && Array.isArray(p.files) && p.files.length > 0) {
        fileId = p.files[0].fileId || p.files[0]._id;
      }
      assert.ok(fileId, 'Approved project must have downloadable fileId');
    });
  });

  it('Step 6: Student checks out project (verifying 80/20 AZN split) and confirms payment', async (t) => {
    await runStep(t, async () => {
      const checkoutRes = await studentSession.client.post('/orders/checkout', {
        projectId,
        paymentMethod: 'CARD',
      });
      assert.equal(checkoutRes.status, 201, `Expected 201 on checkout, got ${checkoutRes.status}: ${checkoutRes.raw}`);
      orderId = checkoutRes.data?._id || checkoutRes.data?.id;
      assertValidId(orderId);
      assert.equal(checkoutRes.data.status, 'PENDING');
      assertAznCurrency(checkoutRes.data.totalPrice);
      assert.equal(checkoutRes.data.totalPrice, projectPrice);
      assertCommissionSplit(
        checkoutRes.data.totalPrice,
        checkoutRes.data.authorEarnings,
        checkoutRes.data.platformCommission
      );

      const confirmRes = await studentSession.client.post('/payments/confirm', {
        orderId,
        transactionId: `TXN-S7-${Date.now()}`,
        status: 'SUCCESS',
      });
      assert.ok(confirmRes.status === 200 || confirmRes.status === 201);
      assert.equal(confirmRes.data.status, 'PAID');
      if (confirmRes.data.paidAt) {
        assertIsoDate(confirmRes.data.paidAt);
      }
    });
  });

  it('Step 7: Student verifies PAID order in /orders/my and downloads project archive', async (t) => {
    await runStep(t, async () => {
      const myOrdersRes = await studentSession.client.get('/orders/my');
      assert.equal(myOrdersRes.status, 200);
      const orders = Array.isArray(myOrdersRes.data?.orders)
        ? myOrdersRes.data.orders
        : Array.isArray(myOrdersRes.data?.data)
          ? myOrdersRes.data.data
          : Array.isArray(myOrdersRes.data)
            ? myOrdersRes.data
            : [];

      const order = orders.find((o: any) => (o._id || o.id) === orderId);
      assert.ok(order, 'Purchased order must appear in GET /orders/my');
      assert.equal(order.status, 'PAID');

      const downloadRes = await studentSession.client.get(
        `/downloads/projects/${projectId}/files/${fileId}`
      );
      assert.equal(downloadRes.status, 200, `Expected 200 downloading purchased asset, got ${downloadRes.status}`);
      assert.ok(downloadRes.raw && downloadRes.raw.length > 0, 'Downloaded asset must be non-empty');
    });
  });

  after(async () => {
    if (projectId) {
      const admin = adminSessionForCleanup || (await getCachedAdminSession());
      await rejectTestProject(admin, projectId);
    }
  });
});
