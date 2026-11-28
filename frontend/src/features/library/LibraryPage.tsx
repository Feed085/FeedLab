import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cpu,
  GraduationCap,
  RotateCcw,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { RevealSection } from '@/components/common/RevealSection';
import { ComponentCard } from './components/ComponentCard';
import { useComponents } from './hooks/useLibrary';

const PAGE_LIMIT = 12;

export const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(qParam);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalizedInput = searchInput.trim();
      if (normalizedInput !== qParam) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (normalizedInput) {
            next.set('q', normalizedInput);
          } else {
            next.delete('q');
          }
          next.set('page', '1');
          return next;
        });
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, qParam, setSearchParams]);

  const { data, isLoading, isError, isPlaceholderData, refetch } = useComponents({
    q: qParam || undefined,
    category: categoryParam !== 'all' ? categoryParam : undefined,
    page: pageParam,
    limit: PAGE_LIMIT,
  });

  const items = data?.items || [];
  const categories = data?.categories || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.page ?? pageParam;

  const totalCatalogCount =
    categories.length > 0
      ? categories.reduce((sum, facet) => sum + (facet.count || 0), 0)
      : total;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedInput = searchInput.trim();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (normalizedInput) {
        next.set('q', normalizedInput);
      } else {
        next.delete('q');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleSelectCategory = (key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key && key !== 'all') {
        next.set('category', key);
      } else {
        next.delete('category');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Boolean(qParam || (categoryParam && categoryParam !== 'all'));

  return (
    <div className="bg-[#F8FAFC] min-h-[calc(100vh-12rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Educational Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#EEF4FB] via-[#F3F7FC] to-white p-6 sm:p-8 lg:p-10 shadow-card">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-blue-200 text-xs font-semibold text-[#0C64E1] shadow-xs">
              <GraduationCap className="w-4 h-4 text-[#147DF5]" />
              <span>Müəllim və Tələbələr üçün Öyrədici Bələdçi</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Elektronika Ensiklopediyası / Kitabxanası
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Mikrokontrollerlər, sensorlar, aktuatorlar və elektron modulların iş prinsipi,
              pinout sxemləri, qoşulma qaydaları və real dərs layihələrini bir məkanda öyrənin.
            </p>

            {/* Live Search Bar */}
            <form onSubmit={handleSearchSubmit} className="pt-2 max-w-xl">
              <div className="relative flex items-center bg-white border border-slate-200 focus-within:border-[#147DF5] rounded-xl shadow-sm transition-colors">
                <Search className="w-4 h-4 text-slate-400 ml-3.5 flex-shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Komponent adı, açar söz və ya funksiya axtarın (məs. ESP32, DHT22)..."
                  aria-label="Komponent axtarışı"
                  className="w-full px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    aria-label="Axtarışı təmizlə"
                    className="p-1.5 mr-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Axtar"
                  className="m-1.5 px-4 py-2 rounded-lg bg-[#147DF5] hover:bg-[#0C64E1] text-white text-xs sm:text-sm font-semibold transition-colors flex-shrink-0"
                >
                  Axtar
                </button>
              </div>
            </form>

            {/* Quick Summary Stats */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#147DF5]" />
                <span>{totalCatalogCount} aktiv komponent</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>8 hissəli strukturlaşdırılmış dərs materialı</span>
              </span>
            </div>
          </div>
        </section>

        {/* Category Filter Tabs */}
        <section aria-label="Kateqoriya filtrləri" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Kateqoriyalar
            </h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#147DF5] hover:text-[#0C64E1] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filtrləri təmizlə</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              aria-pressed={categoryParam === 'all'}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                categoryParam === 'all'
                  ? 'bg-[#147DF5] text-white border-[#147DF5] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#147DF5] hover:text-[#147DF5]'
              }`}
            >
              <span>Hamısı</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-md ${
                  categoryParam === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalCatalogCount}
              </span>
            </button>

            {categories.map((facet) => {
              const isSelected = categoryParam === facet.key;
              return (
                <button
                  key={facet.key}
                  type="button"
                  onClick={() => handleSelectCategory(facet.key)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                    isSelected
                      ? 'bg-[#147DF5] text-white border-[#147DF5] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#147DF5] hover:text-[#147DF5]'
                  }`}
                >
                  <span>{facet.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {facet.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Results Info Bar */}
        {!isLoading && !isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600">
            <span>
              <strong className="text-slate-900">{total}</strong> komponent tapıldı
              {qParam ? ` (“${qParam}” sorğusu üzrə)` : ''}
            </span>
            {totalPages > 1 && (
              <span className="text-xs font-medium text-slate-500">
                Səhifə {currentPage} / {totalPages}
              </span>
            )}
          </div>
        )}

        {/* Content Grid / States */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="h-80 bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-4"
              >
                <div className="h-36 bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4 shadow-card">
            <p className="text-base font-bold text-slate-900">
              Komponent siyahısını yükləmək mümkün olmadı
            </p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Serverlə əlaqə zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#147DF5] hover:bg-[#0C64E1] text-white text-sm font-semibold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Yenidən cəhd et</span>
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
              <SearchX className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Komponent tapılmadı</h3>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              Axtarış sorğunuza və ya seçilmiş kateqoriyaya uyğun elektronika komponenti mövcud
              deyil.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#147DF5] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Filtrləri təmizlə</span>
              </button>
            )}
          </div>
        ) : (
          <RevealSection as="section">
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${
                isPlaceholderData ? 'opacity-60' : ''
              }`}
            >
              {items.map((component) => (
                <ComponentCard key={component.id || component._id || component.slug} component={component} />
              ))}
            </div>
          </RevealSection>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            aria-label="Səhifələmə"
            className="flex items-center justify-center gap-2 pt-6 border-t border-slate-200"
          >
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Əvvəlki səhifə"
              className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex flex-wrap items-center gap-1">
              {[...Array(totalPages)].map((_, idx) => {
                const pNum = idx + 1;
                const isActive = pNum === currentPage;
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => handlePageChange(pNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#147DF5] text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Növbəti səhifə"
              className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
