import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type ConsoleMessage,
  type Page,
  type Response,
} from 'playwright';
import { config } from '../config.ts';

export interface BrowserDiagnostics {
  consoleErrors: string[];
  pageErrors: string[];
  serverErrors: Array<{ url: string; status: number }>;
}

export interface WithPageOptions {
  viewport?: { width: number; height: number };
  reducedMotion?: 'reduce' | 'no-preference';
  permissions?: string[];
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const WHITELISTED_TECH_TOKENS: RegExp[] = [
  /\bFeed\s*Lab\b/gi,
  /\bFEED\s*Agency\b/gi,
  /\bESP32(?:-S\d|-C\d)?\b/gi,
  /\bArduino(?:\s+(?:Nano|Uno|Mega|IDE|Library))?\b/gi,
  /\bRaspberry\s+Pi\b/gi,
  /\bWi-Fi\b/gi,
  /\bBluetooth(?:\s+BLE)?\b/gi,
  /\bMQTT\b/gi,
  /\bHTTP(?:S)?\b/gi,
  /\bREST\b/gi,
  /\bPCB\b/gi,
  /\bBOM\b/gi,
  /\bAZN\b/gi,
  /\bFAQ\b/gi,
  /\bIoT\b/gi,
  /\bLED\b/gi,
  /\bRGB\b/gi,
  /\bLCD\b/gi,
  /\bOLED\b/gi,
  /\bPWM\b/gi,
  /\bGPIO\b/gi,
  /\bUART\b/gi,
  /\bI2C\b/gi,
  /\bSPI\b/gi,
  /\bUSB(?:-C)?\b/gi,
  /\bADC\b/gi,
  /\bDAC\b/gi,
  /\bDC\b/gi,
  /\bAC\b/gi,
  /\bIDE\b/gi,
  /\bC\+\+/gi,
  /\bPython\b/gi,
  /\bMicroPython\b/gi,
  /\bHTML\b/gi,
  /\bCSS\b/gi,
  /\bJSON\b/gi,
  /\bAPI\b/gi,
  /\bAdmin\b/gi,
  /\bPinout\b/gi,
  /\bGND\b/gi,
  /\bVCC\b/gi,
  /\bSDA\b/gi,
  /\bSCL\b/gi,
  /\bMOSI\b/gi,
  /\bMISO\b/gi,
  /\bSCK\b/gi,
  /\bTX\b/gi,
  /\bRX\b/gi,
  /\bDHT(?:11|22)\b/gi,
  /\bHC-SR04\b/gi,
  /\bSG90\b/gi,
  /\bL298N\b/gi,
  /\bMPU6050\b/gi,
  /\bBMP280\b/gi,
  /\bDS18B20\b/gi,
  /\bSSD1306\b/gi,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /https?:\/\/\S+/gi,
];

const UNTRANSLATED_ENGLISH_UI_REGEX =
  /\b(Sign in|Sign up|Log in|Login|Log out|Logout|Register|Loading\.{0,3}|Submit|Search|Dashboard|Not Found|Page Not Found|Profile|Coming soon|Settings|Categories|Free Projects|Free|Beginner|Library|Authors|Overview|Orders|Refunds|Users|Create Project|Edit Project|Download Project|Delete|Cancel|Save changes|No results found|No projects found|Filter|Add to cart|Buy now|Checkout|Forgot password|Reset password)\b/i;

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: config.headless });
}

export function attachDiagnostics(page: Page): BrowserDiagnostics {
  const diagnostics: BrowserDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    serverErrors: [],
  };

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      diagnostics.consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err: Error) => {
    diagnostics.pageErrors.push(err?.message || String(err));
  });

  page.on('response', (res: Response) => {
    if (res.status() >= 500) {
      diagnostics.serverErrors.push({
        url: res.url(),
        status: res.status(),
      });
    }
  });

  return diagnostics;
}

export function clearDiagnostics(diagnostics: BrowserDiagnostics): void {
  diagnostics.consoleErrors.length = 0;
  diagnostics.pageErrors.length = 0;
  diagnostics.serverErrors.length = 0;
}

