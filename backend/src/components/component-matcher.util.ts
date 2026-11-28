export interface ComponentLike {
  _id?: { toString(): string } | string;
  slug: string;
  name: string;
  aliases?: string[];
  category?: string;
  categoryLabel?: string;
}

export interface BomItemLike {
  name?: string;
  componentSlug?: string | null;
}

export interface ComponentLookup {
  bySlug: Map<string, ComponentLike>;
  byId: Map<string, ComponentLike>;
  tokenToSlug: Map<string, string>;
  compactToSlug: Map<string, string>;
}

export function normalizeSlugToken(input: string): string {
  if (!input) return '';
  return String(input).trim().toLowerCase();
}

export function normalizeComponentToken(input: string): string {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactComponentToken(input: string): string {
  return normalizeComponentToken(input).replace(/\s+/g, '');
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildComponentLookup(components: ComponentLike[]): ComponentLookup {
  const bySlug = new Map<string, ComponentLike>();
  const byId = new Map<string, ComponentLike>();
  const tokenToSlug = new Map<string, string>();
  const compactToSlug = new Map<string, string>();

  const registerToken = (raw: string | undefined, slug: string) => {
    if (!raw) return;
    const norm = normalizeComponentToken(raw);
    const compact = compactComponentToken(raw);
    if (norm && !tokenToSlug.has(norm)) {
      tokenToSlug.set(norm, slug);
    }
    if (compact && !compactToSlug.has(compact)) {
      compactToSlug.set(compact, slug);
    }
  };

  for (const comp of components) {
    if (!comp || !comp.slug) continue;
    const slug = normalizeSlugToken(comp.slug);
    bySlug.set(slug, comp);
    if (comp._id) {
      byId.set(comp._id.toString(), comp);
    }

    registerToken(slug, slug);
    registerToken(comp.name, slug);

    if (Array.isArray(comp.aliases)) {
      for (const alias of comp.aliases) {
        registerToken(alias, slug);
      }
    }
  }

  return {
    bySlug,
    byId,
    tokenToSlug,
    compactToSlug,
  };
}

export function resolveTokenToSlug(rawToken: string, lookup: ComponentLookup): string | null {
  if (!rawToken || !rawToken.trim()) return null;
  const trimmed = rawToken.trim();
  const lower = normalizeSlugToken(trimmed);

  const byId = lookup.byId.get(trimmed);
  if (byId) return normalizeSlugToken(byId.slug);

  if (lookup.bySlug.has(lower)) return lower;

  const norm = normalizeComponentToken(trimmed);
  const compact = compactComponentToken(trimmed);

  if (norm && lookup.tokenToSlug.has(norm)) {
    return lookup.tokenToSlug.get(norm) || null;
  }
  if (compact && lookup.compactToSlug.has(compact)) {
    return lookup.compactToSlug.get(compact) || null;
  }

  return null;
}

export function resolveBomCanonicalKey(
  bom: BomItemLike,
  lookup: ComponentLookup,
): { canonicalKey: string; componentSlug: string | null } {
  if (bom.componentSlug && String(bom.componentSlug).trim()) {
    const rawSlug = normalizeSlugToken(String(bom.componentSlug));
    const resolvedSlug =
      lookup.bySlug.has(rawSlug)
        ? rawSlug
        : resolveTokenToSlug(rawSlug, lookup) || rawSlug;
    return { canonicalKey: resolvedSlug, componentSlug: resolvedSlug };
  }

  const rawName = (bom.name || '').trim();
  if (rawName) {
    const resolvedSlug = resolveTokenToSlug(rawName, lookup);
    if (resolvedSlug) {
      return { canonicalKey: resolvedSlug, componentSlug: resolvedSlug };
    }
    const norm = normalizeComponentToken(rawName);
    return {
      canonicalKey: norm || rawName.toLowerCase(),
      componentSlug: null,
    };
  }

  return { canonicalKey: '', componentSlug: null };
}

export interface ResolvedUserSelection {
  selectedSlugs: Set<string>;
  selectedRawSlugs: Set<string>;
  selectedRawNormalized: Set<string>;
  selectedRawCompact: Set<string>;
  canonicalSelections: string[];
}

export function resolveSelectedComponents(
  inputs: string[],
  lookup: ComponentLookup,
): ResolvedUserSelection {
  const selectedSlugs = new Set<string>();
  const selectedRawSlugs = new Set<string>();
  const selectedRawNormalized = new Set<string>();
  const selectedRawCompact = new Set<string>();
  const canonicalSelections: string[] = [];
  const seenCanonical = new Set<string>();

  for (const raw of inputs || []) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const resolvedSlug = resolveTokenToSlug(trimmed, lookup);
    if (resolvedSlug) {
      selectedSlugs.add(resolvedSlug);
      if (!seenCanonical.has(resolvedSlug)) {
        seenCanonical.add(resolvedSlug);
        canonicalSelections.push(resolvedSlug);
      }
      continue;
    }

    const lowerSlug = normalizeSlugToken(trimmed);
    const norm = normalizeComponentToken(trimmed);
    const compact = compactComponentToken(trimmed);
    if (lowerSlug) selectedRawSlugs.add(lowerSlug);
    if (norm) selectedRawNormalized.add(norm);
    if (compact) selectedRawCompact.add(compact);
    const label = norm || lowerSlug;
    if (!seenCanonical.has(label)) {
      seenCanonical.add(label);
      canonicalSelections.push(trimmed);
    }
  }

  return {
    selectedSlugs,
    selectedRawSlugs,
    selectedRawNormalized,
    selectedRawCompact,
    canonicalSelections,
  };
}

export function doesBomMatchSelection(
  bom: BomItemLike,
  canonical: { canonicalKey: string; componentSlug: string | null },
  selection: ResolvedUserSelection,
): boolean {
  // 1. Exact match via seeded Component collection lookup
  if (canonical.componentSlug && selection.selectedSlugs.has(canonical.componentSlug)) {
    return true;
  }

  // 2. Exact normalized BOMComponent.componentSlug match (handles unseeded custom componentSlug
  //    even when BOMComponent.name differs from componentSlug)
  const rawBomSlug = bom.componentSlug ? normalizeSlugToken(String(bom.componentSlug)) : '';
  const targetBomSlug = canonical.componentSlug || rawBomSlug;
  if (targetBomSlug) {
    if (selection.selectedRawSlugs.has(targetBomSlug)) {
      return true;
    }
    const bomSlugNorm = normalizeComponentToken(targetBomSlug);
    const bomSlugCompact = compactComponentToken(targetBomSlug);
    if (bomSlugNorm && selection.selectedRawNormalized.has(bomSlugNorm)) {
      return true;
    }
    if (bomSlugCompact && selection.selectedRawCompact.has(bomSlugCompact)) {
      return true;
    }
  }

  // 3. Exact normalized/compact BOMComponent.name equality against unseeded selected tokens
  const bomNorm = normalizeComponentToken(bom.name || '');
  const bomCompact = compactComponentToken(bom.name || '');

  if (bomNorm && selection.selectedRawNormalized.has(bomNorm)) {
    return true;
  }
  if (bomCompact && selection.selectedRawCompact.has(bomCompact)) {
    return true;
  }

  return false;
}

export function doesProjectUseComponent(
  projectComponents: BomItemLike[] | undefined,
  targetSlug: string,
  lookup: ComponentLookup,
): boolean {
  if (!Array.isArray(projectComponents) || projectComponents.length === 0) {
    return false;
  }
  const normalizedTarget = targetSlug.toLowerCase().trim();
  for (const bom of projectComponents) {
    const resolved = resolveBomCanonicalKey(bom, lookup);
    if (resolved.componentSlug === normalizedTarget || resolved.canonicalKey === normalizedTarget) {
      return true;
    }
  }
  return false;
}
