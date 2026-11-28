import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { Project } from '../../marketplace/types';
import { AdminNav } from '../components/AdminNav';
import { ProjectPreviewModal } from '../components/ProjectPreviewModal';
import { ProjectReviewDialog } from '../components/ProjectReviewDialog';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';

export const ProjectReviewQueuePage: React.FC = () => {
  const [queue, setQueue] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals state
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [rejectingProject, setRejectingProject] = useState<Project | null>(null);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getReviewQueue();
      const list = res.data || res.queue || (Array.isArray(res) ? res : []);
      setQueue(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Növbəni yükləmək mümkün olmadı');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (projectId: string) => {
    const confirmed = window.confirm(az.admin.queue.approveConfirm);
    if (!confirmed) return;

    try {
      await adminApi.reviewProject(projectId, { action: 'APPROVE' });
      setSuccessToast('Layihə uğurla təsdiqləndi və kataloqda dərc olundu!');
      setTimeout(() => setSuccessToast(null), 4000);
      await fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Təsdiqləmə zamanı xəta baş verdi');
    }
  };

  const handleConfirmReject = async (projectId: string, rejectionReason: string) => {
    await adminApi.reviewProject(projectId, { action: 'REJECT', rejectionReason });
    setSuccessToast('Layihə imtina edildi və müəllifə qeydlər göndərildi.');
    setTimeout(() => setSuccessToast(null), 4000);
    await fetchQueue();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{az.admin.queue.title}</h1>
        <p className="text-sm text-slate-500 mt-1">Moderasiya gözləyən mühəndislik layihələrinin siyahısı</p>
      </div>

      {/* Admin Subnav */}
      <AdminNav />

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {successToast}
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="animate-spin text-2xl mb-2">⚙️</div>
            <p>Növbə yüklənir...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <span className="text-4xl block mb-2">🎉</span>
            <p className="font-semibold text-slate-700">{az.admin.queue.empty}</p>
            <p className="text-xs text-slate-400 mt-1">Bütün göndərilmiş layihələr yoxlanılıb.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">{az.admin.queue.colProject}</th>
                  <th className="px-6 py-3">{az.admin.queue.colAuthor}</th>
                  <th className="px-6 py-3">{az.admin.queue.colCategory}</th>
                  <th className="px-6 py-3">{az.admin.queue.colPrice}</th>
                  <th className="px-6 py-3">{az.admin.queue.colFiles}</th>
                  <th className="px-6 py-3 text-right">{az.admin.queue.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((project) => {
                  const projId = project._id || project.id || '';
                  return (
                    <tr key={projId} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs truncate">
                        {project.title}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {typeof project.authorId === 'object' && project.authorId !== null
                          ? (project.authorId as any).fullName || (project.authorId as any).email
                          : project.author?.fullName || 'Müəllif'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {typeof project.categoryId === 'object' && project.categoryId !== null
                          ? (project.categoryId as any).name
                          : typeof project.category === 'object' && project.category !== null
                            ? (project.category as any).name
                            : (project.category as string) || 'Ümumi'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatAZN(project.price)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        📁 {project.publicFiles?.length || 0} fayl
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewProject(project)}
                          className="inline-flex items-center text-slate-700 hover:text-slate-900 font-medium text-xs px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          {az.admin.queue.preview}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(projId)}
                          className="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-semibold text-xs px-2.5 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          {az.admin.queue.approve}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingProject(project)}
                          className="inline-flex items-center text-rose-700 hover:text-rose-900 font-medium text-xs px-2.5 py-1.5 rounded bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                          {az.admin.queue.reject}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewProject && (
        <ProjectPreviewModal
          project={previewProject}
          onClose={() => setPreviewProject(null)}
          onApprove={handleApprove}
          onReject={(p) => setRejectingProject(p)}
        />
      )}

      {/* Reject Reason Dialog */}
      {rejectingProject && (
        <ProjectReviewDialog
          project={rejectingProject}
          isOpen={Boolean(rejectingProject)}
          onClose={() => setRejectingProject(null)}
          onConfirmReject={handleConfirmReject}
        />
      )}
    </div>
  );
};
