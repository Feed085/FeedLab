import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Search,
  ShoppingBag,
  Star,
  UserPlus,
  Users,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { marketplaceApi } from './marketplace.api';
import { az } from '@/i18n/az';
import type { Project } from './types';

interface AggregatedAuthor {
  id: string;
  fullName: string;
  role?: string;
  projectsCount: number;
  totalSales: number;
  averageRating: number;
  freeProjectsCount: number;
  specialties: string[];
  projects: Project[];
}

export const AuthorsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const loadAuthorsFromProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const firstPage = await marketplaceApi.getProjects({ limit: 100, sort: 'popular', page: 1 });
        let allProjects = [...(firstPage.data || [])];

        const totalPages = Math.min(firstPage.meta?.pages || 1, 5);
        if (totalPages > 1) {
          const remaining = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              marketplaceApi.getProjects({ limit: 100, sort: 'popular', page: i + 2 }),
            ),
          );
          remaining.forEach((res) => {
            if (res.data) allProjects = allProjects.concat(res.data);
          });
        }

        if (active) {
          setProjects(allProjects);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || az.errors.generic);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadAuthorsFromProjects();
    return () => {
      active = false;
    };
  }, []);

  const authors = useMemo<AggregatedAuthor[]>(() => {
    const map = new Map<
      string,
      {
        id: string;
        fullName: string;
        role?: string;
        totalSales: number;
        ratingSum: number;
        ratedCount: number;
        freeProjectsCount: number;
        specialties: Set<string>;
        projects: Project[];
      }
    >();

    for (const project of projects) {
      const authorObj =
        typeof project.author === 'object' && project.author !== null
          ? project.author
          : typeof project.authorId === 'object' && project.authorId !== null
            ? project.authorId
            : null;

      if (!authorObj || !authorObj.fullName) continue;

      const authorKey = authorObj._id || authorObj.id || authorObj.fullName;
      let entry = map.get(authorKey);
      if (!entry) {
        entry = {
          id: authorKey,
          fullName: authorObj.fullName,
          role: authorObj.role,
          totalSales: 0,
          ratingSum: 0,
          ratedCount: 0,
          freeProjectsCount: 0,
          specialties: new Set<string>(),
          projects: [],
        };
        map.set(authorKey, entry);
      }

      entry.projects.push(project);
      entry.totalSales += project.salesCount || 0;
      if (project.price === 0) entry.freeProjectsCount += 1;
      if (typeof project.rating === 'number' && project.rating > 0) {
        entry.ratingSum += project.rating;
        entry.ratedCount += 1;
      }

      const categoryObj =
        typeof project.category === 'object' && project.category !== null
          ? project.category
          : typeof project.categoryId === 'object' && project.categoryId !== null
            ? project.categoryId
            : null;
      if (categoryObj?.name) {
        entry.specialties.add(categoryObj.name);
      }

      project.technologies?.forEach((tech) => {
        if (typeof tech === 'object' && tech?.name) {
          entry.specialties.add(tech.name);
        }
      });
    }

    return Array.from(map.values())
      .map((entry) => ({
        id: entry.id,
        fullName: entry.fullName,
        role: entry.role,
        projectsCount: entry.projects.length,
        totalSales: entry.totalSales,
        averageRating: entry.ratedCount > 0 ? entry.ratingSum / entry.ratedCount : 0,
        freeProjectsCount: entry.freeProjectsCount,
        specialties: Array.from(entry.specialties).slice(0, 4),
        projects: entry.projects.slice(0, 3),
      }))
      .sort((a, b) => b.totalSales - a.totalSales || b.projectsCount - a.projectsCount);
  }, [projects]);

  const filteredAuthors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.specialties.some((s) => s.toLowerCase().includes(q)) ||
        a.projects.some((p) => p.title.toLowerCase().includes(q)),
    );
  }, [authors, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-[#147DF5] text-xs font-semibold border border-brand-200">
            <Users className="w-3.5 h-3.5" />
            <span>FEED Agency Mühəndis İcması</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {az.authors.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {az.authors.subtitle}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={az.authors.searchPlaceholder}
            aria-label={az.authors.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#147DF5]/20 focus:border-[#147DF5] shadow-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Authors Grid */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#147DF5] mb-3" />
          <p className="text-sm">{az.common.loading}</p>
        </div>
      ) : filteredAuthors.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <Award className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">{az.authors.emptyTitle}</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">{az.authors.emptyDesc}</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-[#147DF5] rounded-xl text-xs font-semibold transition-colors"
            >
              {az.authors.clearSearch}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuthors.map((author) => {
            const initials = author.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join('');

            return (
              <article
                key={author.id}
                className="bg-white border border-slate-200 hover:border-[#147DF5] rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  {/* Author Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#147DF5] text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-sm">
                      {initials || 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-slate-900 text-base truncate">
                        {author.fullName}
                      </h2>
                      <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{az.authors.verifiedBadge}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm font-bold text-slate-900">
                        <FolderKanban className="w-3.5 h-3.5 text-[#147DF5]" />
                        <span>{author.projectsCount}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{az.authors.statsProjects}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm font-bold text-slate-900">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{author.totalSales}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{az.authors.statsSales}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm font-bold text-slate-900">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>
                          {author.averageRating > 0 ? author.averageRating.toFixed(1) : '0.0'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{az.authors.statsRating}</div>
                    </div>
                  </div>

                  {/* Specialties */}
                  {author.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {author.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Top Projects */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {az.authors.topProjects}
                    </div>
                    <ul className="space-y-1">
                      {author.projects.map((proj) => (
                        <li key={proj._id || proj.slug}>
                          <Link
                            to={`/projects/${proj.slug}`}
                            className="text-xs font-medium text-slate-700 hover:text-[#147DF5] flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-b-0 transition-colors"
                          >
                            <span className="truncate">{proj.title}</span>
                            <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-400" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Become Author CTA Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">{az.authors.becomeAuthorBannerTitle}</h2>
          <p className="text-sm text-slate-600">{az.authors.becomeAuthorBannerDesc}</p>
        </div>
        <Link
          to="/become-author"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#147DF5] hover:bg-[#0C64E1] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{az.authors.becomeAuthorCta}</span>
        </Link>
      </section>
    </div>
  );
};
