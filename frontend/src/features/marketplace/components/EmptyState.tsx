import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';
import { az } from '@/i18n/az';

interface EmptyStateProps {
  onReset?: () => void;
  title?: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onReset,
  title = az.marketplace.emptyTitle,
  description = az.marketplace.emptyDescription,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
      <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
        <SearchX className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {az.marketplace.resetFilters}
        </button>
      )}
    </div>
  );
};
