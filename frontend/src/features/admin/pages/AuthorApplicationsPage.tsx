import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { AuthorApplicationResponse } from '../../author/types';
import { AdminNav } from '../components/AdminNav';
import { az } from '@/i18n/az';

export const AuthorApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<AuthorApplicationResponse[]>([]);
  const [filter, setFilter] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAuthorApplications();
      const list = res.data || (Array.isArray(res) ? res : []);
      setApplications(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Müraciətləri yükləmək mümkün olmadı');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (id: string) => {
    const confirmed = window.confirm(az.admin.authorApplications.approveConfirm);
    if (!confirmed) return;

    try {
      await adminApi.reviewAuthorApplication(id, {
        action: 'APPROVE',
        adminNotes: 'Müəllif müraciəti təsdiqləndi',
      });
      setSuccessToast('Müraciət təsdiqləndi! İstifadəçi müəllif roluna yüksəldildi.');
      setTimeout(() => setSuccessToast(null), 4000);
      await fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Təsdiqləmə zamanı xəta baş verdi');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('İmtina səbəbini qeyd edin:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('İmtina səbəbi mütləq daxil edilməlidir');
      return;
    }

    try {
      await adminApi.reviewAuthorApplication(id, {
        action: 'REJECT',
        rejectionReason: reason.trim(),
      });
      setSuccessToast('Müraciət imtina edildi.');
      setTimeout(() => setSuccessToast(null), 4000);
      await fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'İmtina zamanı xəta baş verdi');
    }
  };

  const filtered = applications.filter((app) => {
    if (filter === 'ALL') return true;
    return app.status === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{az.admin.authorApplications.title}</h1>
        <p className="text-sm text-slate-500 mt-1">Müəllif statusu üçün müraciət edən mühəndislərin siyahısı</p>
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

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-1.5 bg-slate-50 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'PENDING'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gözləyən ({applications.filter((a) => a.status === 'PENDING').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'APPROVED'
                ? 'bg-white text-emerald-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Təsdiqlənmiş ({applications.filter((a) => a.status === 'APPROVED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'REJECTED'
                ? 'bg-white text-rose-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İmtina ({applications.filter((a) => a.status === 'REJECTED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hamısı ({applications.length})
          </button>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="animate-spin text-2xl mb-2">⚙️</div>
            <p>Müraciətlər yüklənir...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="font-semibold text-slate-700">{az.admin.authorApplications.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">{az.admin.authorApplications.colApplicant}</th>
                  <th className="px-6 py-3">{az.admin.authorApplications.colBio}</th>
                  <th className="px-6 py-3">{az.admin.authorApplications.colSkills}</th>
                  <th className="px-6 py-3">{az.admin.authorApplications.colPortfolio}</th>
                  <th className="px-6 py-3">{az.admin.authorApplications.colStatus}</th>
                  <th className="px-6 py-3 text-right">{az.admin.authorApplications.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => {
                  const appId = app._id || (app as any).id || '';
                  const userObj = typeof app.userId === 'object' && app.userId !== null ? (app.userId as any) : null;
                  return (
                    <tr key={appId} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {app.fullName || userObj?.fullName || 'Müraciətçi'}
                        {userObj?.email && (
                          <span className="block text-xs font-normal text-slate-500">{userObj.email}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs text-xs line-clamp-2">
                        {app.bio}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(app.skills || []).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {app.portfolioUrl ? (
                          <a
                            href={app.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline font-medium"
                          >
                            Keçid ↗
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {az.status[app.status] || app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {app.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(appId)}
                              className="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-semibold text-xs px-2.5 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              {az.admin.authorApplications.approve}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(appId)}
                              className="inline-flex items-center text-rose-700 hover:text-rose-900 font-medium text-xs px-2.5 py-1.5 rounded bg-rose-50 hover:bg-rose-100 transition-colors"
                            >
                              {az.admin.authorApplications.reject}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
