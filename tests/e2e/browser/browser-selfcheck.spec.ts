import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Browser } from 'playwright';
import {
  launchBrowser,
  withPage,
  assertLightThemePalette,
  assertNoHorizontalOverflow,
  assertAzerbaijaniUiCopy,
  assertNoDiagnostics,
  saveArtifactScreenshot,
  parseRgb,
} from './browser-helper.ts';

const OFFLINE_SELFCHECK_HTML = `<!DOCTYPE html>
<html lang="az">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Feed Lab — Özün Yığ və Öyrən</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        background-color: #F8FAFC;
        color: #0F172A;
      }
      header {
        background-color: #FFFFFF;
        border-bottom: 1px solid #E2E8F0;
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 40px 24px;
      }
      .cta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }
      .btn-primary {
        background-color: #147DF5;
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        padding: 12px 20px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-secondary {
        background-color: #FFFFFF;
        color: #0F172A;
        border: 1px solid #CBD5E1;
        border-radius: 10px;
        padding: 12px 20px;
        font-weight: 600;
        cursor: pointer;
      }
      footer {
        background-color: #FFFFFF;
        border-top: 1px solid #E2E8F0;
        padding: 24px;
        margin-top: 40px;
        text-align: center;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <header>
      <a href="/">Feed Lab</a>
      <nav aria-label="Əsas menyu">
        <a href="/catalog">Kataloq</a>
        <a href="/component-finder">Komponentlərimlə Tap</a>
        <a href="/library">Kitabxana</a>
      </nav>
    </header>
    <main>
      <h1>Öz Elektronika Cihazını Özün Yığ və Öyrən</h1>
      <p>Sxemini, kodunu və materiallarını əldə et, sıfırdan hazırla.</p>
      <div class="cta-row">
        <button type="button" class="btn-primary">Layihələri Kəşf Et</button>
        <button type="button" class="btn-secondary">Komponentlərimlə Tap</button>
      </div>
      <p>Azərbaycan əlifbası yoxlaması: ə, ö, ü, ğ, ç, ş, ı, İ</p>
    </main>
    <footer>
      <p>© 2026 Feed Lab — Valyuta: AZN (₼) • Dil: Azərbaycan</p>
    </footer>
  </body>
</html>`;

describe('Playwright Browser Offline Self-Check', () => {
  let browser: Browser;

  before(async () => {
    browser = await launchBrowser();
  });

  after(async () => {
    await browser?.close();
  });

  it('launches headless Chromium, renders UTF-8 Azerbaijani HTML, verifies computed styles & overflow, and writes artifact screenshot', async () => {
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await page.setContent(OFFLINE_SELFCHECK_HTML, { waitUntil: 'load' });

      const headingText = await page.getByRole('heading', { level: 1 }).innerText();
      assert.equal(headingText.trim(), 'Öz Elektronika Cihazını Özün Yığ və Öyrən');

      const bodyText = await page.evaluate(() => document.body.innerText);
      for (const ch of ['ə', 'ö', 'ü', 'ğ', 'ç', 'ş', 'ı', 'İ']) {
        assert(bodyText.includes(ch), `Expected UTF-8 Azerbaijani character "${ch}" to render`);
      }

      const computed = await page.evaluate(() => {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const primaryBtn = document.querySelector('button');
        const btnBg = primaryBtn ? window.getComputedStyle(primaryBtn).backgroundColor : '';
        return { bodyBg, btnBg };
      });

      const bodyRgb = parseRgb(computed.bodyBg);
      assert(bodyRgb, `Expected parseable body backgroundColor, got "${computed.bodyBg}"`);
      assert.deepEqual(
        { r: bodyRgb.r, g: bodyRgb.g, b: bodyRgb.b },
        { r: 248, g: 250, b: 252 },
        `Expected #F8FAFC background color`
      );

      const btnRgb = parseRgb(computed.btnBg);
      assert(btnRgb, `Expected parseable button backgroundColor, got "${computed.btnBg}"`);
      assert.deepEqual(
        { r: btnRgb.r, g: btnRgb.g, b: btnRgb.b },
        { r: 20, g: 125, b: 245 },
        `Expected #147DF5 primary button color`
      );

      await assertLightThemePalette(page, { checkHomePrimaryCta: true, routeLabel: '/selfcheck' });
      await assertAzerbaijaniUiCopy(page, '/selfcheck');
      await assertNoHorizontalOverflow(page, '/selfcheck', 'desktop 1440x900');

      const screenshotPath = await saveArtifactScreenshot(page, 'selfcheck-smoke.png', {
        fullPage: true,
      });
      assert(fs.existsSync(screenshotPath), `Expected screenshot file at ${screenshotPath}`);
      assert(fs.statSync(screenshotPath).size > 0, `Expected non-empty screenshot at ${screenshotPath}`);

      await page.setViewportSize({ width: 375, height: 812 });
      await assertNoHorizontalOverflow(page, '/selfcheck', 'mobile 375x812');

      assertNoDiagnostics(diagnostics, 'browser-selfcheck');
    });
  });
});
