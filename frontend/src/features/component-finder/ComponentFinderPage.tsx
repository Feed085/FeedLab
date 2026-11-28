import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import { RevealSection } from '@/components/common/RevealSection';
import { COMPONENT_FINDER_COPY, DEFAULT_FINDER_FILTERS } from './constants';
import {
  buildMatchPayloadFromFilters,
  normalizeComponentKey,
} from './componentFinder.api';
import { useComponentCatalog } from './hooks/useComponentCatalog';
import { useMatchProjects } from './hooks/useMatchProjects';
import { ComponentPicker } from './components/ComponentPicker';
import { SelectedComponentsTray } from './components/SelectedComponentsTray';
import { FinderFiltersBar } from './components/FinderFiltersBar';
import { MatchResultsSection } from './components/MatchResultsSection';
import type { FinderFilters, SelectedComponentItem } from './types';

function parseInitialSelectedFromUrl(searchParams: URLSearchParams): SelectedComponentItem[] {
  const raw = searchParams.get('components');
  if (!raw) return [];

  const seen = new Set<string>();
  const items: SelectedComponentItem[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = normalizeComponentKey(trimmed);
    if (!seen.has(key)) {
      seen.add(key);
      items.push({
        slug: trimmed,
        name: trimmed,
      });
    }
  }
  return items;
}

export const ComponentFinderPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [selectedComponents, setSelectedComponents] = useState<SelectedComponentItem[]>(() =>
    parseInitialSelectedFromUrl(searchParams),
  );
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [filters, setFilters] = useState<FinderFilters>(DEFAULT_FINDER_FILTERS);

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useComponentCatalog({ fetchAll: true });

  const catalogItems = catalogData?.items || [];
  const catalogCategories = catalogData?.categories || [];

  // Enrich URL-preselected items with human-readable catalog names once catalog loads
  useEffect(() => {
    if (catalogItems.length === 0 || selectedComponents.length === 0) return;

    const byKey = new Map<string, { slug: string; name: string; category: string; categoryLabel: string }>();
    for (const item of catalogItems) {
      byKey.set(normalizeComponentKey(item.slug), item);
      byKey.set(normalizeComponentKey(item.name), item);
      for (const alias of item.aliases || []) {
        byKey.set(normalizeComponentKey(alias), item);
      }
    }

    setSelectedComponents((prev) => {
      let changed = false;
      const next = prev.map((sel) => {
        const match = byKey.get(normalizeComponentKey(sel.slug));
        if (match && (sel.name !== match.name || sel.slug !== match.slug)) {
          changed = true;
          return {
            slug: match.slug,
            name: match.name,
            category: match.category,
            categoryLabel: match.categoryLabel,
          };
        }
        return sel;
      });
      return changed ? next : prev;
    });
  }, [catalogItems, selectedComponents.length]);

  const catalogSlugMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of catalogItems) {
      map[normalizeComponentKey(item.slug)] = item.slug;
      map[normalizeComponentKey(item.name)] = item.slug;
      for (const alias of item.aliases || []) {
        map[normalizeComponentKey(alias)] = item.slug;
      }
    }
    return map;
  }, [catalogItems]);

  const filteredCatalogItems = useMemo(() => {
    const normalizedQ = normalizeComponentKey(pickerSearch);
    const normalizedCat = pickerCategory.trim().toLowerCase();

    return catalogItems.filter((item) => {
      if (normalizedCat && normalizedCat !== 'all') {
        if ((item.category || '').trim().toLowerCase() !== normalizedCat) {
          return false;
        }
      }

      if (normalizedQ.length > 0) {
        const haystack = [
          item.name,
          item.slug,
          item.categoryLabel,
          item.shortDescription,
          ...(item.aliases || []),
        ]
          .filter(Boolean)
          .map((s) => normalizeComponentKey(s))
          .join(' ');

        if (!haystack.includes(normalizedQ)) {
          return false;
        }
      }

      return true;
    });
  }, [catalogItems, pickerCategory, pickerSearch]);

  const selectedSlugsSet = useMemo(
    () => new Set(selectedComponents.map((c) => normalizeComponentKey(c.slug))),
    [selectedComponents],
  );

  const selectedTokens = useMemo(
    () => selectedComponents.map((c) => c.slug),
    [selectedComponents],
  );

  const { payload: matchPayload, priceError } = useMemo(
    () => buildMatchPayloadFromFilters(selectedTokens, filters),
    [selectedTokens, filters],
  );

  const hasActiveFilters =
    filters.domain !== '' ||
    filters.priceType !== 'all' ||
    filters.minPrice.trim() !== '' ||
    filters.maxPrice.trim() !== '' ||
    filters.difficulty !== '';

  const {
    data: matchData,
    isLoading: isMatchLoading,
    isFetching: isMatchFetching,
    isError: isMatchError,
    refetch: refetchMatches,
  } = useMatchProjects(matchPayload, {
    hasValidationError: Boolean(priceError),
  });

  const handleAddComponent = (item: SelectedComponentItem) => {
    const key = normalizeComponentKey(item.slug);
    setSelectedComponents((prev) => {
      if (prev.some((existing) => normalizeComponentKey(existing.slug) === key)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleRemoveComponent = (slug: string) => {
    const key = normalizeComponentKey(slug);
    setSelectedComponents((prev) =>
      prev.filter((item) => normalizeComponentKey(item.slug) !== key),
    );
  };

  const handleClearAllComponents = () => {
    setSelectedComponents([]);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FINDER_FILTERS);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      {/* Page Hero Banner */}
      <div className="bg-gradient-to-b from-[#EEF4FB] via-[#F3F7FC] to-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <RevealSection>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/70 mb-3">
                <Cpu className="w-3.5 h-3.5" />
                <span>{COMPONENT_FINDER_COPY.badge}</span>
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2.5">
                {COMPONENT_FINDER_COPY.pageTitle}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {COMPONENT_FINDER_COPY.pageSubtitle}
              </p>
            </div>
          </RevealSection>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Selected Tray & Component Picker */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5 min-w-0">
            <SelectedComponentsTray
              selectedComponents={selectedComponents}
              onRemoveComponent={handleRemoveComponent}
              onClearAll={handleClearAllComponents}
            />

            <ComponentPicker
              components={filteredCatalogItems}
              categories={catalogCategories}
              selectedSlugs={selectedSlugsSet}
              searchQuery={pickerSearch}
              onSearchChange={setPickerSearch}
              selectedCategory={pickerCategory}
              onSelectCategory={setPickerCategory}
              onAddComponent={handleAddComponent}
              onRemoveComponent={handleRemoveComponent}
              isLoading={isCatalogLoading}
              isError={isCatalogError}
              onRetry={() => {
                void refetchCatalog();
              }}
            />
          </div>

          {/* Right Column: Filters & Match Results */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
            <FinderFiltersBar
              filters={filters}
              priceError={priceError}
              hasActiveFilters={hasActiveFilters}
              onChangeFilters={setFilters}
              onResetFilters={handleResetFilters}
            />

            <MatchResultsSection
              selectedCount={selectedComponents.length}
              data={matchData}
              isLoading={isMatchLoading}
              isFetching={isMatchFetching}
              isError={isMatchError}
              priceError={priceError}
              hasActiveFilters={hasActiveFilters}
              catalogSlugMap={catalogSlugMap}
              onResetFilters={handleResetFilters}
              onRetry={() => {
                void refetchMatches();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentFinderPage;