export function assertNoDiagnostics(diagnostics: BrowserDiagnostics, contextLabel: string): void {
  const hasErrors =
    diagnostics.consoleErrors.length > 0 ||
    diagnostics.pageErrors.length > 0 ||
    diagnostics.serverErrors.length > 0;

  assert.equal(
    hasErrors,
    false,
    `Browser diagnostics failure on [${contextLabel}]: ${JSON.stringify(diagnostics, null, 2)}`
  );
}

export async function withPage<T>(
  browser: Browser,
  options: WithPageOptions,
  fn: (page: Page, diagnostics: BrowserDiagnostics, context: BrowserContext) => Promise<T>
): Promise<T> {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion ?? 'no-preference',
    permissions: options.permissions,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(config.browserTimeoutMs);
  const diagnostics = attachDiagnostics(page);

  try {
    return await fn(page, diagnostics, context);
  } finally {
    await context.close();
  }
}

export async function ensureWebReachable(): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(config.webUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
  } catch (err: any) {
    throw new Error(
      `Frontend web server at ${config.webUrl} is unreachable (${err?.message || err}). ` +
        `Start backend (${config.apiUrl}) and frontend (${config.webUrl}) before running live browser E2E tests.`
    );
  } finally {
    clearTimeout(timer);
  }
}

