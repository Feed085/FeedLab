import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Project } from '../../marketplace/types';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';

interface AuthorProjectTableProps {
  projects: Project[];
  onSubmitForReview?: (projectId: string) => Promise<void>;
  isLoading?: boolean;
}

export const AuthorProjectTable: React.FC<AuthorProjectTableProps> = ({
  projects,
  onSubmitForReview,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const filteredProjects = projects.filter((project) => {
    if (filter === 'ALL') return true;
    return project.status === filter;
  });

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            {az.status.APPROVED}
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            {az.status.SUBMITTED}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            {az.status.REJECTED}
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {az.status.DRAFT}
          </span>
        );
    }
  };

  const handleSubmit = async (id: string) => {
    if (!onSubmitForReview) return;
    try {
      setSubmittingId(id);
      await onSubmitForReview(id);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Table Header & Filters */}
      <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-bold text-slate-900">{az.author.projectsTable.title}</h3>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {az.author.projectsTable.filterAll} ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === 'APPROVED'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {az.author.projectsTable.filterApproved} (
            {projects.filter((p) => p.status === 'APPROVED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === 'SUBMITTED'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {az.author.projectsTable.filterSubmitted} (
            {projects.filter((p) => p.status === 'SUBMITTED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === 'DRAFT'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {az.author.projectsTable.filterDraft} (
            {projects.filter((p) => p.status === 'DRAFT').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filter === 'REJECTED'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {az.author.projectsTable.filterRejected} (
            {projects.filter((p) => p.status === 'REJECTED').length})
          </button>
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <p>{az.author.projectsTable.empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">{az.author.projectsTable.colName}</th>
                <th className="px-6 py-3">{az.author.projectsTable.colCategory}</th>
                <th className="px-6 py-3">{az.author.projectsTable.colPrice}</th>
                <th className="px-6 py-3">{az.author.projectsTable.colStatus}</th>
                <th className="px-6 py-3">{az.author.projectsTable.colSales}</th>
                <th className="px-6 py-3 text-right">{az.author.projectsTable.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => {
                const projId = project._id || project.id || '';
                return (
                  <React.Fragment key={projId}>
                    <tr className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 max-w-xs truncate">
                        {project.title}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {typeof project.categoryId === 'object' && project.categoryId !== null
                          ? project.categoryId.name
                          : typeof project.category === 'object' && project.category !== null
                            ? project.category.name
                            : typeof project.category === 'string' && project.category
                              ? project.category
                              : 'Ümumi'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatAZN(project.price)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                      <td className="px-6 py-4 text-slate-600">{project.salesCount || 0}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          to={`/author/projects/${projId}/edit`}
                          className="inline-flex items-center text-brand-600 hover:text-brand-800 font-medium text-xs px-2.5 py-1.5 rounded bg-brand-50 hover:bg-brand-100 transition-colors"
                        >
                          {az.author.projectsTable.edit}
                        </Link>

                        {project.status === 'APPROVED' && (
                          <Link
                            to={`/projects/${project.slug}`}
                            className="inline-flex items-center text-slate-600 hover:text-slate-800 font-medium text-xs px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            {az.author.projectsTable.preview}
                          </Link>
                        )}

                        {(project.status === 'DRAFT' || project.status === 'REJECTED') && (
                          <button
                            type="button"
                            onClick={() => handleSubmit(projId)}
                            disabled={submittingId === projId || isLoading}
                            className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-900 font-medium text-xs px-2.5 py-1.5 rounded bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            {submittingId === projId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              az.author.projectsTable.submitReview
                            )}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Rejection notice row if rejected */}
                    {project.status === 'REJECTED' && (project as any).rejectionReason && (
                      <tr className="bg-rose-50/50">
                        <td colSpan={6} className="px-6 py-3 text-xs text-rose-800 border-l-4 border-rose-500">
                          <span className="font-semibold">{az.author.projectsTable.rejectionReasonNotice} </span>
                          {(project as any).rejectionReason}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
