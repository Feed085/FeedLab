import React from 'react';
import { RotateCcw, X, Filter } from 'lucide-react';
import { az } from '@/i18n/az';
import {
  PROJECT_DOMAINS,
  PROJECT_DIFFICULTIES,
  type Category,
  type Technology,
  type ProjectDifficulty,
} from '../types';

interface FilterSidebarProps {
  categories: Category[];
  technologies: Technology[];
  selectedCategory?: string;
  onSelectCategory: (slug?: string) => void;
  selectedTech?: string;
  onSelectTech: (slug?: string) => void;
  selectedDomain?: string;
  onSelectDomain?: (domain?: string) => void;
  selectedDifficulty?: ProjectDifficulty;
  onSelectDifficulty?: (difficulty?: ProjectDifficulty) => void;
  priceRange: { min?: number; max?: number };
  onPriceRangeChange: (min?: number, max?: number) => void;
  freeOnly: boolean;
  onToggleFreeOnly: (val: boolean) => void;
  onResetFilters: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  technologies,
  selectedCategory,
  onSelectCategory,
  selectedTech,
  onSelectTech,
  selectedDomain,
  onSelectDomain,
  selectedDifficulty,
  onSelectDifficulty,
  priceRange,
  onPriceRangeChange,
  freeOnly,
  onToggleFreeOnly,
  onResetFilters,
  isOpenMobile,
  onCloseMobile,
}) => {
  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-600" />
          <h3 className="font-bold text-slate-900 text-base">{az.marketplace.filterTitle}</h3>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{az.marketplace.clearFilters}</span>
        </button>
      </div>

      {/* Free Only Toggle */}
      <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
        <span className="text-sm font-semibold text-emerald-950">
          {az.marketplace.freeOnly}
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => onToggleFreeOnly(e.target.checked)}
            className="sr-only peer"
            aria-label={az.marketplace.freeOnly}
          />
          <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          {az.nav.categories}
        </h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectCategory(undefined)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              !selectedCategory
                ? 'bg-brand-50 text-brand-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{az.marketplace.allCategories}</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id || cat.slug}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                selectedCategory === cat.slug
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          {az.marketplace.priceRange}
        </h4>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">
              {az.marketplace.minPrice}
            </label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={priceRange.min !== undefined ? priceRange.min : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                onPriceRangeChange(val, priceRange.max);
              }}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">
              {az.marketplace.maxPrice}
            </label>
            <input
              type="number"
              min={0}
              placeholder="Maks"
              value={priceRange.max !== undefined ? priceRange.max : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                onPriceRangeChange(priceRange.min, val);
              }}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Price Presets */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onPriceRangeChange(undefined, undefined)}
            className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
          >
            {az.common.all}
          </button>
          <button
            type="button"
            onClick={() => onPriceRangeChange(0, 0)}
            className="text-[11px] px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md"
          >
            0 AZN
          </button>
          <button
            type="button"
            onClick={() => onPriceRangeChange(undefined, 20)}
            className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
          >
            &lt; 20 AZN
          </button>
          <button
            type="button"
            onClick={() => onPriceRangeChange(20, 50)}
            className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
          >
            20 - 50 AZN
          </button>
          <button
            type="button"
            onClick={() => onPriceRangeChange(50, undefined)}
            className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
          >
            50+ AZN
          </button>
        </div>
      </div>

      {/* Technologies */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          {az.marketplace.allTechnologies}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {technologies.map((tech) => {
            const isSelected = selectedTech === tech.slug;
            return (
              <button
                key={tech._id || tech.slug}
                type="button"
                onClick={() => onSelectTech(isSelected ? undefined : tech.slug)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white font-medium shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tech.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Domains (Sahə) */}
      {onSelectDomain && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {az.marketplace.domains}
          </h4>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectDomain(undefined)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                !selectedDomain
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {az.marketplace.allDomains}
            </button>
            {PROJECT_DOMAINS.map((domain) => {
              const isSelected = selectedDomain === domain;
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => onSelectDomain(isSelected ? undefined : domain)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {domain}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Difficulty (Çətinlik səviyyəsi) */}
      {onSelectDifficulty && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {az.marketplace.difficulty}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSelectDifficulty(undefined)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                !selectedDifficulty
                  ? 'bg-brand-600 text-white font-medium shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {az.common.all}
            </button>
            {PROJECT_DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => onSelectDifficulty(isSelected ? undefined : diff)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white font-medium shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {az.marketplace.difficulties[diff]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Aside */}
      <aside className="hidden md:block w-64 flex-shrink-0 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm self-start">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative ml-auto w-full max-w-xs h-full bg-white p-6 shadow-xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">{az.marketplace.filterTitle}</h3>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {content}
            </div>
            <div className="pt-6 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-medium text-sm"
              >
                Nəticələri göstər
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
