import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser, Page, Response } from 'playwright';
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

interface SeededComponent {
  id?: string;
  _id?: string;
  slug: string;
  name: string;
  aliases?: string[];
  category: string;
  categoryLabel?: string;
  shortDescription?: string;
}

interface SeededProjectBomItem {
  name: string;
  componentSlug?: string;
}

interface SeededProjectDetail {
  slug: string;
  title: string;
  price?: number;
  isFree?: boolean;
  priceAzn?: number;
  domains?: string[];
  difficulty?: string;
  components: SeededProjectBomItem[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findMatchingComponent(
  bomItem: SeededProjectBomItem,
  catalog: SeededComponent[]
): SeededComponent | undefined {
  if (bomItem.componentSlug) {
    const bySlug = catalog.find((c) => c.slug === bomItem.componentSlug);
    if (bySlug) return bySlug;
  }
  const bomNorm = normalizeToken(bomItem.name);
  return catalog.find((c) => {
    if (normalizeToken(c.name) === bomNorm) return true;
    if (bomNorm.includes(normalizeToken(c.name)) || normalizeToken(c.name).includes(bomNorm)) return true;
    return (c.aliases || []).some((a) => normalizeToken(a) === bomNorm || bomNorm.includes(normalizeToken(a)));
  });
}

async function fetchSeededComponentsAndTargetProject(): Promise<{
  components: SeededComponent[];
  targetProject: SeededProjectDetail;
  matchedBomComponents: Array<{ bomName: string; component: SeededComponent }>;
}> {
  const api = new ApiClient();

  const compRes = await api.get('/components?limit=100');
  assert(compRes.ok, `Expected GET /components to succeed, got HTTP ${compRes.status}: ${compRes.raw}`);
  const components: SeededComponent[] = extractList(compRes.data);
  assert(components.length >= 2, `Expected at least 2 seeded components, found ${components.length}`);

  const projRes = await api.get('/projects?limit=30');
  assert(projRes.ok, `Expected GET /projects to succeed, got HTTP ${projRes.status}: ${projRes.raw}`);
  const projectList: Array<{ slug: string }> = extractList(projRes.data);
  assert(projectList.length > 0, 'Expected at least 1 seeded approved project');

  let bestCandidate: {
    project: SeededProjectDetail;
    matched: Array<{ bomName: string; component: SeededComponent }>;
  } | null = null;

  for (const item of projectList) {
    if (!item?.slug) continue;
    const detailRes = await api.get(`/projects/${item.slug}`);
    if (!detailRes.ok || !detailRes.data) continue;
    const proj = detailRes.data as SeededProjectDetail;
    if (!Array.isArray(proj.components) || proj.components.length < 2) continue;

    const matched: Array<{ bomName: string; component: SeededComponent }> = [];
    const seenSlugs = new Set<string>();
    for (const bom of proj.components) {
      const comp = findMatchingComponent(bom, components);
      if (comp && !seenSlugs.has(comp.slug)) {
        seenSlugs.add(comp.slug);
        matched.push({ bomName: bom.name, component: comp });
      }
    }

    if (matched.length === proj.components.length && matched.length >= 2) {
      bestCandidate = { project: proj, matched };
      break;
    }
  }

  assert(
    bestCandidate,
    'Expected at least 1 approved seeded project with >= 2 BOM components 100% mappable to seeded library components'
  );

  return {
    components,
    targetProject: bestCandidate.project,
    matchedBomComponents: bestCandidate.matched,
  };
}

async function addComponentInPicker(page: Page, componentName: string): Promise<void> {
  const main = page.locator('main').first();
  const searchInput = main
    .locator('input[type="search"], input[type="text"], input:not([type])')
    .first();
  await searchInput.waitFor({ state: 'visible' });
  await searchInput.fill(componentName);
  await page.waitForTimeout(250);

  const nameRegex = new RegExp(escapeRegex(componentName), 'i');

  // Pattern 1: button whose accessible name includes componentName and Əlavə et
  const combinedBtn = main
    .getByRole('button', { name: new RegExp(`${escapeRegex(componentName)}.*Əlavə et|Əlavə et.*${escapeRegex(componentName)}`, 'i') })
    .first();
  if ((await combinedBtn.count()) > 0 && (await combinedBtn.isVisible())) {
    await combinedBtn.click();
    return;
  }

  // Pattern 2: card/row containing componentName with an "Əlavə et" or "+" button
  const rowWithAdd = main
    .locator('li, article, div')
    .filter({ hasText: nameRegex })
    .filter({ has: page.getByRole('button', { name: /Əlavə et|\+/i }) })
    .last();

  if ((await rowWithAdd.count()) > 0) {
    const addBtn = rowWithAdd.getByRole('button', { name: /Əlavə et|\+/i }).first();
    await addBtn.click();
    return;
  }

  // Pattern 3: selectable component button with componentName
  const pickBtn = main.getByRole('button', { name: nameRegex }).first();
  assert(
    (await pickBtn.count()) > 0,
    `Could not locate picker control to add component "${componentName}" on /component-finder`
  );
  await pickBtn.click();
}

async function removeComponentFromSelectedList(page: Page, componentName: string): Promise<void> {
  const main = page.locator('main').first();
  const nameRegex = new RegExp(escapeRegex(componentName), 'i');

  const removeNamedBtn = main
    .getByRole('button', {
      name: new RegExp(
        `${escapeRegex(componentName)}.*(Çıxar|Sil|Remove|×)|(?:Çıxar|Sil|Remove).*${escapeRegex(componentName)}`,
        'i'
      ),
    })
    .first();

  if ((await removeNamedBtn.count()) > 0) {
    await removeNamedBtn.click();
    return;
  }

  const selectedContainer = main
    .locator('section, aside, div')
    .filter({ hasText: /Mənim komponentlərim|Seçilmiş komponentlər/i })
    .first();

  const itemInSelected = selectedContainer
    .locator('li, span, div')
    .filter({ hasText: nameRegex })
    .filter({ has: page.getByRole('button') })
    .last();

  assert(
    (await itemInSelected.count()) > 0,
    `Could not find selected component "${componentName}" with remove button in selected list`
  );
  await itemInSelected.getByRole('button').first().click();
}

describe('R2: "Komponentlərimlə layihə tap" Browser E2E Flow', () => {
  let browser: Browser;

  before(async () => {
    await ensureWebReachable();
    browser = await launchBrowser();
  });

  after(async () => {
    await browser?.close();
  });

  it('Renders Azerbaijani empty state & initial guidance without bogus 0/0 match cards', async () => {
    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/component-finder');

      const main = page.locator('main').first();
      const heading = main.getByRole('heading', { name: /Komponentlərimlə/i }).first();
      assert(await heading.isVisible(), 'Expected Azerbaijani page heading containing "Komponentlərimlə"');

      const searchInput = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .first();
      assert(await searchInput.isVisible(), 'Expected component search input on /component-finder');

      const mainText = await main.innerText();
      assert(
        !/\b0\/0\s+komponent mövcuddur/i.test(mainText),
        'Empty state must not render bogus "0/0 komponent mövcuddur" cards'
      );
      assert(
        /(seçin|əlavə edin|komponent)/i.test(mainText),
        'Expected empty-selection guidance text on /component-finder'
      );

      await assertAzerbaijaniUiCopy(page, '/component-finder');
      assertNoDiagnostics(diagnostics, '/component-finder empty state');
    });
  });

  it('Supports category & search component picker, add/remove selected list, and duplicate guard', async () => {
    const { components } = await fetchSeededComponentsAndTargetProject();
    const first = components[0];
    const second = components.find((c) => c.category !== first.category) || components[1];
    const sameCategoryItems = components.filter((s) => s.category === first.category);
    const otherCategoryComp =
      components.find(
        (c) =>
          c.category !== first.category &&
          c.name !== first.name &&
          !sameCategoryItems.some((s) =>
            `${s.name} ${s.shortDescription || ''}`.toLowerCase().includes(c.name.toLowerCase())
          )
      ) ||
      components.find(
        (c) =>
          c.category !== first.category &&
          c.name !== first.name &&
          !sameCategoryItems.some((s) => s.name.toLowerCase().includes(c.name.toLowerCase()))
      );
    assert(
      otherCategoryComp,
      `Expected a seeded component from a different category than "${first.category}"`
    );

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/component-finder');
      const main = page.locator('main').first();

      // Category filter check (require category filter control and verify picker list narrows)
      assert(first.categoryLabel, `Expected categoryLabel on seeded component "${first.name}"`);
      const catRegex = new RegExp(escapeRegex(first.categoryLabel), 'i');
      const catBtn = main
        .getByRole('button', { name: catRegex })
        .or(main.getByRole('tab', { name: catRegex }))
        .first();
      const catSelect = main.locator('select').filter({ hasText: catRegex }).first();

      if ((await catBtn.count()) > 0 && (await catBtn.isVisible())) {
        await catBtn.click();
        await page.waitForTimeout(250);

        const pickerTextFiltered = await main.innerText();
        assert(
          pickerTextFiltered.toLowerCase().includes(first.name.toLowerCase()),
          `Expected "${first.name}" to remain visible when filtering by "${first.categoryLabel}"`
        );
        if (otherCategoryComp && !pickerTextFiltered.toLowerCase().includes(otherCategoryComp.name.toLowerCase())) {
          // Verified other-category item was filtered out
        } else if (otherCategoryComp) {
          assert.fail(
            `Expected category filter "${first.categoryLabel}" to exclude component "${otherCategoryComp.name}" from category "${otherCategoryComp.categoryLabel || otherCategoryComp.category}"`
          );
        }

        const allBtn = main
          .getByRole('button', { name: /Hamısı|Bütün/i })
          .or(main.getByRole('tab', { name: /Hamısı|Bütün/i }))
          .first();
        assert((await allBtn.count()) > 0 && (await allBtn.isVisible()), 'Expected "Hamısı" category reset button');
        await allBtn.click();
        await page.waitForTimeout(250);
      } else if ((await catSelect.count()) > 0 && (await catSelect.isVisible())) {
        await catSelect.selectOption({ label: first.categoryLabel });
        await page.waitForTimeout(250);
        const pickerTextFiltered = await main.innerText();
        assert(
          pickerTextFiltered.toLowerCase().includes(first.name.toLowerCase()),
          `Expected "${first.name}" to remain visible when selecting "${first.categoryLabel}"`
        );
        if (pickerTextFiltered.toLowerCase().includes(otherCategoryComp.name.toLowerCase())) {
          assert.fail(
            `Expected category filter "${first.categoryLabel}" to exclude component "${otherCategoryComp.name}" from category "${otherCategoryComp.categoryLabel || otherCategoryComp.category}"`
          );
        }
        const defaultOpt = await catSelect.locator('option').first().getAttribute('value');
        if (defaultOpt !== null) {
          await catSelect.selectOption(defaultOpt);
          await page.waitForTimeout(250);
        }
      } else {
        assert.fail(
          `Expected visible category filter control for "${first.categoryLabel}" on /component-finder`
        );
      }

      // Add 2 distinct components
      await addComponentInPicker(page, first.name);
      await addComponentInPicker(page, second.name);

      // Clear search box so full selected list & results are uncluttered
      const searchInput = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .first();
      await searchInput.fill('');
      await page.waitForTimeout(250);

      const selectedRegion = main
        .locator('section, aside, div')
        .filter({ hasText: /Mənim komponentlərim|Seçilmiş komponentlər/i })
        .first();
      await selectedRegion.waitFor({ state: 'visible' });

      const selectedTextAfterAdd = await selectedRegion.innerText();
      assert(
        selectedTextAfterAdd.includes(first.name) && selectedTextAfterAdd.includes(second.name),
        `Expected both "${first.name}" and "${second.name}" in selected components list, got: "${selectedTextAfterAdd}"`
      );

      // Duplicate guard: re-searching first component must not create duplicate selected entries
      await searchInput.fill(first.name);
      await page.waitForTimeout(200);
      const exactFirstNameRegex = new RegExp(`^\\s*${escapeRegex(first.name)}\\s*$`, 'i');
      const dupAddMatcher = /Əlavə et|\+/i;
      const removeGuardRegex = /Çıxar|Sil|Remove/i;
      const exactTitleLocator = page
        .getByRole('heading', { name: exactFirstNameRegex })
        .or(page.getByText(exactFirstNameRegex));
      const addButtonFilter = page
        .getByRole('button', { name: dupAddMatcher })
        .filter({ hasNotText: removeGuardRegex });

      const exactNamedAddBtn = main
        .getByRole('button', {
          name: new RegExp(
            `^(?:${escapeRegex(first.name)}\\s*(?:—|[-–]|\\||:)?\\s*(?:\\+?\\s*Əlavə et|\\+)|(?:\\+?\\s*Əlavə et)\\s*(?:—|[-–]|\\||:)?\\s*${escapeRegex(first.name)})$`,
            'i'
          ),
        })
        .filter({ hasNotText: removeGuardRegex })
        .first();

      const semanticCardScope =
        (await main.locator('article, li').filter({ has: exactTitleLocator }).count()) > 0
          ? main.locator('article, li')
          : main.locator('div');

      const exactDupCard = semanticCardScope
        .filter({ has: exactTitleLocator })
        .filter({ has: addButtonFilter })
        .last();

      const cardAddBtn = exactDupCard
        .getByRole('button', { name: dupAddMatcher })
        .filter({ hasNotText: removeGuardRegex })
        .first();

      const duplicateAddBtn =
        (await exactNamedAddBtn.count()) > 0 ? exactNamedAddBtn : cardAddBtn;

      if ((await duplicateAddBtn.count()) > 0 && (await duplicateAddBtn.isEnabled())) {
        const ariaLabel = (await duplicateAddBtn.getAttribute('aria-label')) || '';
        if (!removeGuardRegex.test(ariaLabel)) {
          await duplicateAddBtn.click();
          await page.waitForTimeout(200);
        }
      }

      const occurrences = (await selectedRegion.innerText())
        .split(first.name)
        .length - 1;
      assert.equal(
        occurrences,
        1,
        `Expected duplicate guard to keep "${first.name}" once in selected list, found ${occurrences} times`
      );

      await searchInput.fill('');
      await removeComponentFromSelectedList(page, first.name);
      await page.waitForTimeout(300);

      const selectedTextAfterRemove = await selectedRegion.innerText();
      assert(
        !selectedTextAfterRemove.includes(first.name),
        `Expected "${first.name}" to be removed from selected list, got: "${selectedTextAfterRemove}"`
      );
      assert(
        selectedTextAfterRemove.includes(second.name),
        `Expected "${second.name}" to remain in selected list after removing "${first.name}"`
      );

      assertNoDiagnostics(diagnostics, '/component-finder add/remove & duplicate guard');
    });
  });

  it('Separates Partial Match (X/Y komponent mövcuddur + missing names) from Full Match and navigates to /projects/:slug', async () => {
    const { targetProject, matchedBomComponents } = await fetchSeededComponentsAndTargetProject();

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/component-finder');
      const main = page.locator('main').first();

      // Case A: Add N - 1 matched components so at least 1 component of targetProject is missing
      const initialSelections = matchedBomComponents.slice(0, matchedBomComponents.length - 1);
      const missingEntry = matchedBomComponents[matchedBomComponents.length - 1];

      for (const item of initialSelections) {
        const matchRespPromise = page
          .waitForResponse(
            (res: Response) =>
              res.url().includes('/projects/match-components') && res.request().method() === 'POST',
            { timeout: 8000 }
          )
          .catch(() => null);
        await addComponentInPicker(page, item.component.name);
        const matchResp = await matchRespPromise;
        if (matchResp) {
          assert(matchResp.ok(), `Expected 2xx match response, got ${matchResp.status()}`);
        }
      }

      const searchInput = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .first();
      await searchInput.fill('');
      await page.waitForTimeout(400);

      const partialHeading = main.getByText(/Qismən uyğun/i).first();
      assert(await partialHeading.isVisible(), 'Expected "Qismən uyğun" results section');

      const partialCard = main
        .locator('article, section, div')
        .filter({ hasText: new RegExp(escapeRegex(targetProject.title), 'i') })
        .filter({ hasText: /\d+\/\d+\s+komponent mövcuddur/i })
        .last();
      await partialCard.waitFor({ state: 'visible' });

      const partialCardText = await partialCard.innerText();
      assert(
        /\d+\/\d+\s+komponent mövcuddur/i.test(partialCardText),
        `Expected "X/Y komponent mövcuddur" label on partial match card, got: "${partialCardText}"`
      );
      assert(
        partialCardText.toLowerCase().includes(missingEntry.component.name.toLowerCase()) ||
          partialCardText.toLowerCase().includes(missingEntry.bomName.toLowerCase()),
        `Expected missing component name ("${missingEntry.component.name}" / "${missingEntry.bomName}") on partial match card, got: "${partialCardText}"`
      );

      // Case B: Add final missing component -> all BOM components are selected, project MUST appear in Tam uyğun
      const fullMatchPromise = page
        .waitForResponse(
          (res: Response) =>
            res.url().includes('/projects/match-components') && res.request().method() === 'POST',
          { timeout: 8000 }
        )
        .catch(() => null);
      await addComponentInPicker(page, missingEntry.component.name);
      const fullMatchResp = await fullMatchPromise;
      if (fullMatchResp) {
        assert(fullMatchResp.ok(), `Expected 2xx match response, got ${fullMatchResp.status()}`);
      }
      await searchInput.fill('');
      await page.waitForTimeout(400);

      assert.equal(
        matchedBomComponents.length,
        targetProject.components.length,
        'Expected all BOM components of targetProject to be selected for Full Match verification'
      );

      const fullHeading = main.getByText(/Tam uyğun/i).first();
      assert(await fullHeading.isVisible(), 'Expected "Tam uyğun" section after selecting all required components');

      const fullCard = main
        .locator('article, section, div')
        .filter({ hasText: new RegExp(escapeRegex(targetProject.title), 'i') })
        .filter({ hasText: new RegExp(`${targetProject.components.length}/${targetProject.components.length}`, 'i') })
        .last();
      await fullCard.waitFor({ state: 'visible' });

      // Click matched project link -> navigates to /projects/:slug
      const projectLink = main
        .locator(`a[href="/projects/${targetProject.slug}"]`)
        .or(main.getByRole('link', { name: new RegExp(escapeRegex(targetProject.title), 'i') }))
        .first();
      assert((await projectLink.count()) > 0, `Expected clickable link to /projects/${targetProject.slug}`);
      await projectLink.click();
      await page.waitForURL((u: URL) => u.pathname.includes(`/projects/${targetProject.slug}`));

      assertNoDiagnostics(diagnostics, '/component-finder partial vs full match');
    });
  });

  it('Filters matched projects by Domain, Price and Difficulty and resets cleanly', async () => {
    const { targetProject, matchedBomComponents } = await fetchSeededComponentsAndTargetProject();

    await withPage(browser, { viewport: { width: 1440, height: 900 } }, async (page, diagnostics) => {
      await navigateAndWaitReady(page, '/component-finder');
      const main = page.locator('main').first();

      for (const item of matchedBomComponents) {
        const matchRespPromise = page
          .waitForResponse(
            (r: Response) =>
              r.url().includes('/projects/match-components') && r.request().method() === 'POST',
            { timeout: 8000 }
          )
          .catch(() => null);
        await addComponentInPicker(page, item.component.name);
        const matchResp = await matchRespPromise;
        if (matchResp) {
          assert(matchResp.ok(), `Expected 2xx match response, got ${matchResp.status()}`);
        }
      }

      const searchInput = main
        .locator('input[type="search"], input[type="text"], input:not([type])')
        .first();
      await searchInput.fill('');
      await page.waitForTimeout(350);

      // Verify targetProject appears before filtering
      const baselineTitleVisible = await main
        .getByText(new RegExp(escapeRegex(targetProject.title), 'i'))
        .first()
        .isVisible();
      assert(
        baselineTitleVisible,
        `Expected targetProject "${targetProject.title}" to appear in match results before applying filters`
      );

      // Verify Domain, Price, and Difficulty filter controls exist
      const pageText = await main.innerText();
      assert(
        /(Sahə|Sahələr)/i.test(pageText) && /(Qiymət)/i.test(pageText) && /(Çətinlik)/i.test(pageText),
        'Expected Domain ("Sahə"), Price ("Qiymət"), and Difficulty ("Çətinlik") filter controls on /component-finder'
      );

      const selects = main.locator('select');
      const selectCount = await selects.count();
      const targetIsFree =
        targetProject.isFree === true ||
        targetProject.price === 0 ||
        targetProject.priceAzn === 0;

      // Helper to apply a filter either via matching <select> option or button
      const applyFilterChoice = async (
        optionMatchers: RegExp[],
        buttonMatchers: RegExp[]
      ): Promise<boolean> => {
        for (let i = 0; i < selectCount; i++) {
          const sel = selects.nth(i);
          const options: Array<{ value: string; text: string }> = await sel
            .locator('option')
            .evaluateAll((opts: Element[]) =>
              opts.map((o: Element) => ({ value: (o as HTMLOptionElement).value, text: (o.textContent || '').trim() }))
            );
          const matchOpt = options.find((o) =>
            optionMatchers.some((re) => re.test(o.value) || re.test(o.text))
          );
          if (matchOpt) {
            const respPromise = page.waitForResponse(
              (r: Response) =>
                r.url().includes('/projects/match-components') && r.request().method() === 'POST',
              { timeout: 8000 }
            );
            await sel.selectOption(matchOpt.value);
            const resp = await respPromise;
            assert(resp.ok(), `Expected 2xx match response, got ${resp.status()}`);
            await page.waitForTimeout(250);
            return true;
          }
        }

        for (const re of buttonMatchers) {
          const btn = main.getByRole('button', { name: re }).first();
          if ((await btn.count()) > 0 && (await btn.isVisible())) {
            const respPromise = page
              .waitForResponse(
                (r: Response) =>
                  r.url().includes('/projects/match-components') && r.request().method() === 'POST',
                { timeout: 6000 }
              )
              .catch(() => null);
            await btn.click();
            const resp = await respPromise;
            if (resp) assert(resp.ok(), `Expected 2xx match response, got ${resp.status()}`);
            await page.waitForTimeout(250);
            return true;
          }
        }
        return false;
      };

      // 1. Price filter: apply contradictory price filter (e.g. Pulsuz when project is paid, or Ödənişli when free)
      const priceApplied = await applyFilterChoice(
        targetIsFree ? [/^paid$/i, /ödənişli/i] : [/^free$/i, /pulsuz/i],
        targetIsFree ? [/Ödənişli/i] : [/Pulsuz/i]
      );
      assert(priceApplied, 'Expected interactive Price filter control ("Pulsuz" / "Ödənişli") on /component-finder');

      const titleVisibleAfterContradictoryPrice = await main
        .getByText(new RegExp(escapeRegex(targetProject.title), 'i'))
        .first()
        .isVisible()
        .catch(() => false);
      assert.equal(
        titleVisibleAfterContradictoryPrice,
        false,
        `Expected contradictory price filter to exclude "${targetProject.title}" from displayed match results`
      );

      // 2. Reset filters and verify targetProject returns
      const resetBtn = main
        .getByRole('button', { name: /Filtrləri sıfırla|Sıfırla|Təmizlə/i })
        .first();
      if ((await resetBtn.count()) > 0 && (await resetBtn.isVisible())) {
        await resetBtn.click();
        await page.waitForTimeout(300);
      } else {
        for (let i = 0; i < selectCount; i++) {
          const sel = selects.nth(i);
          const firstOpt = await sel.locator('option').first().getAttribute('value');
          if (firstOpt !== null) {
            await sel.selectOption(firstOpt);
          }
        }
        await page.waitForTimeout(300);
      }

      assert(
        await main.getByText(new RegExp(escapeRegex(targetProject.title), 'i')).first().isVisible(),
        `Expected "${targetProject.title}" to reappear after resetting filters`
      );

      // 3. Difficulty filter: apply contradictory difficulty, verify exclusion, then reset
      const diffIsBeginner = targetProject.difficulty === 'BEGINNER';
      const diffApplied = await applyFilterChoice(
        diffIsBeginner ? [/^ADVANCED$/i, /İrəli|Çətin/i] : [/^BEGINNER$/i, /Başlanğıc/i],
        diffIsBeginner ? [/İrəli|Çətin/i] : [/Başlanğıc/i]
      );
      assert(diffApplied, 'Expected interactive Difficulty filter control ("Başlanğıc" / "İrəli") on /component-finder');

      const titleVisibleAfterContradictoryDiff = await main
        .getByText(new RegExp(escapeRegex(targetProject.title), 'i'))
        .first()
        .isVisible()
        .catch(() => false);
      assert.equal(
        titleVisibleAfterContradictoryDiff,
        false,
        `Expected contradictory difficulty filter to exclude "${targetProject.title}" from displayed match results`
      );

      // Reset again
      if ((await resetBtn.count()) > 0 && (await resetBtn.isVisible())) {
        await resetBtn.click();
        await page.waitForTimeout(300);
      } else {
        for (let i = 0; i < selectCount; i++) {
          const sel = selects.nth(i);
          const firstOpt = await sel.locator('option').first().getAttribute('value');
          if (firstOpt !== null) {
            await sel.selectOption(firstOpt);
          }
        }
        await page.waitForTimeout(300);
      }

      // 4. Domain filter: apply targetProject's own domain (if present) and verify it stays matched
      if (targetProject.domains && targetProject.domains.length > 0) {
        const targetDomain = targetProject.domains[0];
        const domainRegex = new RegExp(escapeRegex(targetDomain), 'i');
        const domainApplied = await applyFilterChoice([domainRegex], [domainRegex]);
        assert(domainApplied, `Expected interactive Domain filter control supporting "${targetDomain}"`);
        assert(
          await main.getByText(new RegExp(escapeRegex(targetProject.title), 'i')).first().isVisible(),
          `Expected "${targetProject.title}" to remain visible when filtering by its own domain "${targetDomain}"`
        );
      }

      const mainTextAfterReset = await main.innerText();
      assert(
        /(Tam uyğun|Qismən uyğun)/i.test(mainTextAfterReset),
        'Expected match sections to remain rendered cleanly after filter verification'
      );

      assertNoDiagnostics(diagnostics, '/component-finder filters & reset');
    });
  });
});