export function resolveArtifactsDir(): string {
  const dir = path.resolve(config.artifactsDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function saveArtifactScreenshot(
  page: Page,
  filename: string,
  opts?: { fullPage?: boolean }
): Promise<string> {
  const dir = resolveArtifactsDir();
  const outPath = path.join(dir, filename);
  await page.screenshot({
    path: outPath,
    fullPage: opts?.fullPage ?? false,
  });
  return outPath;
}

export function parseRgb(cssColor: string): RgbColor | null {
  const match = cssColor
    .trim()
    .match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/i);

  if (!match) {
    return null;
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  };
}

export function computeRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const toLinear = (channel: number): number => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function assertLightThemePalette(
  page: Page,
  options?: { checkHomePrimaryCta?: boolean; routeLabel?: string }
): Promise<void> {
  const label = options?.routeLabel || page.url();
  const colors = await page.evaluate(() => {
    const bodyStyle = window.getComputedStyle(document.body);
    const rootEl = document.getElementById('root') || document.querySelector('#app');
    const htmlEl = document.documentElement;
    const mainEl = document.querySelector('main');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    return {
      bodyBg: bodyStyle.backgroundColor,
      rootBg: rootEl ? window.getComputedStyle(rootEl).backgroundColor : null,
      htmlBg: htmlEl ? window.getComputedStyle(htmlEl).backgroundColor : null,
      mainBg: mainEl ? window.getComputedStyle(mainEl).backgroundColor : null,
      bodyColor: bodyStyle.color,
      headerBg: header ? window.getComputedStyle(header).backgroundColor : null,
      footerBg: footer ? window.getComputedStyle(footer).backgroundColor : null,
    };
  });

  const bodyBgParsed = parseRgb(colors.bodyBg);
  assert(bodyBgParsed, `Could not parse body backgroundColor "${colors.bodyBg}" on ${label}`);

  const bgCandidates: Array<{ source: string; css: string | null | undefined }> = [
    { source: 'body', css: colors.bodyBg },
    { source: '#root', css: colors.rootBg },
    { source: 'html', css: colors.htmlBg },
  ];

  let effectiveBgCss = 'rgb(255, 255, 255)';
  let effectiveBgRgb: RgbColor = { r: 255, g: 255, b: 255, a: 1 };
  let effectiveBgSource = 'canvas-default';

  for (const candidate of bgCandidates) {
    if (!candidate.css) continue;
    const parsed = parseRgb(candidate.css);
    assert(parsed, `Could not parse ${candidate.source} backgroundColor "${candidate.css}" on ${label}`);
    if (parsed.a > 0.05) {
      effectiveBgCss = candidate.css;
      effectiveBgRgb = parsed;
      effectiveBgSource = candidate.source;
      break;
    }
  }

  const bodyBgLum = computeRelativeLuminance(effectiveBgRgb);
  assert(
    bodyBgLum >= 0.8,
    `Expected light ${effectiveBgSource} background (luminance >= 0.80) on ${label}, got ${effectiveBgCss} (lum=${bodyBgLum.toFixed(3)})`
  );

  if (colors.mainBg) {
    const mainBgRgb = parseRgb(colors.mainBg);
    assert(mainBgRgb, `Could not parse <main> backgroundColor "${colors.mainBg}" on ${label}`);
    if (mainBgRgb.a > 0.05) {
      const mainBgLum = computeRelativeLuminance(mainBgRgb);
      assert(
        mainBgLum >= 0.8,
        `Expected light <main> background (luminance >= 0.80) on ${label}, got ${colors.mainBg} (lum=${mainBgLum.toFixed(3)})`
      );
    }
  }

  const bodyTextRgb = parseRgb(colors.bodyColor);
  assert(bodyTextRgb, `Could not parse body text color "${colors.bodyColor}" on ${label}`);
  const bodyTextLum = computeRelativeLuminance(bodyTextRgb);
  assert(
    bodyTextLum <= 0.35,
    `Expected dark readable body text (luminance <= 0.35) on ${label}, got ${colors.bodyColor} (lum=${bodyTextLum.toFixed(3)})`
  );

  if (colors.headerBg) {
    const headerRgb = parseRgb(colors.headerBg);
    if (headerRgb && headerRgb.a > 0.05) {
      const headerLum = computeRelativeLuminance(headerRgb);
      assert(
        headerLum >= 0.85,
        `Expected light header background (luminance >= 0.85) on ${label}, got ${colors.headerBg} (lum=${headerLum.toFixed(3)})`
      );
    }
  }

  if (colors.footerBg) {
    const footerRgb = parseRgb(colors.footerBg);
    if (footerRgb && footerRgb.a > 0.05) {
      const footerLum = computeRelativeLuminance(footerRgb);
      assert(
        footerLum >= 0.8,
        `Expected light footer background (luminance >= 0.80) on ${label}, got ${colors.footerBg} (lum=${footerLum.toFixed(3)})`
      );
    }
  }

  if (options?.checkHomePrimaryCta) {
    const primaryCta = page
      .getByRole('link', { name: /Layihələri Kəşf Et/i })
      .or(page.getByRole('button', { name: /Layihələri Kəşf Et/i }))
      .first();
    const fallbackCta = page
      .getByRole('link', { name: /Qeydiyyat/i })
      .or(page.getByRole('button', { name: /Qeydiyyat/i }))
      .first();

    const targetCta = (await primaryCta.count()) > 0 ? primaryCta : fallbackCta;
    assert((await targetCta.count()) > 0, `Expected primary blue CTA button/link on ${label}`);

    const ctaBg = await targetCta.evaluate((el: Element) => window.getComputedStyle(el).backgroundColor);
    const ctaRgb = parseRgb(ctaBg);
    assert(ctaRgb, `Could not parse primary CTA backgroundColor "${ctaBg}" on ${label}`);
    assert(
      ctaRgb.b > ctaRgb.r + 100 && ctaRgb.b > ctaRgb.g + 50 && ctaRgb.b > 180 && ctaRgb.g > ctaRgb.r,
      `Expected blue accent primary CTA (#147DF5 range, b > r + 100 && b > g + 50 && b > 180 && g > r) on ${label}, got ${ctaBg}`
    );
  }
}

export async function assertNoHorizontalOverflow(
  page: Page,
  route: string,
  viewportLabel: string
): Promise<void> {
  const result = await page.evaluate(() => {
    const docEl = document.documentElement;
    const scrollWidth = docEl.scrollWidth;
    const clientWidth = docEl.clientWidth;
    const offenders: Array<{ tag: string; text: string; right: number }> = [];

    if (scrollWidth > clientWidth) {
      const all = Array.from(document.querySelectorAll<HTMLElement>('body *'));
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.right > clientWidth + 1) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40),
            right: Math.round(rect.right),
          });
          if (offenders.length >= 5) break;
        }
      }
    }

    return { scrollWidth, clientWidth, offenders };
  });

  assert(
    result.scrollWidth <= result.clientWidth,
    `Horizontal overflow detected on route "${route}" at ${viewportLabel}: ` +
      `scrollWidth (${result.scrollWidth}) > clientWidth (${result.clientWidth}). ` +
      `Offenders: ${JSON.stringify(result.offenders)}`
  );
}

