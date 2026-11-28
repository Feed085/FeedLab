import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Cpu, Plus, RotateCcw, Search, SearchX, X } from 'lucide-react';
import { COMPONENT_FINDER_COPY } from '../constants';
import { normalizeComponentKey } from '../componentFinder.api';
import type {
  ComponentCategoryFacet,
  ComponentSummary,
  SelectedComponentItem,
} from '../types';

export interface ComponentPickerProps {
  components: ComponentSummary[];
  categories: ComponentCategoryFacet[];
  selectedSlugs: Set<string>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (categoryKey: string) => void;
  onAddComponent: (item: SelectedComponentItem) => void;
  onRemoveComponent: (slug: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const ComponentPicker: React.FC<ComponentPickerProps> = ({
  components,
  categories,
  selectedSlugs,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onAddComponent,
  onRemoveComponent,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  const totalCatalogCount = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);
  const trimmedSearch = searchQuery.trim();
  const normalizedSearch = normalizeComponentKey(trimmedSearch);

  const canAddCustomTerm =
    trimmedSearch.length >= 2 &&
    !selectedSlugs.has(normalizedSearch) &&
    !components.some(
      (comp) =>
        normalizeComponentKey(comp.slug) === normalizedSearch ||
        normalizeComponentKey(comp.name) === normalizedSearch,
    );

  const handleAddCustom = () => {
    if (!trimmedSearch) return;
    onAddComponent({
      slug: trimmedSearch,
      name: trimmedSearch,
      isCustom: true,
    });
  };

  return (
    <section
      aria-label={COMPONENT_FINDER_COPY.pickerTitle}
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-card min-w-0"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
          <Cpu className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-base">
            {COMPONENT_FINDER_COPY.pickerTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {COMPONENT_FINDER_COPY.pickerSubtitle}
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3.5">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={COMPONENT_FINDER_COPY.searchPlaceholder}
          aria-label={COMPONENT_FINDER_COPY.pickerTitle}
          className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label={COMPONENT_FINDER_COPY.clearSearchAria}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Facet Pills */}
      <div
        className="flex flex-wrap gap-1.5 mb-4"
        role="tablist"
        aria-label={COMPONENT_FINDER_COPY.pickerTitle}
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === 'all'}
          onClick={() => onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedCategory === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {COMPONENT_FINDER_COPY.allCategories}
          {totalCatalogCount > 0 ? ` (${totalCatalogCount})` : ''}
        </button>

        {categories.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectCategory(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Component List */}
      {isLoading && components.length === 0 ? (
        <div className="space-y-2.5" aria-label={COMPONENT_FINDER_COPY.catalogLoading}>
          {[1, 2, 3, 4].map((skeleton) => (
            <div
              key={skeleton}
              className="h-20 rounded-xl bg-slate-100 animate-pulse border border-slate-200/70"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-center">
          <p className="text-sm font-bold text-rose-900 mb-1">
            {COMPONENT_FINDER_COPY.catalogErrorTitle}
          </p>
          <p className="text-xs text-rose-700 mb-3">
            {COMPONENT_FINDER_COPY.catalogErrorDesc}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {COMPONENT_FINDER_COPY.retry}
            </button>
          )}
        </div>
      ) : components.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
          <SearchX className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800 mb-1">
            {COMPONENT_FINDER_COPY.catalogEmptyTitle}
          </p>
          <p className="text-xs text-slate-500 mb-3">
            {COMPONENT_FINDER_COPY.catalogEmptyDesc}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(searchQuery.length > 0 || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onSelectCategory('all');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {COMPONENT_FINDER_COPY.resetPickerSearch}
              </button>
            )}
            {canAddCustomTerm && (
              <button
                type="button"
                onClick={handleAddCustom}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  "{trimmedSearch}" — {COMPONENT_FINDER_COPY.addCustomButton}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {components.map((component) => {
            const slugKey = normalizeComponentKey(component.slug);
            const isSelected = selectedSlugs.has(slugKey);

            return (
              <article
                key={component._id || component.slug}
                data-selected={isSelected ? 'true' : 'false'}
                className={`rounded-xl border p-3.5 transition-all min-w-0 ${
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <h3 className="font-bold text-sm text-slate-900 break-words">
                        {component.name}
                      </h3>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {component.categoryLabel}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                          <Check className="w-3 h-3" />
                          {COMPONENT_FINDER_COPY.selectedBadge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">
                      {component.shortDescription}
                    </p>

                    <Link
                      to={`/library/${component.slug}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>{COMPONENT_FINDER_COPY.viewInLibrary}</span>
                    </Link>
                  </div>

                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={() => onRemoveComponent(component.slug)}
                        aria-label={`${component.name} — ${COMPONENT_FINDER_COPY.removeComponent}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{COMPONENT_FINDER_COPY.removeComponent}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onAddComponent({
                            slug: component.slug,
                            name: component.name,
                            category: component.category,
                            categoryLabel: component.categoryLabel,
                          })
                        }
                        aria-label={`${component.name} — ${COMPONENT_FINDER_COPY.addComponent}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors"
                      >
                        <span>{COMPONENT_FINDER_COPY.addComponent}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {canAddCustomTerm && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddCustom}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 text-brand-700 hover:bg-brand-100/70 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  "{trimmedSearch}" — {COMPONENT_FINDER_COPY.addCustomButton}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
