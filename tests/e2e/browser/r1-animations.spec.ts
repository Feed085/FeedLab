import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser, Locator } from 'playwright';
import {
  launchBrowser,
  withPage,
  ensureWebReachable,
  navigateAndWaitReady,
  assertNoDiagnostics,
} from './browser-helper.ts';

interface ElementAnimationState {
  opacity: number;
  visibility: string;
  transform: string;
  transitionDuration: string;
  animationName: string;
  top: number;
  width: number;
  height: number;
}

async function readElementState(locator: Locator): Promise<ElementAnimationState> {
  return locator.evaluate((el: Element) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      opacity: Number.parseFloat(style.opacity || '1'),
      visibility: style.visibility,
      transform: style.transform,
      transitionDuration: style.transitionDuration,
      animationName: style.animationName,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  });
}

interface AncestorMotionState {
  anyHiddenOrTranslated: boolean;
  maxAnimationDurationMs: number;
  maxTransitionDurationMs: number;
  maxAnimationDelayMs: number;
  top: number;
}

async function readAncestorChainMotionState(locator: Locator): Promise<AncestorMotionState> {
  return locator.evaluate((el: Element) => {
    const parseCssTimeMs = (raw: string): number => {
      if (!raw) return 0;
      let maxMs = 0;
      for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (part.endsWith('ms')) {
          const val = Number.parseFloat(part.slice(0, -2));
          if (Number.isFinite(val)) maxMs = Math.max(maxMs, val);
        } else if (part.endsWith('s')) {
          const val = Number.parseFloat(part.slice(0, -1));
          if (Number.isFinite(val)) maxMs = Math.max(maxMs, val * 1000);
        }
      }
      return maxMs;
    };

    const rect = el.getBoundingClientRect();
    let cur: HTMLElement | null = el as HTMLElement;
    let anyHiddenOrTranslated = false;
    let maxAnimationDurationMs = 0;
    let maxTransitionDurationMs = 0;
    let maxAnimationDelayMs = 0;

    while (cur && cur !== document.body) {
      const style = window.getComputedStyle(cur);
      const opacity = Number.parseFloat(style.opacity || '1');
      const isIdentityTransform =
        style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)';
      if (opacity < 0.99 || !isIdentityTransform) {
        anyHiddenOrTranslated = true;
      }
      const animDur = style.animationName !== 'none' ? parseCssTimeMs(style.animationDuration) : 0;
      const transDur = parseCssTimeMs(style.transitionDuration);
      const animDelay = animDur > 0 ? parseCssTimeMs(style.animationDelay) : 0;

      maxAnimationDurationMs = Math.max(maxAnimationDurationMs, animDur);
      maxTransitionDurationMs = Math.max(maxTransitionDurationMs, transDur);
      maxAnimationDelayMs = Math.max(maxAnimationDelayMs, animDelay);
      cur = cur.parentElement;
    }

    return {
      anyHiddenOrTranslated,
      maxAnimationDurationMs,
      maxTransitionDurationMs,
      maxAnimationDelayMs,
      top: rect.top,
    };
  });
}

async function readSettledAncestorChain(locator: Locator): Promise<{
  allSettled: boolean;
  unsettled: Array<{ tag: string; opacity: string; transform: string }>;
}> {
  return locator.evaluate((el: Element) => {
    let cur: HTMLElement | null = el as HTMLElement;
    const unsettled: Array<{ tag: string; opacity: string; transform: string }> = [];

    while (cur && cur !== document.body) {
      const style = window.getComputedStyle(cur);
      const isIdentityTransform =
        style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)';
      if (style.opacity !== '1' || !isIdentityTransform) {
        unsettled.push({
          tag: cur.tagName.toLowerCase(),
          opacity: style.opacity,
          transform: style.transform,
        });
      }
      cur = cur.parentElement;
    }

    return { allSettled: unsettled.length === 0, unsettled };
  });
}

async function waitUntilSettledVisible(locator: Locator, label: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastState: ElementAnimationState | null = null;
  let lastUnsettledAncestors: Array<{ tag: string; opacity: string; transform: string }> = [];

  while (Date.now() < deadline) {
    lastState = await readElementState(locator);
    const chain = await readSettledAncestorChain(locator);
    lastUnsettledAncestors = chain.unsettled;

    if (
      chain.allSettled &&
      lastState.opacity >= 0.99 &&
      lastState.visibility === 'visible' &&
      lastState.width > 0 &&
      lastState.height > 0
    ) {
      return;
    }

    await new Promise((r) => setTimeout(r, 50));
  }

  assert.fail(
    `Element "${label}" did not settle to visible opacity=1 and identity transform within ${timeoutMs}ms. Last state: ${JSON.stringify(lastState)}, unsettled ancestors: ${JSON.stringify(lastUnsettledAncestors)}`
  );
}

