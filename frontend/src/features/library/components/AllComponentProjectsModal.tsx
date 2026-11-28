import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, RotateCcw, X } from 'lucide-react';
import { ProjectCard } from '@/features/marketplace/components/ProjectCard';
import { useComponentProjects } from '../hooks/useLibrary';

interface AllComponentProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentSlug: string;
  componentName: string;
}

export const AllComponentProjectsModal: React.FC<AllComponentProjectsModalProps> = ({
  isOpen,
  onClose,
  componentSlug,
  componentName,
}) => {
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    if (isOpen) {
      setPage(1);
    }
  }, [isOpen, componentSlug]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useComponentProjects(
    componentSlug,
    { page, limit },
    isOpen,
  );

  if (!isOpen) return null;

  const projects = data?.items || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.page ?? page;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${componentName} — Bütün layihələr`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[88vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {componentName} — Bütün layihələr
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLoading ? 'Layihələr yüklənir...' : `${total} təsdiqlənmiş layihə tapıldı`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-sm text-slate-600">
                Layihələri yükləyərkən xəta baş verdi.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#147DF5] text-white hover:bg-[#0C64E1] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Yenidən cəhd et</span>
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Bu komponentlə hələ layihə əlavə edilməyib
              </p>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${
                isPlaceholderData ? 'opacity-60' : ''
              }`}
            >
              {projects.map((project) => (
                <ProjectCard key={project._id || project.id || project.slug} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              Səhifə {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                aria-label="Əvvəlki səhifə"
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, idx) => {
                  const pNum = idx + 1;
                  const active = pNum === currentPage;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        active
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
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Növbəti səhifə"
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
