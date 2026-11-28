import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { ElectronicsComponent } from '../types';
import { ComponentCategoryVisual, getCategoryVisualMeta } from './ComponentCategoryVisual';

interface ComponentCardProps {
  component: ElectronicsComponent;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({ component }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const hasValidImage = Boolean(component.imageUrl && component.imageUrl.trim().length > 0 && !imgFailed);
  const meta = getCategoryVisualMeta(component.category);

  const pinCount = Array.isArray(component.pinout) ? component.pinout.length : 0;

  return (
    <article className="relative group flex flex-col justify-between bg-white border border-slate-200 hover:border-[#147DF5] rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200">
      <div>
        {/* Card Top Visual (Real image with onError fallback or category SVG visual) */}
        <div className="aspect-[16/10] w-full bg-slate-50 overflow-hidden border-b border-slate-100">
          {hasValidImage ? (
            <img
              src={component.imageUrl as string}
              alt={component.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <ComponentCategoryVisual
              category={component.category}
              categoryLabel={component.categoryLabel}
              name={component.name}
              compact
            />
          )}
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${meta.badgeClass}`}
            >
              {component.categoryLabel || component.category}
            </span>

            {pinCount > 0 && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                {pinCount} pin
              </span>
            )}
          </div>

          <Link
            to={`/library/${component.slug}`}
            className="after:absolute after:inset-0 focus:outline-none"
          >
            <h3 className="font-bold text-slate-900 group-hover:text-[#147DF5] text-base sm:text-lg leading-snug line-clamp-2 transition-colors mb-1.5">
              {component.name}
            </h3>
          </Link>

          <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {component.shortDescription}
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>Dərs və pinout bələdçisi</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#147DF5] group-hover:translate-x-0.5 transition-transform">
          <span>Ətraflı</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
};
