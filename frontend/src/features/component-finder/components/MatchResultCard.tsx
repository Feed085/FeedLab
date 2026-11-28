import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
  Star,
  User as UserIcon,
} from 'lucide-react';
import { resolveProjectImage } from '@/features/marketplace/components/ProjectCard';
import type { AuthorSummary, Category, Project, Technology } from '@/features/marketplace/types';
import { formatAZN } from '@/i18n/currency';
import { COMPONENT_FINDER_COPY, DIFFICULTY_LABELS } from '../constants';
import { normalizeComponentKey } from '../componentFinder.api';
import type { MatchEntry } from '../types';

export interface MatchResultCardProps {
  entry: MatchEntry;
  variant: 'full' | 'partial';
  catalogSlugMap?: Record<string, string>;
}

const DEFAULT_FALLBACK_IMAGE = '/images/project-default-electronics.svg';

export const MatchResultCard: React.FC<MatchResultCardProps> = ({
  entry,
  variant,
  catalogSlugMap,
}) => {
  const { project } = entry;
  const isFull = variant === 'full';
  const isFree = project.price === 0 || project.isFree === true;

  const category: Category | null =
    typeof project.category === 'object' && project.category !== null
      ? project.category
      : typeof project.categoryId === 'object' && project.categoryId !== null
        ? project.categoryId
        : null;

  const categoryLabel =
    category?.name ||
    (typeof project.category === 'string' && project.category.trim().length > 0
      ? project.category
      : '');

  const author: AuthorSummary | null =
    typeof project.author === 'object' && project.author !== null
      ? project.author
      : typeof project.authorId === 'object' && project.authorId !== null
        ? project.authorId
        : null;

  const validTechnologies = (project.technologies || []).filter(
    (tech): tech is Technology =>
      typeof tech === 'object' &&
      tech !== null &&
      typeof tech.name === 'string' &&
      tech.name.trim().length > 0,
  );

  const [imgFailed, setImgFailed] = useState(false);
  const projectForImageResolver = {
    ...project,
    category: category || undefined,
    author: author || undefined,
    technologies: validTechnologies,
  } as unknown as Project;

  const resolvedImage = imgFailed
    ? DEFAULT_FALLBACK_IMAGE
    : resolveProjectImage(projectForImageResolver, category);

  const techPills = validTechnologies.slice(0, 2);
  const normalizedCategoryLabel = categoryLabel.trim().toLowerCase();
  const showCategoryPill =
    normalizedCategoryLabel.length > 0 &&
    !techPills.some((tech) => tech.name.trim().toLowerCase() === normalizedCategoryLabel);

  const rawRating =
    typeof project.rating === 'number' && Number.isFinite(project.rating)
      ? project.rating
      : typeof project.averageRating === 'number' && Number.isFinite(project.averageRating)
        ? project.averageRating
        : 0;
  const formattedRating = rawRating.toFixed(1);

  const difficultyLabel = project.difficulty ? DIFFICULTY_LABELS[project.difficulty] : null;
  const domains = Array.isArray(project.domains) ? project.domains.filter(Boolean) : [];

  const bomSlugByName = new Map<string, string>();
  for (const bom of project.components || []) {
    if (bom?.name && bom.componentSlug && bom.componentSlug.trim().length > 0) {
      bomSlugByName.set(normalizeComponentKey(bom.name), bom.componentSlug.trim().toLowerCase());
    }
  }

  const resolveMissingSlug = (missingName: string): string | null => {
    const key = normalizeComponentKey(missingName);
    return bomSlugByName.get(key) || catalogSlugMap?.[key] || null;
  };

  return (
    <article
      data-testid={`match-card-${project.slug}`}
      className={`group flex flex-col justify-between bg-white border rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 min-w-0 ${
        isFull
          ? 'border-emerald-200 hover:border-emerald-400'
          : 'border-slate-200 hover:border-brand-500'
      }`}
    >
      <div className="min-w-0">
        {/* Project Image */}
        <Link
          to={`/projects/${project.slug}`}
          className="block relative aspect-[16/10] w-full bg-slate-100 overflow-hidden"
        >
          <img
            src={resolvedImage}
            alt={project.title}
            loading="lazy"
            onError={() => {
              if (!imgFailed) setImgFailed(true);
            }}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />

          {/* Match Status Badge */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
            {isFull ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {COMPONENT_FINDER_COPY.fullMatchBadge} • {entry.matchLabel}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{entry.matchLabel}</span>
              </span>
            )}
          </div>
        </Link>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3 min-w-0">
          {/* Meta Pills + Rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {difficultyLabel && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-100">
                  {difficultyLabel}
                </span>
              )}
              {showCategoryPill && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {categoryLabel}
                </span>
              )}
              {techPills.map((tech) => (
                <span
                  key={tech._id || tech.slug || tech.name}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700"
                >
                  {tech.name}
                </span>
              ))}
              {domains.slice(0, 2).map((domain) => (
                <span
                  key={domain}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700"
                >
                  {domain}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 flex-shrink-0 pt-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{formattedRating}</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="min-w-0">
            <Link
              to={`/projects/${project.slug}`}
              className="block focus:outline-none"
            >
              <h3 className="font-bold text-slate-900 group-hover:text-brand-600 text-base sm:text-lg leading-snug line-clamp-2 break-words transition-colors mb-1">
                {project.title}
              </h3>
            </Link>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed break-words">
              {project.shortDescription}
            </p>
          </div>

          {/* Matched Components Summary */}
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/70 px-3 py-2 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-semibold">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>
                {COMPONENT_FINDER_COPY.matchedComponentsCount}: {entry.matchedComponents.length}
              </span>
            </div>
            {entry.matchedComponents.length > 0 && (
              <p className="text-[11px] text-emerald-800/90 mt-1 break-words">
                {entry.matchedComponents.join(', ')}
              </p>
            )}
          </div>

          {/* Missing Components (for partial matches) */}
          {entry.missingComponents.length > 0 && (
            <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-3 py-2.5">
              <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>
                  {COMPONENT_FINDER_COPY.missingComponentsHeading} ({entry.missingComponents.length}):
                </span>
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {entry.missingComponents.map((missingName) => {
                  const missingSlug = resolveMissingSlug(missingName);
                  return (
                    <li key={missingName} className="max-w-full">
                      {missingSlug ? (
                        <Link
                          to={`/library/${missingSlug}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-[11px] font-semibold text-amber-900 hover:border-brand-400 hover:text-brand-700 transition-colors break-words"
                        >
                          <BookOpen className="w-3 h-3 flex-shrink-0 text-brand-600" />
                          <span>{missingName}</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-semibold text-amber-900 break-words">
                          {missingName}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Author, Sales, Price & CTA */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 text-xs text-slate-500">
          <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{author?.fullName || COMPONENT_FINDER_COPY.defaultAuthorName}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
            <ShoppingBag className="w-3 h-3" />
            <span>{project.salesCount || 0}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isFree ? (
            <span className="text-sm font-bold text-emerald-600">
              {COMPONENT_FINDER_COPY.freeLabel}
            </span>
          ) : (
            <span className="text-base font-extrabold text-slate-900">
              {formatAZN(project.price, { useCode: true })}
            </span>
          )}

          <Link
            to={`/projects/${project.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
          >
            <span>{COMPONENT_FINDER_COPY.viewProject}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
