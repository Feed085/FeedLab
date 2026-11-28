import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser } from 'playwright';
import { ApiClient } from '../utils/api-client.ts';
import { extractList } from '../utils/r2-r3-helper.ts';
import {
  launchBrowser,
  withPage,
  ensureWebReachable,
  navigateAndWaitReady,
  assertAzerbaijaniUiCopy,
  assertNoDiagnostics,
} from './browser-helper.ts';

interface SeededLibraryItem {
  slug: string;
  name: string;
  category: string;
  categoryLabel?: string;
  shortDescription?: string;
}

interface SeededLibraryDetail extends SeededLibraryItem {
  definition?: string;
  workingPrinciple?: string;
  applications?: string[];
  specs?: Array<{ label: string; value: string }>;
  pinout?: Array<{ pin: string; name: string; function: string }>;
  pinoutImageUrl?: string;
  wiringGuide?: string;
  wiringImageUrl?: string;
  codeExample?: { language: string; title?: string; code: string };
  pros?: string[];
  limitations?: string[];
  alternatives?: Array<{ slug?: string; name: string; reason: string }>;
  totalProjectsCount?: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function discoverLibraryFixture(): Promise<{
  items: SeededLibraryItem[];
  categories: Array<{ key: string; label: string; count?: number }>;
  richDetail: SeededLibraryDetail;
}> {
  const api = new ApiClient();
  const listRes = await api.get('/components?limit=24');
  assert(
    listRes.ok,
    `Expected GET /components?limit=24 to succeed, got HTTP ${listRes.status}: ${listRes.raw}`
  );

  const items: SeededLibraryItem[] = extractList(listRes.data);
  assert(items.length >= 2, `Expected at least 2 seeded library components, found ${items.length}`);

  const categories: Array<{ key: string; label: string; count?: number }> =
    listRes.data?.categories || [];

  let richDetail: SeededLibraryDetail | null = null;
  let bestScore = -1;
  for (const item of items) {
    const detailRes = await api.get(`/components/${item.slug}`);
    if (!detailRes.ok || !detailRes.data) continue;
    const detail = detailRes.data as SeededLibraryDetail;
    const hasCode = Boolean(detail.codeExample?.code && detail.codeExample.code.trim().length > 0);
    if (!hasCode) continue;

    const hasProjects = (detail.totalProjectsCount ?? 0) > 0;
    const hasDiagramUrl = Boolean(detail.pinoutImageUrl || detail.wiringImageUrl);
    const score = (hasDiagramUrl ? 4 : 0) + (hasProjects ? 2 : 0) + 1;

    if (score > bestScore) {
      bestScore = score;
      richDetail = detail;
    }
    if (hasCode && hasProjects && hasDiagramUrl) {
      break;
    }
  }

  assert(
    richDetail && richDetail.codeExample?.code,
    'Expected at least 1 seeded component detail with a codeExample and educational sections'
  );

  return { items, categories, richDetail };
}

describe('R3: "Elektronika Ensiklopediyası / Kitabxanası" Browser E2E Flow', () => {
  let browser: Browser;

  before(async () => {
    await ensureWebReachable();
    browser = await launchBrowser();
  });

  after(async () => {
    await browser?.close();
  });

  it('Library catalog supports category filtering, search filtering, and graceful empty search state', async () => {
    const { items, categories } = await discoverLibraryFixture();

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/library');
      const main = page.locator('main').first();

      const componentLinks = main.locator('a[href^="/library/"]');
      const initialCount = await componentLinks.count();
      assert(initialCount >= 2, `Expected seeded component cards on /library, found ${initialCount}`);

      const visibleHrefs: string[] = await componentLinks.evaluateAll((els: Element[]) =>
        els.map((e) => e.getAttribute('href') || '').filter(Boolean)
      );

      const targetItem =
        items.find((c) => visibleHrefs.includes(`/library/${c.slug}`)) || items[0];
      const sameCategoryItems = items.filter((s) => s.category === targetItem.category);
      const isSafeOtherComp = (c: SeededLibraryItem, checkShortDesc: boolean) =>
        c.category !== targetItem.category &&
        c.name !== targetItem.name &&
        !sameCategoryItems.some((s) => {
          const haystack = checkShortDesc
            ? `${s.name} ${s.shortDescription || ''}`.toLowerCase()
            : s.name.toLowerCase();
          return haystack.includes(c.name.toLowerCase());
        });

      const otherCategoryComp =
        items.find((c) => isSafeOtherComp(c, true) && visibleHrefs.includes(`/library/${c.slug}`)) ||
        items.find((c) => isSafeOtherComp(c, true)) ||
        items.find((c) => isSafeOtherComp(c, false) && visibleHrefs.includes(`/library/${c.slug}`)) ||
        items.find((c) => isSafeOtherComp(c, false));
      assert(
        otherCategoryComp,
        `Expected a seeded library component from a different category than "${targetItem.category}"`
      );
      const wasOtherVisibleInitially = visibleHrefs.includes(`/library/${otherCategoryComp.slug}`);

      // Category filter (require interactive category filter control)
      const targetCategoryLabel =
        targetItem.categoryLabel ||
        categories.find((c) => c.key === targetItem.category)?.label;
      assert(targetCategoryLabel, `Expected categoryLabel for seeded component "${targetItem.name}"`);

      const catBtn = main
        .getByRole('button', { name: new RegExp(escapeRegex(targetCategoryLabel), 'i') })
        .first();
      const catSelect = main
        .locator('select')
        .filter({ hasText: new RegExp(escapeRegex(targetCategoryLabel), 'i') })
        .first();

      const assertCategoryFilteredAndRestored = async (modeLabel: string) => {
        assert(
          (await componentLinks.count()) >= 1,
          `Expected at least 1 card after selecting category "${targetCategoryLabel}" (${modeLabel})`
        );
        const filteredText = await main.innerText();
        const targetVisible =
          (await main.locator(`a[href="/library/${targetItem.slug}"]`).count()) > 0 ||
          filteredText.toLowerCase().includes(targetItem.name.toLowerCase());
        assert(
          targetVisible,
          `Expected "${targetItem.name}" to remain visible when filtering by "${targetCategoryLabel}" (${modeLabel})`
        );

        const otherLinkCount = await main.locator(`a[href="/library/${otherCategoryComp.slug}"]`).count();
        assert.equal(
          otherLinkCount,
          0,
          `Expected category filter "${targetCategoryLabel}" to exclude "${otherCategoryComp.name}" (${otherCategoryComp.categoryLabel || otherCategoryComp.category}) link`
        );
        assert(
          !filteredText.toLowerCase().includes(otherCategoryComp.name.toLowerCase()),
          `Expected category filter "${targetCategoryLabel}" to exclude "${otherCategoryComp.name}" text (${modeLabel})`
        );
      };

      const assertRestoredAfterReset = async (modeLabel: string) => {
        const restoredCount = await componentLinks.count();
        assert(
          restoredCount >= initialCount,
          `Expected component count to restore to >= ${initialCount} after resetting category filter (${modeLabel}), got ${restoredCount}`
        );
        if (wasOtherVisibleInitially) {
          const restoredOtherCount = await main.locator(`a[href="/library/${otherCategoryComp.slug}"]`).count();
          assert(
            restoredOtherCount >= 1,
            `Expected "${otherCategoryComp.name}" to be restored after resetting category filter (${modeLabel})`
          );
        }
      };

      if ((await catBtn.count()) > 0 && (await catBtn.isVisible())) {
        await catBtn.click();
        await page.waitForTimeout(300);
        await assertCategoryFilteredAndRestored('button');
        const allBtn = main.getByRole('button', { name: /Hamısı|Bütün/i }).first();
        assert((await allBtn.count()) > 0 && (await allBtn.isVisible()), 'Expected "Hamısı" category reset button');
        await allBtn.click();
        await page.waitForTimeout(300);
        await assertRestoredAfterReset('button');
      } else if ((await catSelect.count()) > 0 && (await catSelect.isVisible())) {
        await catSelect.selectOption({ label: targetCategoryLabel });
        await page.waitForTimeout(300);
        await assertCategoryFilteredAndRestored('select');
        const firstOpt = await catSelect.locator('option').first().getAttribute('value');
        if (firstOpt !== null) {
          await catSelect.selectOption(firstOpt);
          await page.waitForTimeout(300);
          await assertRestoredAfterReset('select');
        }
      } else {
        assert.fail(`Expected visible category filter control for "${targetCategoryLabel}" on /library`);
      }

      // Search for real component
      const searchInput = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .first();
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(targetItem.name);
      await page.waitForTimeout(350);

      const matchingLink = main.locator(`a[href="/library/${targetItem.slug}"]`).first();
      assert(
        (await matchingLink.count()) > 0 || (await main.getByText(new RegExp(escapeRegex(targetItem.name), 'i')).count()) > 0,
        `Expected search for "${targetItem.name}" to show "${targetItem.slug}"`
      );

      // Search for nonexistent component
      await searchInput.fill('NONEXISTENT_COMP_99999');
      await page.waitForTimeout(350);
      const emptyText = await main.innerText();
      assert(
        /(tapılmadı|nəticə yoxdur|mövcud deyil)/i.test(emptyText),
        `Expected graceful Azerbaijani empty state for "NONEXISTENT_COMP_99999", got: "${emptyText.slice(0, 300)}"`
      );

      await assertAzerbaijaniUiCopy(page, '/library', { allowNotFound: true });
      assertNoDiagnostics(diagnostics, '/library catalog filtering');
    });
  });