describe('R1: Hero Entrance & Below-the-Fold Scroll-Reveal Animations', () => {
  let browser: Browser;

  before(async () => {
    await ensureWebReachable();
    browser = await launchBrowser();
  });

  after(async () => {
    await browser?.close();
  });

  it('Hero elements complete staggered entrance animation to settled opacity=1 within 1500ms', async () => {
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/');

      const main = page.locator('main').first();
      const heroH1 = main.getByRole('heading', { level: 1 }).first();
      const heroSubtitle = main
        .getByText(/Sxemini,\s*kodunu və materiallarını əldə et,\s*sıfırdan hazırla/i)
        .first();
      const heroSearch = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .first();
      const heroPrimaryCta = main
        .getByRole('link', { name: /Layihələri Kəşf Et/i })
        .or(main.getByRole('button', { name: /Layihələri Kəşf Et/i }))
        .first();
      const heroImage = main.locator('section').first().locator('img').first();

      const heroTargets = [
        { locator: heroH1, label: 'Hero H1' },
        { locator: heroSubtitle, label: 'Hero subtitle' },
        { locator: heroSearch, label: 'Hero search input' },
        { locator: heroPrimaryCta, label: 'Hero primary CTA' },
        { locator: heroImage, label: 'Hero ESP32 image' },
      ];

      const motionStates: AncestorMotionState[] = [];
      for (const target of heroTargets) {
        await target.locator.waitFor({ state: 'attached' });
        const motion = await readAncestorChainMotionState(target.locator);
        assert(
          motion.maxAnimationDurationMs >= 50 || motion.maxTransitionDurationMs >= 50,
          `Expected Hero target "${target.label}" to have entrance motion (>= 50ms), got: ${JSON.stringify(motion)}`
        );
        motionStates.push(motion);
      }

      const distinctDelays = new Set(motionStates.map((s) => Math.round(s.maxAnimationDelayMs)));
      assert(
        distinctDelays.size >= 2,
        `Expected staggered animation delays across Hero elements (>= 2 distinct delays), got: ${JSON.stringify(motionStates.map((s) => s.maxAnimationDelayMs))}`
      );

      for (const target of heroTargets) {
        await waitUntilSettledVisible(target.locator, target.label, 1500);
      }

      assertNoDiagnostics(diagnostics, 'Hero staggered entrance');
    });
  });

  it('Below-the-fold sections use scroll-reveal animation and transition smoothly to opacity=1 when scrolled into view', async () => {
    await withPage(
      browser,
      { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
      async (page, diagnostics) => {
        await navigateAndWaitReady(page, '/');

        const scrollY = await page.evaluate(() => window.scrollY);
        assert.equal(scrollY, 0, 'Expected page to start at scrollY === 0');

        const featuredHeading = page.getByRole('heading', { name: /Seçilmiş Layihələr/i }).first();
        const latestHeading = page.getByRole('heading', { name: /Ən Son Əlavə Edilən Layihələr/i }).first();
        const footer = page.locator('footer').first();

        await featuredHeading.waitFor({ state: 'attached' });
        await latestHeading.waitFor({ state: 'attached' });
        await footer.waitFor({ state: 'attached' });

        const preFeaturedState = await readAncestorChainMotionState(featuredHeading);
        const preLatestState = await readAncestorChainMotionState(latestHeading);
        const preFooterState = await readAncestorChainMotionState(footer);

        const preStates = [preFeaturedState, preLatestState, preFooterState];
        const belowFoldAnimated = preStates.some(
          (s) =>
            s.top >= 900 &&
            s.anyHiddenOrTranslated &&
            (s.maxTransitionDurationMs >= 50 || s.maxAnimationDurationMs >= 50)
        );

        assert(
          belowFoldAnimated,
          `Expected at least one below-the-fold section (top >= 900) to start hidden/translated with smooth transition (>= 50ms) at scrollY === 0 before scrolling. States: featured=${JSON.stringify(preFeaturedState)}, latest=${JSON.stringify(preLatestState)}, footer=${JSON.stringify(preFooterState)}`
        );

        // Scroll incrementally until "Seçilmiş Layihələr" enters viewport
        for (let step = 0; step < 20; step++) {
          const rectTop = await featuredHeading.evaluate((el: Element) => el.getBoundingClientRect().top);
          if (rectTop < 900 - 80) break;
          await page.evaluate(() => window.scrollBy(0, 260));
          await page.waitForTimeout(100);
        }

        await waitUntilSettledVisible(featuredHeading, 'Seçilmiş Layihələr heading', 1500);

        // Scroll incrementally until "Ən Son Əlavə Edilən Layihələr" enters viewport
        for (let step = 0; step < 25; step++) {
          const rectTop = await latestHeading.evaluate((el: Element) => el.getBoundingClientRect().top);
          if (rectTop < 900 - 80) break;
          await page.evaluate(() => window.scrollBy(0, 260));
          await page.waitForTimeout(100);
        }

        await waitUntilSettledVisible(latestHeading, 'Ən Son Əlavə Edilən Layihələr heading', 1500);

        // Scroll incrementally until footer enters viewport
        for (let step = 0; step < 25; step++) {
          const rectTop = await footer.evaluate((el: Element) => el.getBoundingClientRect().top);
          if (rectTop < 900 - 40) break;
          await page.evaluate(() => window.scrollBy(0, 300));
          await page.waitForTimeout(100);
        }

        await waitUntilSettledVisible(footer, 'Footer', 1000);

        const postFeaturedState = await readSettledAncestorChain(featuredHeading);
        assert(
          postFeaturedState.allSettled,
          `Expected settled opacity="1" and identity transform across all ancestors of "Seçilmiş Layihələr", got ${JSON.stringify(postFeaturedState.unsettled)}`
        );

        const postLatestState = await readSettledAncestorChain(latestHeading);
        assert(
          postLatestState.allSettled,
          `Expected settled opacity="1" and identity transform across all ancestors of "Ən Son Əlavə Edilən Layihələr", got ${JSON.stringify(postLatestState.unsettled)}`
        );

        const postFooterState = await readSettledAncestorChain(footer);
        assert(
          postFooterState.allSettled,
          `Expected settled opacity="1" and identity transform across all ancestors of Footer, got ${JSON.stringify(postFooterState.unsettled)}`
        );

        assertNoDiagnostics(diagnostics, 'Scroll-reveal animations');
      }
    );
  });

  it('Respects prefers-reduced-motion: reduce without animation stalls', async () => {
    await withPage(
      browser,
      { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
      async (page, diagnostics) => {
        await navigateAndWaitReady(page, '/');

        const heroH1 = page.getByRole('heading', { level: 1 }).first();
        await heroH1.waitFor({ state: 'attached' });
        const heroMotion = await readAncestorChainMotionState(heroH1);
        assert(
          heroMotion.maxAnimationDurationMs <= 10,
          `Expected Hero animation duration to be collapsed (<= 10ms) under prefers-reduced-motion: reduce, got: ${JSON.stringify(heroMotion)}`
        );
        await waitUntilSettledVisible(heroH1, 'Hero H1 (reduced motion)', 300);

        const featuredHeading = page.getByRole('heading', { name: /Seçilmiş Layihələr/i }).first();
        const latestHeading = page.getByRole('heading', { name: /Ən Son Əlavə Edilən Layihələr/i }).first();

        await featuredHeading.waitFor({ state: 'attached' });
        await latestHeading.waitFor({ state: 'attached' });

        // Under prefers-reduced-motion: reduce, below-the-fold reveal sections must be immediately visible (not hidden at scrollY=0)
        const reducedFeaturedState = await readAncestorChainMotionState(featuredHeading);
        const reducedLatestState = await readAncestorChainMotionState(latestHeading);
        assert.equal(
          reducedFeaturedState.anyHiddenOrTranslated,
          false,
          `Expected "Seçilmiş Layihələr" to NOT start hidden/translated under prefers-reduced-motion: reduce, got: ${JSON.stringify(reducedFeaturedState)}`
        );
        assert.equal(
          reducedLatestState.anyHiddenOrTranslated,
          false,
          `Expected below-the-fold section to NOT start hidden/translated under prefers-reduced-motion: reduce, got: ${JSON.stringify(reducedLatestState)}`
        );
        assert(
          reducedLatestState.maxTransitionDurationMs <= 10,
          `Expected below-the-fold transition duration to be collapsed (<= 10ms) under prefers-reduced-motion: reduce, got: ${JSON.stringify(reducedLatestState)}`
        );

        await featuredHeading.scrollIntoViewIfNeeded();
        await waitUntilSettledVisible(featuredHeading, 'Seçilmiş Layihələr (reduced motion)', 350);

        await latestHeading.scrollIntoViewIfNeeded();
        await waitUntilSettledVisible(latestHeading, 'Ən Son Əlavə Edilən Layihələr (reduced motion)', 350);

        const footer = page.locator('footer').first();
        await footer.scrollIntoViewIfNeeded();
        await waitUntilSettledVisible(footer, 'Footer (reduced motion)', 350);

        assertNoDiagnostics(diagnostics, 'prefers-reduced-motion: reduce');
      }
    );
  });
});
