import React from 'react';
import { AlertCircle, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  COMPONENT_FINDER_COPY,
  DIFFICULTY_OPTIONS,
  PRICE_TYPE_OPTIONS,
  PROJECT_DOMAINS,
} from '../constants';
import type { FinderFilters, PriceType, ProjectDifficulty } from '../types';

export interface FinderFiltersBarProps {
  filters: FinderFilters;
  priceError: string | null;
  hasActiveFilters: boolean;
  onChangeFilters: (updater: (prev: FinderFilters) => FinderFilters) => void;
  onResetFilters: () => void;
}

export const FinderFiltersBar: React.FC<FinderFiltersBarProps> = ({
  filters,
  priceError,
  hasActiveFilters,
  onChangeFilters,
  onResetFilters,
}) => {
  const isFreeSelected = filters.priceType === 'free';

  const handleDomainChange = (domain: string) => {
    onChangeFilters((prev) => ({
      ...prev,
      domain,
    }));
  };

  const handlePriceTypeChange = (priceType: PriceType) => {
    onChangeFilters((prev) => ({
      ...prev,
      priceType,
      minPrice: priceType === 'free' ? '' : prev.minPrice,
      maxPrice: priceType === 'free' ? '' : prev.maxPrice,
    }));
  };

  const handleDifficultyChange = (difficulty: '' | ProjectDifficulty) => {
    onChangeFilters((prev) => ({
      ...prev,
      difficulty,
    }));
  };

  const handleMinPriceChange = (minPrice: string) => {
    onChangeFilters((prev) => ({
      ...prev,
      minPrice,
    }));
  };

  const handleMaxPriceChange = (maxPrice: string) => {
    onChangeFilters((prev) => ({
      ...prev,
      maxPrice,
    }));
  };

  return (
    <section
      aria-label={COMPONENT_FINDER_COPY.filtersTitle}
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-card"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand-600" />
          <h2 className="font-bold text-slate-900 text-base">
            {COMPONENT_FINDER_COPY.filtersTitle}
          </h2>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{COMPONENT_FINDER_COPY.resetFilters}</span>
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Domain Filter */}
        <div className="min-w-0">
          <label
            htmlFor="finder-domain-select"
            className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
          >
            {COMPONENT_FINDER_COPY.domainLabel}
          </label>
          <select
            id="finder-domain-select"
            value={filters.domain}
            onChange={(e) => handleDomainChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">{COMPONENT_FINDER_COPY.allDomains}</option>
            {PROJECT_DOMAINS.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="min-w-0">
          <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            {COMPONENT_FINDER_COPY.difficultyLabel}
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={COMPONENT_FINDER_COPY.difficultyLabel}>
            <button
              type="button"
              aria-pressed={filters.difficulty === ''}
              onClick={() => handleDifficultyChange('')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                filters.difficulty === ''
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {COMPONENT_FINDER_COPY.allDifficulties}
            </button>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={filters.difficulty === opt.value}
                onClick={() => handleDifficultyChange(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  filters.difficulty === opt.value
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Type & Optional Range */}
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            {COMPONENT_FINDER_COPY.priceLabel}
          </span>
          <div className="flex flex-wrap gap-1.5 mb-2.5" role="group" aria-label={COMPONENT_FINDER_COPY.priceLabel}>
            {PRICE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={filters.priceType === opt.value}
                onClick={() => handlePriceTypeChange(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  filters.priceType === opt.value
                    ? opt.value === 'free'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="finder-min-price" className="block text-[11px] text-slate-500 mb-1">
                {COMPONENT_FINDER_COPY.minPriceLabel}
              </label>
              <input
                id="finder-min-price"
                type="number"
                min={0}
                step="any"
                disabled={isFreeSelected}
                placeholder={COMPONENT_FINDER_COPY.minPricePlaceholder}
                value={isFreeSelected ? '' : filters.minPrice}
                onChange={(e) => handleMinPriceChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:bg-white focus:border-brand-500"
              />
            </div>

            <div>
              <label htmlFor="finder-max-price" className="block text-[11px] text-slate-500 mb-1">
                {COMPONENT_FINDER_COPY.maxPriceLabel}
              </label>
              <input
                id="finder-max-price"
                type="number"
                min={0}
                step="any"
                disabled={isFreeSelected}
                placeholder={COMPONENT_FINDER_COPY.maxPricePlaceholder}
                value={isFreeSelected ? '' : filters.maxPrice}
                onChange={(e) => handleMaxPriceChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:bg-white focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Price Validation Error */}
      {priceError && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{priceError}</span>
        </div>
      )}
    </section>
  );
};
