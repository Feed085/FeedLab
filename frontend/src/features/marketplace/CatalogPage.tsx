import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, Cpu } from 'lucide-react';
import { ProjectCard } from './components/ProjectCard';
import { FilterSidebar } from './components/FilterSidebar';
import { EmptyState } from './components/EmptyState';
import { useCategories } from './hooks/useCategories';
import { useTechnologies } from './hooks/useTechnologies';
import { useProjects } from './hooks/useProjects';
import { az } from '@/i18n/az';
import { PROJECT_DIFFICULTIES, type ProjectDifficulty, type ProjectSortOption } from './types';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract params from URL
  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || undefined;
  const techParam = searchParams.get('tech') || undefined;
  const domainParam = searchParams.get('domain') || undefined;
  const rawDifficulty = searchParams.get('difficulty');
  const difficultyParam = PROJECT_DIFFICULTIES.includes(rawDifficulty as ProjectDifficulty)
    ? (rawDifficulty as ProjectDifficulty)
    : undefined;
  const componentParam = searchParams.get('component') || undefined;
  const minPriceParam = searchParams.get('minPrice')
    ? Number(searchParams.get('minPrice'))
    : undefined;
  const maxPriceParam = searchParams.get('maxPrice')
    ? Number(searchParams.get('maxPrice'))
    : undefined;
  const freeOnlyParam = searchParams.get('freeOnly') === 'true';
  const sortParam = (searchParams.get('sort') as ProjectSortOption) || 'newest';
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);

  // Local search input state for debounce
  const [searchInput, setSearchInput] = useState(qParam);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Synchronize local search input if URL changes
  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Debounced search update
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== qParam) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput.trim()) {
            next.set('q', searchInput.trim());
          } else {
            next.delete('q');
          }
          next.set('page', '1');
          return next;
        });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput, qParam, setSearchParams]);

  // Query categories & technologies
  const { data: categories = [] } = useCategories();
  const { data: technologies = [] } = useTechnologies();

  // Query projects
  const { data: projectResponse, isLoading, isPlaceholderData } = useProjects({
    q: qParam || undefined,
    category: categoryParam,
    tech: techParam,
    domain: domainParam,
    difficulty: difficultyParam,
    component: componentParam,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    freeOnly: freeOnlyParam,
    sort: sortParam,
    page: pageParam,
    limit: 12,
  });

  const projects = projectResponse?.data || [];
  const meta = projectResponse?.meta || { total: 0, page: 1, limit: 12, pages: 1 };

  // Filter Handlers
  const handleSelectCategory = (slug?: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) {
        next.set('category', slug);
      } else {
        next.delete('category');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleSelectTech = (slug?: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) {
        next.set('tech', slug);
      } else {
        next.delete('tech');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleSelectDomain = (domain?: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (domain) {
        next.set('domain', domain);
      } else {
        next.delete('domain');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleSelectDifficulty = (difficulty?: ProjectDifficulty) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (difficulty) {
        next.set('difficulty', difficulty);
      } else {
        next.delete('difficulty');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleClearComponent = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('component');
      next.set('page', '1');
      return next;
    });
  };

  const handlePriceRangeChange = (min?: number, max?: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (min !== undefined) {
        next.set('minPrice', String(min));
      } else {
        next.delete('minPrice');
      }
      if (max !== undefined) {
        next.set('maxPrice', String(max));
      } else {
        next.delete('maxPrice');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleToggleFreeOnly = (val: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set('freeOnly', 'true');
        next.delete('minPrice');
        next.delete('maxPrice');
      } else {
        next.delete('freeOnly');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleSortChange = (newSort: ProjectSortOption) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sort', newSort);
      next.set('page', '1');
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {az.marketplace.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {az.marketplace.resultsCount.replace('{count}', String(meta.total))}
          </p>
        </div>

        {/* Search Bar on Catalog */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={az.marketplace.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#147DF5]/20 focus:border-[#147DF5] shadow-sm"
          />
        </div>
      </div>

      {/* Main Layout: Sidebar & Content */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar & Mobile Drawer */}
        <FilterSidebar
          categories={categories}
          technologies={technologies}
          selectedCategory={categoryParam}
          onSelectCategory={handleSelectCategory}
          selectedTech={techParam}
          onSelectTech={handleSelectTech}
          selectedDomain={domainParam}
          onSelectDomain={handleSelectDomain}
          selectedDifficulty={difficultyParam}
          onSelectDifficulty={handleSelectDifficulty}
          priceRange={{ min: minPriceParam, max: maxPriceParam }}
          onPriceRangeChange={handlePriceRangeChange}
          freeOnly={freeOnlyParam}
          onToggleFreeOnly={handleToggleFreeOnly}
          onResetFilters={handleResetFilters}
          isOpenMobile={isMobileFiltersOpen}
          onCloseMobile={() => setIsMobileFiltersOpen(false)}
        />

        {/* Right Content Area */}
        <div className="flex-1 space-y-6">
          {/* Active Component Filter Pill (e.g. from Library or Component Finder) */}
          {componentParam && (
            <div className="flex flex-wrap items-center gap-2 bg-brand-50/70 border border-brand-200 rounded-xl px-4 py-2.5 text-xs text-brand-900">
              <Cpu className="w-4 h-4 text-[#147DF5] flex-shrink-0" />
              <span className="font-semibold">{az.marketplace.componentFilter}:</span>
              <span className="px-2 py-0.5 bg-white border border-brand-200 rounded-md font-bold text-[#147DF5]">
                {componentParam}
              </span>
              <button
                type="button"
                onClick={handleClearComponent}
                aria-label={az.marketplace.clearComponentFilter}
                className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-colors font-medium"
              >
                <X className="w-3.5 h-3.5" />
                <span>{az.common.clearFilters}</span>
              </button>
            </div>
          )}

          {/* Subheader: Mobile Filter Trigger & Sort dropdown */}
          <div className="flex items-center justify-between bg-white p-3.5 border border-slate-200 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="flex md:hidden items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{az.marketplace.filterTitle}</span>
            </button>

            <div className="hidden md:block text-xs font-medium text-slate-500">
              Səhifə {meta.page} / {Math.max(1, meta.pages)}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <label
                htmlFor="sort-select"
                className="text-xs font-semibold text-slate-600 hidden sm:inline"
              >
                {az.marketplace.sort.label}:
              </label>
              <select
                id="sort-select"
                value={sortParam}
                onChange={(e) => handleSortChange(e.target.value as ProjectSortOption)}
                aria-label={az.marketplace.sort.label}
                className="px-3 py-1.5 bg-slate-50 text-slate-800 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-[#147DF5] cursor-pointer"
              >
                <option value="newest">{az.marketplace.sort.newest}</option>
                <option value="popular">{az.marketplace.sort.popular}</option>
                <option value="price_asc">{az.marketplace.sort.priceAsc}</option>
                <option value="price_desc">{az.marketplace.sort.priceDesc}</option>
              </select>
            </div>
          </div>

          {/* Project Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onReset={handleResetFilters} />
          ) : (
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${
                isPlaceholderData ? 'opacity-60' : ''
              }`}
            >
              {projects.map((project) => (
                <ProjectCard key={project._id || project.slug} project={project} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handlePageChange(meta.page - 1)}
                disabled={meta.page <= 1}
                aria-label="Əvvəlki səhifə"
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(meta.pages)].map((_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === meta.page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => handlePageChange(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(meta.page + 1)}
                disabled={meta.page >= meta.pages}
                aria-label="Növbəti səhifə"
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
