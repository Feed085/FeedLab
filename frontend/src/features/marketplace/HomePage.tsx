import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Gift } from 'lucide-react';
import { RevealSection } from '@/components/common/RevealSection';
import { HeroBanner } from './components/HeroBanner';
import { CategoryCard } from './components/CategoryCard';
import { ProjectCard } from './components/ProjectCard';
import { useCategories } from './hooks/useCategories';
import { useProjects } from './hooks/useProjects';
import { az } from '@/i18n/az';

export const HomePage: React.FC = () => {
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: featuredData, isLoading: isLoadingFeatured } = useProjects({
    sort: 'popular',
    limit: 3,
  });
  const { data: latestData, isLoading: isLoadingLatest } = useProjects({
    sort: 'newest',
    limit: 6,
  });

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories
      .filter((cat) => {
        const key = (cat.slug || cat.name).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [categories]);

  const featuredProjects = (featuredData?.data || []).slice(0, 3);
  const latestProjects = (latestData?.data || []).slice(0, 6);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* 4x2 Category Grid */}
        <RevealSection as="section">
          <h2 className="sr-only">{az.categories.title}</h2>
          {isLoadingCategories ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] bg-white border border-slate-200 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {uniqueCategories.map((cat) => (
                <CategoryCard key={cat._id || cat.slug} category={cat} />
              ))}
            </div>
          )}
        </RevealSection>

        {/* Featured Projects (3-column grid matching reference UI) */}
        <RevealSection as="section" delayMs={80}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {az.marketplace.featuredTitle}
            </h2>
            <Link
              to="/catalog?sort=popular"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#147DF5] hover:text-[#0C64E1] transition-colors flex-shrink-0"
            >
              <span>{az.marketplace.viewAll}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 bg-white border border-slate-200 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredProjects.map((project) => (
                <ProjectCard key={project._id || project.slug} project={project} />
              ))}
            </div>
          )}
        </RevealSection>

        {/* Light Free Projects Callout */}
        <RevealSection
          as="section"
          delayMs={100}
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-card relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-3">
                <Gift className="w-3.5 h-3.5" />
                <span>0 AZN • Tam Açıq Mənbə</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                {az.marketplace.freePromo.title}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                {az.marketplace.freePromo.subtitle}
              </p>
            </div>
            <Link
              to="/catalog?freeOnly=true"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#147DF5] hover:bg-[#0C64E1] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex-shrink-0"
            >
              <span>{az.marketplace.freePromo.action}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealSection>

        {/* Latest Projects */}
        <RevealSection as="section" delayMs={120}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147DF5] mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>YENİ DƏRC OLUNANLAR</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {az.marketplace.latestTitle}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {az.marketplace.latestSubtitle}
              </p>
            </div>
            <Link
              to="/catalog?sort=newest"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#147DF5] hover:text-[#0C64E1] transition-colors flex-shrink-0"
            >
              <span>{az.marketplace.viewAll}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoadingLatest ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 bg-white border border-slate-200 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestProjects.map((project) => (
                <ProjectCard key={project._id || project.slug} project={project} />
              ))}
            </div>
          )}
        </RevealSection>
      </div>
    </div>
  );
};
