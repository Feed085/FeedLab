import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Browser, Page } from 'playwright';
import { config } from '../config.ts';
import { ApiClient } from '../utils/api-client.ts';
import { createBuyerSession } from '../utils/user-session.ts';
import { extractList } from '../utils/r2-r3-helper.ts';
import {
  launchBrowser,
  withPage,
  ensureWebReachable,
  navigateAndWaitReady,
  assertLightThemePalette,
  assertNoHorizontalOverflow,
  scrollPageToRevealAll,
  assertAzerbaijaniUiCopy,
  assertNoDiagnostics,
  clearDiagnostics,
  loginViaUi,
  saveArtifactScreenshot,
} from './browser-helper.ts';

async function discoverSeededSlugs(): Promise<{ projectSlug: string; componentSlug: string }> {
  const api = new ApiClient();

  const projRes = await api.get('/projects?limit=1');
  assert(
    projRes.ok,
    `Expected GET /projects?limit=1 to succeed for route discovery, got HTTP ${projRes.status}: ${projRes.raw}`
  );
  const projItems = extractList(projRes.data);
  assert(projItems.length > 0 && projItems[0]?.slug, 'Expected at least 1 seeded approved project slug');

  const compRes = await api.get('/components?limit=1');
  assert(
    compRes.ok,
    `Expected GET /components?limit=1 to succeed for library route discovery, got HTTP ${compRes.status}: ${compRes.raw}`
  );
  const compItems = extractList(compRes.data);
  assert(compItems.length > 0 && compItems[0]?.slug, 'Expected at least 1 seeded component slug');

  return {
    projectSlug: String(projItems[0].slug),
    componentSlug: String(compItems[0].slug),
  };
}

async function assertCommonPageChrome(page: Page, route: string): Promise<void> {
  const header = page.locator('header').first();
  const footer = page.locator('footer').first();

  await header.waitFor({ state: 'visible' });
  await footer.waitFor({ state: 'visible' });

  const brandText = await header.innerText();
  assert(/Feed\s*Lab/i.test(brandText), `Expected "Feed Lab" brand in header on route "${route}"`);

  await assertLightThemePalette(page, {
    checkHomePrimaryCta: route === '/',
    routeLabel: route,
  });
  await assertAzerbaijaniUiCopy(page, route);
}

