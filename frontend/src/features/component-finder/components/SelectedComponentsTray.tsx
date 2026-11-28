import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Sparkles, Trash2, X } from 'lucide-react';
import { COMPONENT_FINDER_COPY } from '../constants';
import type { SelectedComponentItem } from '../types';

export interface SelectedComponentsTrayProps {
  selectedComponents: SelectedComponentItem[];
  onRemoveComponent: (slug: string) => void;
  onClearAll: () => void;
}

export const SelectedComponentsTray: React.FC<SelectedComponentsTrayProps> = ({
  selectedComponents,
  onRemoveComponent,
  onClearAll,
}) => {
  const count = selectedComponents.length;

  return (
    <section
      aria-label={COMPONENT_FINDER_COPY.trayTitle}
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-slate-900 text-base truncate">
            {COMPONENT_FINDER_COPY.trayTitle} ({count})
          </h2>
        </div>

        {count > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{COMPONENT_FINDER_COPY.clearAllComponents}</span>
          </button>
        )}
      </div>

      {count === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center">
          <Sparkles className="w-5 h-5 text-brand-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800 mb-1">
            {COMPONENT_FINDER_COPY.emptySelectionTitle}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            {COMPONENT_FINDER_COPY.emptySelectionGuidance}
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2" data-testid="selected-components-list">
          {selectedComponents.map((item) => (
            <li
              key={item.slug}
              className="inline-flex items-center gap-1.5 max-w-full bg-brand-50/80 border border-brand-200 text-brand-900 rounded-xl pl-3 pr-1.5 py-1.5 text-xs font-semibold"
            >
              {item.isCustom ? (
                <span className="truncate">{item.name}</span>
              ) : (
                <Link
                  to={`/library/${item.slug}`}
                  className="truncate hover:text-brand-600 transition-colors"
                >
                  {item.name}
                </Link>
              )}
              <button
                type="button"
                onClick={() => onRemoveComponent(item.slug)}
                aria-label={`${item.name} — ${COMPONENT_FINDER_COPY.deleteItem}`}
                className="inline-flex items-center justify-center w-5 h-5 rounded-lg text-brand-700 hover:bg-brand-200/70 hover:text-brand-950 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
