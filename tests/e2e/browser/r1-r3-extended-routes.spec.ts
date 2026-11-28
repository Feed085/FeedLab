import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser, Page, Request, Response } from 'playwright';
import { config } from '../config.ts';
import { ApiClient } from '../utils/api-client.ts';
import {
  createTestComponent,
  deleteTestComponent,
  extractList,
  getCachedAdminSession,
} from '../utils/r2-r3-helper.ts';
import {
  launchBrowser,
  withPage,
  ensureWebReachable,
  navigateAndWaitReady,
  assertLightThemePalette,
  assertAzerbaijaniUiCopy,
  assertNoDiagnostics,
  clearDiagnostics,
  loginViaUi,
} from './browser-helper.ts';

interface ExtendedProjectItem {
  slug: string;
  title: string;
  price?: number;
  isFree?: boolean;
  domains?: string[];
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
  thumbnailUrl?: string;
  images?: string[];
  installationGuide?: string;
  components?: Array<{ name: string; quantity?: number }>;
}

const DIFFICULTY_LABELS: Record<string, RegExp> = {
  BEGINNER: /Başlanğıc/i,
  INTERMEDIATE: /Orta/i,
  ADVANCED: /İrəli|Çətin/i,
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function discoverExtendedProjectFixture(): Promise<ExtendedProjectItem> {
  const api = new ApiClient();
  const listRes = await api.get('/projects?limit=30');
  assert(
    listRes.ok,
    `Expected GET /projects?limit=30 to succeed, got HTTP ${listRes.status}: ${listRes.raw}`
  );

  const items = extractList(listRes.data);
  assert(items.length > 0, 'Expected at least 1 seeded approved project');

  let best: ExtendedProjectItem | null = null;
  let bestScore = -1;

  for (const item of items) {
    if (!item?.slug) continue;
    const detailRes = await api.get(`/projects/${item.slug}`);
    if (!detailRes.ok || !detailRes.data) continue;
    const detail = detailRes.data as ExtendedProjectItem;

    const hasBom = Array.isArray(detail.components) && detail.components.length > 0;
    const hasDomains = Array.isArray(detail.domains) && detail.domains.length > 0;
    const hasDifficulty = Boolean(detail.difficulty);
    const hasImages =
      Boolean(detail.thumbnailUrl) || (Array.isArray(detail.images) && detail.images.length > 0);
    const hasGuide = Boolean(detail.installationGuide && detail.installationGuide.trim().length > 0);

    const score =
      (hasBom ? 8 : 0) +
      (hasDomains ? 4 : 0) +
      (hasDifficulty ? 4 : 0) +
      (hasImages ? 2 : 0) +
      (hasGuide ? 1 : 0);

    if (score > bestScore) {
      bestScore = score;
      best = detail;
    }
    if (hasBom && hasDomains && hasDifficulty && hasImages && hasGuide) {
      break;
    }
  }

  assert(
    best && Array.isArray(best.components) && best.components.length > 0,
    'Expected at least 1 seeded project with BOM components, domains, and difficulty'
  );
  return best;
}

async function clickFilterControl(
  page: Page,
  optionMatchers: RegExp[],
  buttonMatchers: RegExp[]
): Promise<boolean> {
  const main = page.locator('main').first();
  const selects = main.locator('select');
  const selectCount = await selects.count();

  const startProjectsGetWait = () =>
    page
      .waitForResponse(
        (r: Response) => r.url().includes('/projects') && r.request().method() === 'GET',
        { timeout: 6000 }
      )
      .catch(() => null);
  const assertProjectsGetOk = (resp: Response | null) => {
    if (resp) {
      assert(
        resp.ok() || resp.status() === 304,
        `Expected 2xx/304 response from GET /projects, got ${resp.status()}`
      );
    }
  };

  for (let i = 0; i < selectCount; i++) {
    const sel = selects.nth(i);
    const options: Array<{ value: string; text: string }> = await sel
      .locator('option')
      .evaluateAll((opts: Element[]) =>
        opts.map((o: Element) => ({
          value: (o as HTMLOptionElement).value,
          text: (o.textContent || '').trim(),
        }))
      );
    const matchOpt = options.find((o) =>
      optionMatchers.some((re) => re.test(o.value) || re.test(o.text))
    );
    if (matchOpt) {
      const respPromise = startProjectsGetWait();
      await sel.selectOption(matchOpt.value);
      assertProjectsGetOk(await respPromise);
      await page.waitForTimeout(250);
      return true;
    }
  }

  for (const re of buttonMatchers) {
    const checkbox = main.getByRole('checkbox', { name: re }).first();
    if ((await checkbox.count()) > 0) {
      const parentLabel = checkbox.locator('xpath=ancestor::label[1]');
      const hasVisibleParentLabel =
        (await parentLabel.count()) > 0 && (await parentLabel.isVisible().catch(() => false));
      const isCheckboxVisible = await checkbox.isVisible().catch(() => false);

      if (hasVisibleParentLabel || isCheckboxVisible) {
        const respPromise = startProjectsGetWait();
        if (hasVisibleParentLabel) {
          await parentLabel.click();
        } else {
          await checkbox.click({ force: true });
        }
        assertProjectsGetOk(await respPromise);
        await page.waitForTimeout(250);
        return true;
      }
    }

    const checkboxLabel = main.locator('label:has(input[type="checkbox"])').filter({ hasText: re }).first();
    if ((await checkboxLabel.count()) > 0 && (await checkboxLabel.isVisible().catch(() => false))) {
      const respPromise = startProjectsGetWait();
      await checkboxLabel.click();
      assertProjectsGetOk(await respPromise);
      await page.waitForTimeout(250);
      return true;
    }

    const btn = main
      .getByRole('button', { name: re })
      .or(main.locator('label').filter({ hasText: re }))
      .first();
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      const respPromise = startProjectsGetWait();
      await btn.click();
      assertProjectsGetOk(await respPromise);
      await page.waitForTimeout(250);
      return true;
    }
  }

  return false;
}