  it('Component detail page renders all 8 required educational sections', async () => {
    const { richDetail } = await discoverLibraryFixture();

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, `/library/${richDetail.slug}`);
      const main = page.locator('main').first();

      const h1 = main.getByRole('heading', { level: 1 }).first();
      await h1.waitFor({ state: 'visible' });
      const h1Text = await h1.innerText();
      assert(
        h1Text.toLowerCase().includes(richDetail.name.toLowerCase()),
        `Expected component name "${richDetail.name}" in H1, got "${h1Text}"`
      );

      // 1. Definition
      assert(
        await main.getByText(/Nədir və nə işə yarayır/i).first().isVisible(),
        'Expected section 1: "Nədir və nə işə yarayır"'
      );
      // 2. Working principle
      assert(
        await main.getByText(/İş prinsipi/i).first().isVisible(),
        'Expected section 2: "İş prinsipi"'
      );
      // 3. Real applications
      assert(
        await main.getByText(/İstifadə sahələri|real tətbiqlər/i).first().isVisible(),
        'Expected section 3: "İstifadə sahələri və real tətbiqlər"'
      );
      // 4. Technical specifications
      assert(
        await main.getByText(/Texniki göstəricilər/i).first().isVisible(),
        'Expected section 4: "Texniki göstəricilər"'
      );
      // 5. Pinout & pin functions
      assert(
        await main.getByText(/Pinout|Pinlərin funksiyası/i).first().isVisible(),
        'Expected section 5: "Pinout / Pinlərin funksiyası"'
      );
      // 6. Wiring guide & code example
      assert(
        await main.getByText(/Qoşulma qaydası/i).first().isVisible(),
        'Expected section 6: "Qoşulma qaydası"'
      );
      const codeBlock = main.locator('pre, code').first();
      assert(await codeBlock.isVisible(), 'Expected visible <pre>/<code> example block');
      const codeText = (await codeBlock.innerText()).trim();
      assert(codeText.length > 0, 'Expected non-empty code example');

      // 7. Pros, limitations & alternatives
      assert(
        await main.getByText(/Üstünlükləri/i).first().isVisible(),
        'Expected section 7a: "Üstünlükləri"'
      );
      assert(
        await main.getByText(/Məhdudiyyətləri/i).first().isVisible(),
        'Expected section 7b: "Məhdudiyyətləri"'
      );
      assert(
        await main.getByText(/Alternativləri/i).first().isVisible(),
        'Expected section 7c: "Alternativləri"'
      );

      // 8. Featured projects + "Bütün layihələri gör"
      assert(
        await main.getByText(/Seçilmiş layihələr|Bu komponentlə hazırlanan layihələr/i).first().isVisible(),
        'Expected section 8: Featured projects section'
      );
      const seeAllBtn = main
        .getByRole('button', { name: /Bütün layihələri gör/i })
        .or(main.getByRole('link', { name: /Bütün layihələri gör/i }))
        .first();
      assert(await seeAllBtn.isVisible(), 'Expected "Bütün layihələri gör" button/link');

      await assertAzerbaijaniUiCopy(page, `/library/${richDetail.slug}`);
      assertNoDiagnostics(diagnostics, `/library/${richDetail.slug} 8 sections`);
    });
  });

  it('Supports clipboard copy feedback, zoomable lightbox modal, and "Bütün layihələri gör" action', async () => {
    const { richDetail } = await discoverLibraryFixture();

    await withPage(
      browser,
      { viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] },
      async (page, diagnostics) => {
        await navigateAndWaitReady(page, `/library/${richDetail.slug}`);
        const main = page.locator('main').first();

        // 1. Copy code button -> feedback + clipboard content
        const copyBtn = main.getByRole('button', { name: /Kopyala/i }).first();
        assert(await copyBtn.isVisible(), 'Expected "Kopyala" button on code example block');

        const normalizeCode = (raw: string): string =>
          raw
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map((line) => line.trimEnd())
            .join('\n')
            .trim();

        const expectedCodeRaw = await main.locator('pre').first().evaluate((pre: HTMLElement) => {
          const codeEl = pre.querySelector('code') || pre;
          const rowDivs = Array.from(codeEl.children).filter(
            (el): el is HTMLElement => el.tagName === 'DIV'
          );

          if (
            rowDivs.length > 0 &&
            rowDivs.every((row, idx) => {
              const firstChild = row.children[0];
              if (!firstChild || firstChild.tagName !== 'SPAN') return false;
              const gutter = (firstChild.textContent || '').trim();
              return /^\d+$/.test(gutter) && Number(gutter) === idx + 1;
            })
          ) {
            return rowDivs
              .map((row) =>
                Array.from(row.children)
                  .slice(1)
                  .map((el) => el.textContent || '')
                  .join('')
              )
              .join('\n');
          }

          return pre.textContent || pre.innerText || '';
        });

        const expectedCode = normalizeCode(expectedCodeRaw);
        assert(expectedCode.length > 0, 'Expected non-empty displayed code example');

        await copyBtn.click();
        await main.getByText(/Kopyalandı/i).first().waitFor({ state: 'visible' });

        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        assert(clipboardText.trim().length > 0, 'Expected non-empty clipboard text after copying code');
        assert.equal(
          normalizeCode(clipboardText),
          expectedCode,
          'Expected clipboard contents to match displayed code example'
        );

        // 2. Zoomable pinout/wiring lightbox modal
        const zoomTrigger = main
          .getByRole('button', { name: /Böyüt|Zoom|Sxemi böyüt|Pinout/i })
          .or(main.locator('button:has(img), button:has(svg)').filter({ hasText: /Böyüt/i }))
          .first();

        const clickableDiagramImg = main.locator('img[alt*="pinout" i], img[alt*="sxem" i], img[alt*="qoşulma" i]').first();

        if ((await zoomTrigger.count()) > 0 && (await zoomTrigger.isVisible())) {
          await zoomTrigger.click();
        } else if ((await clickableDiagramImg.count()) > 0 && (await clickableDiagramImg.isVisible())) {
          await clickableDiagramImg.click();
        } else {
          assert.fail('Expected a zoomable pinout/wiring image or zoom trigger button on component detail page');
        }

        const dialog = page.getByRole('dialog').first();
        await dialog.waitFor({ state: 'visible' });

        const closeBtn = dialog.getByRole('button', { name: /Bağla|Close|×/i }).first();
        if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible())) {
          await closeBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await dialog.waitFor({ state: 'hidden' });

        // 3. "Bütün layihələri gör" action (modal/drawer OR navigation to /catalog?component=...)
        const seeAllAction = main
          .getByRole('button', { name: /Bütün layihələri gör/i })
          .or(main.getByRole('link', { name: /Bütün layihələri gör/i }))
          .first();
        await seeAllAction.click();
        await page.waitForTimeout(400);

        const openedModal = await page.getByRole('dialog').first().isVisible().catch(() => false);
        const navigatedToCatalog = page.url().includes('/catalog');
        assert(
          openedModal || navigatedToCatalog,
          `Expected "Bütün layihələri gör" to open projects modal or navigate to /catalog, current URL: ${page.url()}`
        );

        if (openedModal) {
          const modal = page.getByRole('dialog').first();
          const modalProjectLinks = modal.locator('a[href^="/projects/"]');
          assert(
            (await modalProjectLinks.count()) >= 1,
            'Expected at least 1 project link inside "Bütün layihələri gör" modal'
          );
          await assertAzerbaijaniUiCopy(page, `/library/${richDetail.slug} (all-projects modal)`);
          const firstHref = await modalProjectLinks.first().getAttribute('href');
          await modalProjectLinks.first().click();
          await page.waitForURL((u: URL) => u.pathname.includes('/projects/'));
          if (firstHref) {
            assert(
              page.url().includes(firstHref),
              `Expected navigation to "${firstHref}", got "${page.url()}"`
            );
          }
        } else {
          const catalogProjectLinks = page.locator('main a[href^="/projects/"]');
          assert(
            (await catalogProjectLinks.count()) >= 1,
            'Expected at least 1 project link after navigating to /catalog via "Bütün layihələri gör"'
          );
          await assertAzerbaijaniUiCopy(page, '/catalog?component=...');
          await catalogProjectLinks.first().click();
          await page.waitForURL((u: URL) => u.pathname.includes('/projects/'));
        }

        assertNoDiagnostics(diagnostics, `/library/${richDetail.slug} interactive actions`);
      }
    );
  });

  it('Handles invalid component slug gracefully with Azerbaijani 404/not-found UI and zero 5xx errors', async () => {
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/library/non-existent-component-9999');

      await page.locator('header').first().waitFor({ state: 'visible' });
      await page.locator('footer').first().waitFor({ state: 'visible' });

      const bodyText = await page.locator('main').first().innerText();
      assert(
        /(tapılmadı|mövcud deyil)/i.test(bodyText),
        `Expected Azerbaijani not-found message on invalid component slug, got: "${bodyText.slice(0, 300)}"`
      );

      assert.equal(diagnostics.pageErrors.length, 0, `Unexpected pageErrors: ${JSON.stringify(diagnostics.pageErrors)}`);
      assert.equal(diagnostics.serverErrors.length, 0, `Unexpected 5xx errors: ${JSON.stringify(diagnostics.serverErrors)}`);
    });
  });
});
