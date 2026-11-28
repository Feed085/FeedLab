import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { authorApi } from '../api/authorApi';
import { AuthorDashboardData } from '../types';
import { AuthorMetricsCards } from '../components/AuthorMetricsCards';
import { AuthorProjectTable } from '../components/AuthorProjectTable';
import { az } from '@/i18n/az';

export const AuthorDashboardPage: React.FC = () => {
  const [data, setData] = useState<AuthorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await authorApi.getDashboard();
      setData(res);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Məlumatların yüklənməsi zamanı xəta baş verdi',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSubmitForReview = async (projectId: string) => {
    try {
      await authorApi.submitProject(projectId);
      setSuccessToast('Layihə uğurla moderasiyaya göndərildi!');
      setTimeout(() => setSuccessToast(null), 4000);
      await fetchDashboard();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Təsdiqə göndərilərkən xəta baş verdi';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-2" />
        <p>Müəllif paneli yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{az.author.dashboardTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Layihələrinizin satışı, moderasiya statusu və maliyyə göstəriciləri
          </p>
        </div>

        <Link
          to="/author/projects/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all border border-brand-700"
        >
          <Plus className="w-4 h-4" />
          <span>{az.author.projectsTable.newProject}</span>
        </Link>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {successToast}
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          {errorMessage}
        </div>
      )}

      {/* Metric Cards */}
      <AuthorMetricsCards balance={data?.balance} stats={data?.stats} />

      {/* Projects Table */}
      <AuthorProjectTable
        projects={data?.projects ?? []}
        onSubmitForReview={handleSubmitForReview}
      />
    </div>
  );
};