export async function scrollPageToRevealAll(
  page: Page,
  options?: { returnToTop?: boolean }
): Promise<void> {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const step = 300;

  for (let y = 0; y <= totalHeight; y += step) {
    await page.evaluate((pos: number) => window.scrollTo(0, pos), y);
    await page.waitForTimeout(150);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);

  if (options?.returnToTop !== false) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
  }
}

export async function assertAzerbaijaniUiCopy(
  page: Page,
  route: string,
  options?: { allowNotFound?: boolean }
): Promise<void> {
  const rawText = await page.evaluate(() => {
    const excludedTags = new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEMPLATE']);
    const chunks: string[] = [];

    const isHidden = (el: Element): boolean => {
      const tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (excludedTags.has(tag)) return true;
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        const style = window.getComputedStyle(el);
        if (
          style &&
          (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')
        ) {
          return true;
        }
      }
      return false;
    };

    const collectVisibleAttrs = (el: Element): void => {
      if (!el.getAttribute) return;
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) {
        chunks.push(ariaLabel.trim());
      }
      const tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        const inputType = (el.getAttribute('type') || '').toLowerCase();
        if (inputType !== 'hidden') {
          const placeholder = el.getAttribute('placeholder');
          if (placeholder && placeholder.trim()) {
            chunks.push(placeholder.trim());
          }
        }
      }
    };

    const traverse = (node: Node): void => {
      if (!node) return;
      if (node.nodeType === 3) {
        const text = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (text) {
          chunks.push(text);
        }
        return;
      }
      if (node.nodeType !== 1) return;

      const el = node as Element;
      if (isHidden(el)) return;

      collectVisibleAttrs(el);
      const children = el.childNodes;
      if (children && children.length > 0) {
        for (let i = 0; i < children.length; i++) {
          traverse(children[i]);
        }
      }
    };

    if (document.body) {
      traverse(document.body);
    }
    return chunks.join(' ');
  });

  assert(rawText.trim().length > 0, `Expected non-empty visible UI text on route "${route}"`);

  assert(
    !/Hazırlanır/i.test(rawText),
    `Found unfinished placeholder "Hazırlanır" on route "${route}"`
  );

  if (!options?.allowNotFound) {
    assert(
      !/404\s*[—–-]\s*Səhifə tapılmadı/i.test(rawText) &&
        !/Axtardığınız səhifə mövcud deyil/i.test(rawText),
      `Route "${route}" rendered 404 fallback page unexpectedly`
    );
  }

  let sanitized = rawText;
  for (const tokenRegex of WHITELISTED_TECH_TOKENS) {
    sanitized = sanitized.replace(tokenRegex, ' ');
  }

  const englishMatch = sanitized.match(UNTRANSLATED_ENGLISH_UI_REGEX);
  assert(
    !englishMatch,
    `Untranslated English UI token "${englishMatch?.[0]}" found on route "${route}". Sample: ${sanitized.slice(0, 400)}`
  );
}

export async function navigateAndWaitReady(page: Page, routePath: string): Promise<void> {
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const targetUrl = `${config.webUrl.replace(/\/+$/, '')}${normalizedPath}`;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('header, main, h1, h2').first().waitFor({ state: 'visible' });
}

export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await navigateAndWaitReady(page, '/login');
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();

  await page.waitForURL((url: URL) => !/\/login\/?$/.test(url.pathname));
  await page.waitForLoadState('networkidle').catch(() => {});
}