describe('R1: Visual Alignment, Unified Site Layout & 100% Azerbaijani Copy', () => {
  let browser: Browser;

  before(async () => {
    await ensureWebReachable();
    browser = await launchBrowser();
  });

  after(async () => {
    await browser?.close();
  });

  it('HomePage matches reference structure (header, hero, ESP32 + floating SVG/BOM cards, 8 unique categories, featured projects, footer) and search navigates to /catalog', async () => {
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/');
      await scrollPageToRevealAll(page, { returnToTop: true });

      const header = page.locator('header').first();
      await header.waitFor({ state: 'visible' });
      const brandLink = header.getByRole('link', { name: /Feed\s*Lab/i }).first();
      assert((await brandLink.count()) > 0, 'Expected "Feed Lab" link in header');

      for (const navLabel of [
        'Kataloq',
        'Pulsuz Layihələr',
        'Komponentlərimlə Tap',
        'Kitabxana',
        'Müəlliflər',
      ]) {
        const navItem = header.getByRole('link', { name: new RegExp(navLabel, 'i') }).first();
        assert((await navItem.count()) > 0, `Expected header navigation link "${navLabel}"`);
        assert(await navItem.isVisible(), `Expected header navigation link "${navLabel}" to be visible`);
      }

      for (const guestAction of ['Daxil ol', 'Qeydiyyat']) {
        const actionEl = header
          .getByRole('link', { name: new RegExp(guestAction, 'i') })
          .or(header.getByRole('button', { name: new RegExp(guestAction, 'i') }))
          .first();
        assert((await actionEl.count()) > 0, `Expected guest action "${guestAction}" in header`);
        assert(await actionEl.isVisible(), `Expected guest action "${guestAction}" to be visible`);
      }

      const main = page.locator('main').first();
      const h1 = main.getByRole('heading', { level: 1 }).first();
      await h1.waitFor({ state: 'visible' });
      const h1Text = (await h1.innerText()).trim();
      assert(
        /Öz Elektronika Cihazını Özün Yığ və Öyrən/i.test(h1Text),
        `Expected reference H1 text, got: "${h1Text}"`
      );

      const subtitle = main.getByText(/Sxemini,\s*kodunu və materiallarını əldə et,\s*sıfırdan hazırla/i).first();
      assert(await subtitle.isVisible(), 'Expected Hero subtitle matching reference text');

      const searchInput = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .filter({ hasNot: page.locator('[type="hidden"]') })
        .first();
      assert(await searchInput.isVisible(), 'Expected visible Hero search input');

      const primaryCta = main
        .getByRole('link', { name: /Layihələri Kəşf Et/i })
        .or(main.getByRole('button', { name: /Layihələri Kəşf Et/i }))
        .first();
      const secondaryCta = main
        .getByRole('link', { name: /Komponentlərimlə Tap/i })
        .or(main.getByRole('button', { name: /Komponentlərimlə Tap/i }))
        .first();
      assert(await primaryCta.isVisible(), 'Expected "Layihələri Kəşf Et" CTA');
      assert(await secondaryCta.isVisible(), 'Expected "Komponentlərimlə Tap" CTA');

      // Hero ESP32 image + floating mini SVG schematic & BOM cards
      const heroSection = main.locator('section').first();
      const heroImages = await heroSection.locator('img').evaluateAll((imgs: Element[]) =>
        imgs.map((img: Element) => ({
          src: (img as HTMLImageElement).getAttribute('src') || '',
          complete: (img as HTMLImageElement).complete,
          naturalWidth: (img as HTMLImageElement).naturalWidth,
        }))
      );
      const loadedHeroImg = heroImages.find(
        (img: { src: string; complete: boolean; naturalWidth: number }) =>
          img.complete && img.naturalWidth > 0 && (/hero-esp32/i.test(img.src) || img.naturalWidth >= 100)
      );
      assert(
        loadedHeroImg,
        `Expected loaded Hero ESP32 image inside hero section, found: ${JSON.stringify(heroImages)}`
      );

      const heroSvgCount = await heroSection.locator('svg').evaluateAll(
        (svgs: Element[]) =>
          svgs.filter((svg: Element) => {
            const rect = svg.getBoundingClientRect();
            return rect.width >= 32 && rect.height >= 32;
          }).length
      );
      assert(
        heroSvgCount >= 1,
        'Expected floating mini SVG schematic graphic inside Hero section (width >= 32 && height >= 32)'
      );

      const bomCardText = await heroSection.getByText(/\bBOM\b/).first().isVisible().catch(() => false);
      assert(bomCardText, 'Expected floating mini "BOM" card inside Hero section');

      // 8 unique Azerbaijani categories linking to /catalog?category=...
      const categoryLinks = main.locator('a[href*="/catalog?category="]');
      const catCount = await categoryLinks.count();
      assert.equal(catCount, 8, `Expected exactly 8 category cards linking to /catalog?category=..., found ${catCount}`);

      const rawCategoryLabels = await categoryLinks.allInnerTexts();
      const normalizedLabels = rawCategoryLabels.map((t: string) => t.replace(/\s+/g, ' ').trim());
      assert.equal(
        new Set(normalizedLabels).size,
        8,
        `Expected 8 unique Azerbaijani category labels, found duplicates: ${JSON.stringify(normalizedLabels)}`
      );

      // Featured projects ("Seçilmiş Layihələr")
      const featuredHeading = main.getByRole('heading', { name: /Seçilmiş Layihələr/i }).first();
      assert(await featuredHeading.isVisible(), 'Expected "Seçilmiş Layihələr" heading');

      const projectLinks = main.locator('a[href^="/projects/"]');
      const projectCount = await projectLinks.count();
      assert(projectCount >= 3, `Expected at least 3 featured project cards, found ${projectCount}`);

      for (let i = 0; i < 3; i++) {
        const card = projectLinks.nth(i);
        const cardText = (await card.innerText()).trim();
        assert(cardText.length > 0, `Expected non-empty text in featured project card #${i + 1}`);
        assert(
          /(Pulsuz|AZN|₼)/i.test(cardText),
          `Expected price ("Pulsuz" or AZN) in featured project card #${i + 1}, got "${cardText}"`
        );
        const imgState = await card.locator('img').first().evaluate((el: Element) => {
          const img = el as HTMLImageElement;
          return { complete: img.complete, naturalWidth: img.naturalWidth, src: img.src };
        });
        assert(
          imgState.complete && imgState.naturalWidth > 0,
          `Expected loaded image on featured project card #${i + 1}, got ${JSON.stringify(imgState)}`
        );
      }

      // Footer
      const footer = page.locator('footer').first();
      await footer.waitFor({ state: 'visible' });
      const footerText = await footer.innerText();
      for (const expectedFooterToken of [
        'Feed Lab',
        'FAYDALI KEÇİDLƏR',
        'HÜQUQİ MƏLUMATLAR',
        '© 2026 Feed Lab',
        'AZN',
        'Azərbaycan',
      ]) {
        assert(
          footerText.includes(expectedFooterToken),
          `Expected "${expectedFooterToken}" in footer, got: "${footerText}"`
        );
      }

      for (const legalHref of ['/terms', '/privacy', '/license', '/faq']) {
        const legalLink = footer.locator(`a[href="${legalHref}"]`).first();
        assert((await legalLink.count()) > 0, `Expected legal/FAQ footer link "${legalHref}"`);
      }

      await assertCommonPageChrome(page, '/');

      // Hero Search Navigation
      await searchInput.fill('ESP32');
      await searchInput.press('Enter');
      await page.waitForURL((url: URL) => url.pathname.includes('/catalog') && /ESP32/i.test(url.search));
      await page.waitForLoadState('networkidle').catch(() => {});

      assertNoDiagnostics(diagnostics, 'HomePage structure & search navigation');
    });
  });

  it('Enforces unified header/footer, light palette, 100% Azerbaijani copy & zero errors across all public routes', async () => {
    const { projectSlug, componentSlug } = await discoverSeededSlugs();
    const publicRoutes = [
      '/',
      '/catalog',
      '/projects',
      '/categories',
      `/projects/${projectSlug}`,
      '/component-finder',
      '/library',
      `/library/${componentSlug}`,
      '/authors',
      '/login',
      '/register',
      '/terms',
      '/privacy',
      '/license',
      '/faq',
    ];

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      for (const route of publicRoutes) {
        clearDiagnostics(diagnostics);
        await navigateAndWaitReady(page, route);
        await scrollPageToRevealAll(page, { returnToTop: true });
        await assertCommonPageChrome(page, route);
        assertNoDiagnostics(diagnostics, `public route ${route}`);
      }
    });
  });

  it('Enforces unified header/footer, light palette, 100% Azerbaijani copy & zero errors across Buyer, Author and Admin protected routes', async () => {
    // Buyer routes
    const buyer = await createBuyerSession();
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await loginViaUi(page, buyer.user.email, 'Password123!');
      for (const route of ['/profile', '/orders/my', '/tickets', '/become-author']) {
        clearDiagnostics(diagnostics);
        await navigateAndWaitReady(page, route);
        assert(!page.url().includes('/login'), `Buyer should remain authenticated on "${route}"`);
        await scrollPageToRevealAll(page, { returnToTop: true });
        await assertCommonPageChrome(page, route);
        assertNoDiagnostics(diagnostics, `buyer route ${route}`);
      }
    });

    // Author route
    const authorEmail = process.env.FEEDLAB_AUTHOR_EMAIL || 'author@feedlab.az';
    const authorPassword = process.env.FEEDLAB_AUTHOR_PASSWORD || 'Author123!';
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await loginViaUi(page, authorEmail, authorPassword);
      clearDiagnostics(diagnostics);
      await navigateAndWaitReady(page, '/author/dashboard');
      assert(!page.url().includes('/login'), 'Author should remain authenticated on /author/dashboard');
      await scrollPageToRevealAll(page, { returnToTop: true });
      await assertCommonPageChrome(page, '/author/dashboard');
      assertNoDiagnostics(diagnostics, 'author route /author/dashboard');
    });

    // Admin routes
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await loginViaUi(page, config.adminEmail, config.adminPassword);
      for (const route of ['/admin/dashboard', '/admin/components']) {
        clearDiagnostics(diagnostics);
        await navigateAndWaitReady(page, route);
        assert(!page.url().includes('/login'), `Admin should remain authenticated on "${route}"`);
        await scrollPageToRevealAll(page, { returnToTop: true });
        await assertCommonPageChrome(page, route);
        assertNoDiagnostics(diagnostics, `admin route ${route}`);
      }
    });
  });

  it('Has zero horizontal overflow across desktop (1440x900), tablet (768x1024), and mobile (375x812)', async () => {
    const { projectSlug, componentSlug } = await discoverSeededSlugs();
    const buyer = await createBuyerSession();

    const viewports = [
      { label: 'desktop 1440x900', width: 1440, height: 900 },
      { label: 'tablet 768x1024', width: 768, height: 1024 },
      { label: 'mobile 375x812', width: 375, height: 812 },
    ];

    const guestRoutes = [
      '/',
      '/catalog',
      '/projects',
      '/categories',
      `/projects/${projectSlug}`,
      '/component-finder',
      '/library',
      `/library/${componentSlug}`,
      '/login',
    ];

    for (const vp of viewports) {
      await withPage(browser, { viewport: { width: vp.width, height: vp.height } }, async (page, diagnostics) => {
        for (const route of guestRoutes) {
          clearDiagnostics(diagnostics);
          await navigateAndWaitReady(page, route);
          await scrollPageToRevealAll(page, { returnToTop: true });
          await assertNoHorizontalOverflow(page, route, vp.label);
          assertNoDiagnostics(diagnostics, `overflow check ${route} @ ${vp.label}`);
        }

        await loginViaUi(page, buyer.user.email, 'Password123!');
        clearDiagnostics(diagnostics);
        await navigateAndWaitReady(page, '/profile');
        await scrollPageToRevealAll(page, { returnToTop: true });
        await assertNoHorizontalOverflow(page, '/profile', vp.label);
        assertNoDiagnostics(diagnostics, `overflow check /profile @ ${vp.label}`);
      });

      await withPage(browser, { viewport: { width: vp.width, height: vp.height } }, async (page, diagnostics) => {
        await loginViaUi(page, config.adminEmail, config.adminPassword);
        clearDiagnostics(diagnostics);
        await navigateAndWaitReady(page, '/admin/components');
        await scrollPageToRevealAll(page, { returnToTop: true });
        await assertNoHorizontalOverflow(page, '/admin/components', vp.label);
        assertNoDiagnostics(diagnostics, `overflow check /admin/components @ ${vp.label}`);
      });
    }
  });

  it('Captures full-page and above-the-fold visual rubric PNG screenshots into tests/e2e/artifacts/', async () => {
    const { componentSlug } = await discoverSeededSlugs();
    const savedFiles: string[] = [];

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/');
      await page.waitForTimeout(900);
      savedFiles.push(await saveArtifactScreenshot(page, 'home-desktop-1440x900-fold.png', { fullPage: false }));

      await scrollPageToRevealAll(page, { returnToTop: true });
      savedFiles.push(await saveArtifactScreenshot(page, 'home-desktop-1440x900-full.png', { fullPage: true }));

      await navigateAndWaitReady(page, '/catalog');
      await scrollPageToRevealAll(page, { returnToTop: true });
      savedFiles.push(await saveArtifactScreenshot(page, 'catalog-desktop-1440x900.png', { fullPage: true }));

      await navigateAndWaitReady(page, '/component-finder');
      await scrollPageToRevealAll(page, { returnToTop: true });
      savedFiles.push(await saveArtifactScreenshot(page, 'component-finder-desktop-1440x900.png', { fullPage: true }));

      await navigateAndWaitReady(page, '/library');
      await scrollPageToRevealAll(page, { returnToTop: true });
      savedFiles.push(await saveArtifactScreenshot(page, 'library-desktop-1440x900.png', { fullPage: true }));

      await navigateAndWaitReady(page, `/library/${componentSlug}`);
      await scrollPageToRevealAll(page, { returnToTop: true });
      savedFiles.push(await saveArtifactScreenshot(page, 'library-detail-desktop-1440x900.png', { fullPage: true }));

      assertNoDiagnostics(diagnostics, 'desktop screenshot captures');
    });

    await withPage(browser, { viewport: { width: 375, height: 812 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/');
      await scrollPageToRevealAll(page, { returnToTop: true });
      savedFiles.push(await saveArtifactScreenshot(page, 'home-mobile-375x812-full.png', { fullPage: true }));
      assertNoDiagnostics(diagnostics, 'mobile screenshot capture');
    });

    for (const filePath of savedFiles) {
      assert(fs.existsSync(filePath), `Expected screenshot artifact at ${filePath}`);
      assert(fs.statSync(filePath).size > 0, `Expected non-empty screenshot artifact at ${filePath}`);
    }
  });
});
