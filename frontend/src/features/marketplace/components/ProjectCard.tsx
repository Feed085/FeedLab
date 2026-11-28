import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, User as UserIcon } from 'lucide-react';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';
import type { Category, Project } from '../types';

interface ProjectCardProps {
  project: Project;
}

const DEFAULT_FALLBACK_IMAGE = '/images/project-default-electronics.svg';

export function resolveProjectImage(project: Project, category: Category | null): string {
  if (project.thumbnailUrl && project.thumbnailUrl.trim().length > 0) {
    return project.thumbnailUrl;
  }
  if (project.images && project.images.length > 0 && project.images[0]?.trim().length > 0) {
    return project.images[0];
  }

  const techText = (project.technologies || [])
    .map((t) => (typeof t === 'object' && t !== null ? `${t?.slug || ''} ${t?.name || ''}` : ''))
    .join(' ');
  const searchable = `${project.slug || ''} ${project.title || ''} ${category?.slug || ''} ${techText}`.toLowerCase();

  if (
    searchable.includes('bitki') ||
    searchable.includes('suvarma') ||
    searchable.includes('torpaq') ||
    searchable.includes('plant')
  ) {
    return '/images/project-plant-watering.jpg';
  }
  if (
    searchable.includes('esp32') ||
    searchable.includes('zigbee') ||
    searchable.includes('smart-home') ||
    searchable.includes('agilli-ev') ||
    searchable.includes('ağıllı ev') ||
    searchable.includes('termostat')
  ) {
    return '/images/project-esp32-panel.svg';
  }
  if (
    searchable.includes('robot') ||
    searchable.includes('dron') ||
    searchable.includes('servo')
  ) {
    return '/images/project-robotics.svg';
  }
  if (
    searchable.includes('pcb') ||
    searchable.includes('osilloqraf') ||
    searchable.includes('sxem') ||
    searchable.includes('schematics') ||
    searchable.includes('stm32')
  ) {
    return '/images/project-schematics-pcb.svg';
  }
  if (
    searchable.includes('arduino') ||
    searchable.includes('sensor') ||
    searchable.includes('hava') ||
    searchable.includes('weather') ||
    searchable.includes('led')
  ) {
    return '/images/project-arduino-sensors.svg';
  }

  return DEFAULT_FALLBACK_IMAGE;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const isFree = project.price === 0;

  const category =
    typeof project.category === 'object' && project.category !== null
      ? project.category
      : typeof project.categoryId === 'object' && project.categoryId !== null
        ? project.categoryId
        : null;

  const author =
    typeof project.author === 'object' && project.author !== null
      ? project.author
      : typeof project.authorId === 'object' && project.authorId !== null
        ? project.authorId
        : null;

  const [imgFailed, setImgFailed] = useState(false);
  const resolvedImage = imgFailed ? DEFAULT_FALLBACK_IMAGE : resolveProjectImage(project, category);

  const validTechnologies = (project.technologies || []).filter(
    (tech): tech is NonNullable<typeof tech> =>
      typeof tech === 'object' &&
      tech !== null &&
      typeof tech.name === 'string' &&
      tech.name.trim().length > 0,
  );
  const techPills = validTechnologies.slice(0, 2);
  const normalizedCategoryName = (category?.name || '').trim().toLowerCase();
  const showCategoryPill =
    normalizedCategoryName.length > 0 &&
    !techPills.some(
      (tech) => (tech?.name || '').trim().toLowerCase() === normalizedCategoryName,
    );

  return (
    <article className="relative group flex flex-col justify-between bg-white border border-slate-200 hover:border-[#147DF5] rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200">
      <div>
        {/* Card Top Photo */}
        <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden">
          <img
            src={resolvedImage}
            alt={project.title}
            loading="lazy"
            onError={() => {
              if (!imgFailed) setImgFailed(true);
            }}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Tags & Rating Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {techPills.map((tech) => (
                <span
                  key={tech._id || tech.slug || tech.name}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700"
                >
                  {tech.name}
                </span>
              ))}
              {showCategoryPill && category && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {category.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>
                {typeof project.rating === 'number' && Number.isFinite(project.rating)
                  ? project.rating.toFixed(1)
                  : '0.0'}
              </span>
            </div>
          </div>

          {/* Title (stretched link over entire card) */}
          <Link
            to={`/projects/${project.slug}`}
            className="after:absolute after:inset-0 focus:outline-none"
          >
            <h3 className="font-bold text-slate-900 group-hover:text-[#147DF5] text-base sm:text-lg leading-snug line-clamp-2 transition-colors mb-1.5">
              {project.title}
            </h3>
          </Link>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {project.shortDescription}
          </p>
        </div>
      </div>

      {/* Bottom Author & Price Row */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 text-xs text-slate-500">
          <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{author?.fullName || 'Feed Lab Müəllifi'}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
            <ShoppingBag className="w-3 h-3" />
            <span>{project.salesCount || 0}</span>
          </span>
        </div>

        <div className="flex-shrink-0">
          {isFree ? (
            <span className="text-sm font-bold text-emerald-600">{az.common.free}</span>
          ) : (
            <span className="text-base font-extrabold text-slate-900">
              {formatAZN(project.price, { useCode: true })}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
