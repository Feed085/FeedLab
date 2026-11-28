import React from 'react';
import { AlertCircle, CheckCircle2, Cpu, Info, Puzzle, RotateCcw, SearchX } from 'lucide-react';
import { RevealSection } from '@/components/common/RevealSection';
import { COMPONENT_FINDER_COPY } from '../constants';
import { MatchResultCard } from './MatchResultCard';
import type { MatchComponentsResponse } from '../types';

export interface MatchResultsSectionProps {
  selectedCount: number;
  data?: MatchComponentsResponse;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  priceError: string | null;
  hasActiveFilters: boolean;
  catalogSlugMap?: Record<string, string>;
  onResetFilters: () => void;
  onRetry: () => void;
}

export const MatchResultsSection: React.FC<MatchResultsSectionProps> = ({
  selectedCount,
  data,
  isLoading,
  isFetching,
  isError,
  priceError,
  hasActiveFilters,
  catalogSlugMap,
  onResetFilters,
  onRetry,
}) => {
  if (selectedCount === 0) {
    return (
      <RevealSection as="section" className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-card">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
          <Cpu className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {COMPONENT_FINDER_COPY.emptySelectionTitle}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {COMPONENT_FINDER_COPY.emptySelectionGuidance}
        </p>
      </RevealSection>
    );
  }

  if (priceError) {
    return (
      <div
        role="alert"
        className="bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-card"
      >
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-base font-bold text-rose-900 mb-1">{priceError}</p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{COMPONENT_FINDER_COPY.resetFilters}</span>
          </button>
        )}
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-4" aria-label={COMPONENT_FINDER_COPY.resultsLoading}>
        <div className="h-12 rounded-2xl bg-slate-200/70 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((skeleton) => (
            <div
              key={skeleton}
              className="h-80 rounded-2xl bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-card">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {COMPONENT_FINDER_COPY.resultsErrorTitle}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
          {COMPONENT_FINDER_COPY.resultsErrorDesc}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-sm font-semibold transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{COMPONENT_FINDER_COPY.retry}</span>
        </button>
      </div>
    );
  }

  const fullMatches = data?.fullMatches || [];
  const partialMatches = data?.partialMatches || [];
  const totalFull = data?.totalFull ?? fullMatches.length;
  const totalPartial = data?.totalPartial ?? partialMatches.length;

  if (totalFull === 0 && totalPartial === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center shadow-card">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {COMPONENT_FINDER_COPY.noMatchesTitle}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          {COMPONENT_FINDER_COPY.noMatchesDesc}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{COMPONENT_FINDER_COPY.resetFilters}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-8 transition-opacity duration-200 ${isFetching ? 'opacity-80' : 'opacity-100'}`}>
      {/* Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
          <span>
            {COMPONENT_FINDER_COPY.summarySelectedLabel} {selectedCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {COMPONENT_FINDER_COPY.fullMatchesHeading}: {totalFull}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Puzzle className="w-3.5 h-3.5" />
            <span>
              {COMPONENT_FINDER_COPY.partialMatchesHeading}: {totalPartial}
            </span>
          </span>
        </div>
      </div>

      {/* Full Matches Section */}
      <RevealSection as="section" aria-label={COMPONENT_FINDER_COPY.fullMatchesHeading}>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {COMPONENT_FINDER_COPY.fullMatchesHeading} ({totalFull})
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {COMPONENT_FINDER_COPY.fullMatchesSubheading}
          </p>
        </div>

        {fullMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fullMatches.map((entry) => (
              <MatchResultCard
                key={entry.project._id || entry.project.slug}
                entry={entry}
                variant="full"
                catalogSlugMap={catalogSlugMap}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 flex items-center gap-3 text-xs sm:text-sm text-slate-600">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{COMPONENT_FINDER_COPY.noFullMatchesNote}</span>
          </div>
        )}
      </RevealSection>

      {/* Partial Matches Section */}
      {partialMatches.length > 0 && (
        <RevealSection
          as="section"
          delayMs={60}
          aria-label={COMPONENT_FINDER_COPY.partialMatchesHeading}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {COMPONENT_FINDER_COPY.partialMatchesHeading} ({totalPartial})
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {COMPONENT_FINDER_COPY.partialMatchesSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {partialMatches.map((entry) => (
              <MatchResultCard
                key={entry.project._id || entry.project.slug}
                entry={entry}
                variant="partial"
                catalogSlugMap={catalogSlugMap}
              />
            ))}
          </div>
        </RevealSection>
      )}
    </div>
  );
};