describe('R1–R3 Extended Routes: Route Aliases, /catalog R2 Filters, ProjectDetailsPage & /admin/components CRUD', () => {
  let browser: Browser;

  before(async () => {
    await ensureWebReachable();
    browser = await launchBrowser();
  });

  after(async () => {
    await browser?.close();
  });

  it('Route aliases /projects and /categories render CatalogPage with project cards, light theme & Azerbaijani copy', async () => {
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      for (const aliasRoute of ['/projects', '/categories']) {
        clearDiagnostics(diagnostics);
        await navigateAndWaitReady(page, aliasRoute);

        const main = page.locator('main').first();
        const heading = main.getByRole('heading', { level: 1 }).first();
        await heading.waitFor({ state: 'visible' });

        const projectCards = main.locator('a[href^="/projects/"]');
        assert(
          (await projectCards.count()) >= 1,
          `Expected at least 1 project card on route alias "${aliasRoute}"`
        );

        await assertLightThemePalette(page, { routeLabel: aliasRoute });
        await assertAzerbaijaniUiCopy(page, aliasRoute);
        assertNoDiagnostics(diagnostics, `route alias ${aliasRoute}`);
      }
    });
  });

  it('/catalog supports R2 Domain, Difficulty and Price filters and resets cleanly', async () => {
    const targetProject = await discoverExtendedProjectFixture();
    assert(
      targetProject.domains && targetProject.domains.length > 0,
      `Expected domains[] on seeded project "${targetProject.slug}"`
    );
    assert(
      targetProject.difficulty,
      `Expected difficulty on seeded project "${targetProject.slug}"`
    );

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/catalog');
      const main = page.locator('main').first();

      const catalogText = await main.innerText();
      assert(
        /(Sahə|Sahələr)/i.test(catalogText) && /(Çətinlik)/i.test(catalogText),
        'Expected Domain ("Sahə") and Difficulty ("Çətinlik") filter sections on /catalog'
      );

      // Narrow search first so targetProject is guaranteed on page 1
      const searchInput = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .first();
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(targetProject.title);
      await page.waitForTimeout(450);

      assert(
        await main.getByText(new RegExp(escapeRegex(targetProject.title), 'i')).first().isVisible(),
        `Expected "${targetProject.title}" to appear in /catalog search results`
      );

      // Apply contradictory difficulty filter -> project must disappear
      const isBeginner = targetProject.difficulty === 'BEGINNER';
      const diffApplied = await clickFilterControl(
        page,
        isBeginner ? [/^ADVANCED$/i, /İrəli|Çətin/i] : [/^BEGINNER$/i, /Başlanğıc/i],
        isBeginner ? [/İrəli|Çətin/i] : [/Başlanğıc/i]
      );
      assert(diffApplied, 'Expected interactive Difficulty filter control on /catalog');

      const visibleUnderContradictoryDiff = await main
        .getByText(new RegExp(escapeRegex(targetProject.title), 'i'))
        .first()
        .isVisible()
        .catch(() => false);
      assert.equal(
        visibleUnderContradictoryDiff,
        false,
        `Expected contradictory difficulty filter to exclude "${targetProject.title}" on /catalog`
      );

      // Reset filters -> verify restoration
      const resetBtn = main
        .getByRole('button', { name: /Filtrləri sıfırla|Filtrləri təmizlə|Sıfırla/i })
        .first();
      assert(
        (await resetBtn.count()) > 0 && (await resetBtn.isVisible()),
        'Expected filter reset button on /catalog'
      );
      await resetBtn.click();
      await page.waitForTimeout(400);

      // Re-apply matching Domain + matching Difficulty + search
      await searchInput.fill(targetProject.title);
      await page.waitForTimeout(450);

      const targetDomain = targetProject.domains![0];
      const domainRegex = new RegExp(escapeRegex(targetDomain), 'i');
      const domainApplied = await clickFilterControl(page, [domainRegex], [domainRegex]);
      assert(domainApplied, `Expected interactive Domain filter control for "${targetDomain}" on /catalog`);

      const diffLabelRegex = DIFFICULTY_LABELS[targetProject.difficulty!] || new RegExp(targetProject.difficulty!, 'i');
      const matchingDiffApplied = await clickFilterControl(
        page,
        [new RegExp(`^${escapeRegex(targetProject.difficulty!)}$`, 'i'), diffLabelRegex],
        [diffLabelRegex]
      );
      assert(matchingDiffApplied, `Expected interactive Difficulty filter control matching "${targetProject.difficulty}"`);

      assert(
        await main.getByText(new RegExp(escapeRegex(targetProject.title), 'i')).first().isVisible(),
        `Expected "${targetProject.title}" to match its own domain ("${targetDomain}") and difficulty ("${targetProject.difficulty}")`
      );

      // Reset before testing Free-only toggle across the catalog
      await resetBtn.click();
      await page.waitForTimeout(400);

      // Exercise Free-only price toggle and verify effect on URL/API and displayed cards
      let freeOnlyApiSeen = false;
      const freeOnlyStatuses: number[] = [];
      const onFreeOnlyRequest = (req: Request) => {
        if (req.url().includes('/projects') && req.url().includes('freeOnly=true')) {
          freeOnlyApiSeen = true;
        }
      };
      const onFreeOnlyResponse = (res: Response) => {
        if (res.url().includes('/projects') && res.request().method() === 'GET') {
          freeOnlyStatuses.push(res.status());
        }
      };
      page.on('request', onFreeOnlyRequest);
      page.on('response', onFreeOnlyResponse);
      let freeOnlyApplied = false;
      try {
        freeOnlyApplied = await clickFilterControl(
          page,
          [/^free$/i, /Yalnız pulsuz/i],
          [/Yalnız pulsuz layihələr/i, /^Pulsuz$/i]
        );
      } finally {
        page.off('request', onFreeOnlyRequest);
        page.off('response', onFreeOnlyResponse);
      }
      assert(freeOnlyApplied, 'Expected "Yalnız pulsuz layihələr" / price filter control on /catalog');

      await page.waitForTimeout(300);
      for (const status of freeOnlyStatuses) {
        assert(
          (status >= 200 && status < 300) || status === 304,
          `Expected 2xx/304 response from GET /projects during freeOnly toggle, got ${status}`
        );
      }
      assert(
        page.url().includes('freeOnly=true') || freeOnlyApiSeen,
        `Expected freeOnly=true to take effect in URL or /projects API request, current URL: ${page.url()}`
      );

      const freeProjectLinks = main.locator('a[href^="/projects/"]');
      const freeCardCount = await freeProjectLinks.count();
      if (freeCardCount > 0) {
        const cards = main.locator('article:has(a[href^="/projects/"])');
        const articleCount = await cards.count();
        if (articleCount > 0) {
          for (let i = 0; i < articleCount; i++) {
            const cardText = await cards.nth(i).innerText();
            assert(
              !/\b(?:[1-9]\d*(?:[.,]\d+)?|0[.,]\d*[1-9]\d*)\s*AZN\b/i.test(cardText),
              `Expected paid project prices (AZN) to be excluded when freeOnly=true, got card: "${cardText}"`
            );
            assert(
              /Pulsuz|0(?:[.,]00)?\s*AZN/i.test(cardText),
              `Expected only free ("Pulsuz") projects to remain when freeOnly=true, got card: "${cardText}"`
            );
          }
        } else {
          const filteredCatalogText = await main.innerText();
          assert(
            /Pulsuz/i.test(filteredCatalogText),
            'Expected free ("Pulsuz") projects when freeOnly=true'
          );
        }
      } else {
        const emptyText = await main.innerText();
        assert(
          /(tapılmadı|nəticə yoxdur|mövcud deyil)/i.test(emptyText),
          `Expected Azerbaijani empty state when freeOnly=true yields 0 projects, got: "${emptyText.slice(0, 200)}"`
        );
      }

      // Reset cleanly after freeOnly verification
      await resetBtn.click();
      await page.waitForTimeout(400);
      assert(
        !page.url().includes('freeOnly=true'),
        `Expected filter reset to clear freeOnly=true from URL, got: ${page.url()}`
      );
      assert(
        (await main.locator('a[href^="/projects/"]').count()) >= 1,
        'Expected project cards to be restored after resetting freeOnly filter'
      );

      await assertAzerbaijaniUiCopy(page, '/catalog');
      assertNoDiagnostics(diagnostics, '/catalog R2 domain/difficulty/price filters');
    });
  });

  it('ProjectDetailsPage renders BOM, domain/difficulty metadata, copyable code/guide & zoomable schematic/image', async () => {
    const targetProject = await discoverExtendedProjectFixture();
    assert(
      Boolean(targetProject.installationGuide && targetProject.installationGuide.trim().length > 0),
      `Expected rich seeded project "${targetProject.slug}" to have installationGuide for copy verification`
    );
    const hasProjectImages =
      Boolean(targetProject.thumbnailUrl) ||
      (Array.isArray(targetProject.images) && targetProject.images.length > 0);
    assert(
      hasProjectImages,
      `Expected rich seeded project "${targetProject.slug}" to have thumbnailUrl or images[] for zoom verification`
    );

    await withPage(
      browser,
      { viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] },
      async (page, diagnostics) => {
        await navigateAndWaitReady(page, `/projects/${targetProject.slug}`);
        const main = page.locator('main').first();

        const h1 = main.getByRole('heading', { level: 1 }).first();
        await h1.waitFor({ state: 'visible' });
        const h1Text = await h1.innerText();
        assert(
          h1Text.toLowerCase().includes(targetProject.title.toLowerCase()),
          `Expected project title "${targetProject.title}" in H1, got "${h1Text}"`
        );

        // Domain & difficulty metadata
        const pageText = await main.innerText();
        if (targetProject.domains && targetProject.domains.length > 0) {
          assert(
            pageText.toLowerCase().includes(targetProject.domains[0].toLowerCase()),
            `Expected domain "${targetProject.domains[0]}" on ProjectDetailsPage`
          );
        }
        if (targetProject.difficulty) {
          const diffRegex =
            DIFFICULTY_LABELS[targetProject.difficulty] || new RegExp(targetProject.difficulty, 'i');
          assert(
            diffRegex.test(pageText),
            `Expected Azerbaijani difficulty badge (${diffRegex}) on ProjectDetailsPage`
          );
        }

        // BOM tab
        const bomTab = main.getByRole('button', { name: /BOM|Komponentlər/i }).first();
        assert(await bomTab.isVisible(), 'Expected BOM / Komponentlər tab on ProjectDetailsPage');
        await bomTab.click();
        await page.waitForTimeout(200);

        const firstBomName = targetProject.components![0].name;
        assert(
          await main.getByText(new RegExp(escapeRegex(firstBomName), 'i')).first().isVisible(),
          `Expected BOM component "${firstBomName}" inside BOM tab`
        );

        // Guide tab & copyable block
        const guideTab = main.getByRole('button', { name: /Bələdçi/i }).first();
        assert(await guideTab.isVisible(), 'Expected Bələdçi tab on ProjectDetailsPage');
        await guideTab.click();
        await page.waitForTimeout(200);

        const copyBtn = main.getByRole('button', { name: /Kopyala/i }).first();
        if ((await copyBtn.count()) === 0 || !(await copyBtn.isVisible())) {
          assert.fail(
            `Expected visible "Kopyala" button in Bələdçi tab on ProjectDetailsPage for rich project "${targetProject.slug}"`
          );
        }
        await copyBtn.click();
        await main.getByText(/Kopyalandı/i).first().waitFor({ state: 'visible' });
        const copiedText = await page.evaluate(() => navigator.clipboard.readText());
        assert(copiedText.trim().length > 0, 'Expected non-empty clipboard text after clicking Kopyala');

        // Zoomable image/schematic modal (required on rich fixture with images/thumbnailUrl)
        const findZoomTrigger = async () => {
          const zb = main
            .getByRole('button', { name: /Böyüt|Zoom|Sxemi böyüt/i })
            .or(main.locator('button:has(img)').filter({ hasNot: page.locator('[aria-hidden="true"]') }))
            .first();
          if ((await zb.count()) > 0 && (await zb.isVisible())) {
            return zb;
          }
          const ci = main.locator('img[alt]').first();
          if ((await ci.count()) > 0 && (await ci.isVisible())) {
            return ci;
          }
          return null;
        };

        let zoomTrigger = await findZoomTrigger();
        if (!zoomTrigger) {
          const overviewTab = main.getByRole('button', { name: /Ümumi baxış|İcmal/i }).first();
          if ((await overviewTab.count()) > 0 && (await overviewTab.isVisible())) {
            await overviewTab.click();
            await page.waitForTimeout(200);
            zoomTrigger = await findZoomTrigger();
          }
        }

        if (!zoomTrigger) {
          assert.fail(
            `Expected visible lightbox zoom trigger or clickable image on ProjectDetailsPage for rich project "${targetProject.slug}"`
          );
        }

        await zoomTrigger.click();
        const dialog = page.getByRole('dialog').first();
        await dialog.waitFor({ state: 'visible' });
        const closeBtn = dialog.getByRole('button', { name: /Bağla|Close|×/i }).first();
        if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible())) {
          await closeBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await dialog.waitFor({ state: 'hidden' });

        await assertAzerbaijaniUiCopy(page, `/projects/${targetProject.slug}`);
        assertNoDiagnostics(diagnostics, `ProjectDetailsPage /projects/${targetProject.slug}`);
      }
    );
  });

  it('/admin/components renders Azerbaijani CRUD UI (list, create modal, edit pre-fill, delete with cleanup)', async () => {
    const adminSession = await getCachedAdminSession();
    const created = await createTestComponent(adminSession.client, {
      name: `E2E Admin UI Test ${Date.now()}`,
    });

    try {
      await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
        await loginViaUi(page, config.adminEmail, config.adminPassword);
        clearDiagnostics(diagnostics);

        await navigateAndWaitReady(page, '/admin/components');
        assert(!page.url().includes('/login'), 'Admin must remain authenticated on /admin/components');

        const main = page.locator('main').first();
        await assertLightThemePalette(page, { routeLabel: '/admin/components' });
        await assertAzerbaijaniUiCopy(page, '/admin/components');

        // 1. Verify create control opens form/modal cleanly
        const createBtn = main
          .getByRole('button', { name: /Yeni Komponent|Komponent Əlavə Et|Əlavə et/i })
          .first();
        assert(
          (await createBtn.count()) > 0 && (await createBtn.isVisible()),
          'Expected "Yeni Komponent" / "Əlavə et" button on /admin/components'
        );
        await createBtn.click();
        await page.waitForTimeout(250);

        const formContainer = page.getByRole('dialog').or(main.locator('form')).first();
        await formContainer.waitFor({ state: 'visible' });
        assert(
          (await formContainer.locator('input, textarea, select').count()) >= 3,
          'Expected component create form inputs inside modal/panel on /admin/components'
        );
        await assertAzerbaijaniUiCopy(page, '/admin/components (create modal)');

        const cancelCreateBtn = formContainer
          .getByRole('button', { name: /Ləğv et|Bağla|Geri/i })
          .first();
        if ((await cancelCreateBtn.count()) > 0 && (await cancelCreateBtn.isVisible())) {
          await cancelCreateBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(200);

        // 2. Locate temporary test component row (using search input if present)
        const searchInput = main
          .locator('input[type="search"], input[type="text"], input:not([type])')
          .first();
        if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
          await searchInput.fill(created.payload.name);
          await page.waitForTimeout(350);
        }

        const targetRow = main
          .locator('tr, article, li, div')
          .filter({ hasText: new RegExp(escapeRegex(created.payload.name), 'i') })
          .filter({ has: page.getByRole('button', { name: /Redaktə|Düzəliş|Sil/i }) })
          .last();
        await targetRow.waitFor({ state: 'visible' });

        // 3. Edit button opens pre-filled edit form
        const editBtn = targetRow.getByRole('button', { name: /Redaktə|Düzəliş/i }).first();
        assert((await editBtn.count()) > 0 && (await editBtn.isVisible()), 'Expected Edit button on component row');
        await editBtn.click();
        await page.waitForTimeout(250);

        const editForm = page.getByRole('dialog').or(main.locator('form')).first();
        await editForm.waitFor({ state: 'visible' });
        const inputValues: string[] = await editForm
          .locator('input')
          .evaluateAll((els: Element[]) => els.map((el) => (el as HTMLInputElement).value));
        assert(
          inputValues.some((v: string) => v.includes(created.payload.name) || v.includes(created.slug)),
          `Expected edit form to be pre-filled with "${created.payload.name}" or "${created.slug}", got: ${JSON.stringify(inputValues)}`
        );

        const cancelEditBtn = editForm
          .getByRole('button', { name: /Ləğv et|Bağla|Geri/i })
          .first();
        if ((await cancelEditBtn.count()) > 0 && (await cancelEditBtn.isVisible())) {
          await cancelEditBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(200);

        // 4. Delete button removes temporary test component cleanly
        page.once('dialog', (d: { accept: () => Promise<void> }) => d.accept().catch(() => {}));
        const deleteRespPromise = page
          .waitForResponse(
            (r: Response) => r.url().includes(`/components/`) && r.request().method() === 'DELETE',
            { timeout: 6000 }
          )
          .catch(() => null);

        const deleteBtn = targetRow.getByRole('button', { name: /Sil/i }).first();
        assert((await deleteBtn.count()) > 0 && (await deleteBtn.isVisible()), 'Expected Delete button on component row');
        await deleteBtn.click();

        // Handle optional confirmation modal if app uses React dialog instead of window.confirm
        const confirmDialog = page.getByRole('dialog').first();
        if (await confirmDialog.isVisible().catch(() => false)) {
          const confirmBtn = confirmDialog
            .getByRole('button', { name: /Təsdiqlə|Sil|Bəli/i })
            .first();
          if ((await confirmBtn.count()) > 0) {
            await confirmBtn.click();
          }
        }

        const deleteResp = await deleteRespPromise;
        assert(deleteResp, 'Expected DELETE /components/:id HTTP response after clicking delete');
        assert(
          deleteResp.ok(),
          `Expected 2xx response from DELETE /components/:id, got ${deleteResp.status()}`
        );
        await page.waitForTimeout(400);

        const stillVisible = await main
          .getByText(new RegExp(escapeRegex(created.payload.name), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        assert.equal(
          stillVisible,
          false,
          `Expected deleted component "${created.payload.name}" to disappear from /admin/components`
        );

        assertNoDiagnostics(diagnostics, '/admin/components CRUD UI');
      });
    } finally {
      await deleteTestComponent(adminSession.client, created.id);
    }
  });
});
