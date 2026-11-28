import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { AdminMetrics } from '../types';
import { AdminNav } from '../components/AdminNav';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await adminApi.getMetrics();
        setMetrics(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Göstəriciləri yükləmək mümkün olmadı');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500">
        <div className="animate-spin text-3xl mb-2">⚙️</div>
        <p>Admin paneli yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{az.admin.dashboardTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">Platformanın ümumi statistikası və moderasiya mərkəzi</p>
      </div>

      {/* Admin Subnav */}
      <AdminNav />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">{az.admin.metrics.totalUsers}</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">👥</span>
          </div>
          <div className="text-2xl font-bold text-slate-900" data-testid="metric-users">
            {metrics?.totalUsers ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Qeydiyyatdan keçmiş istifadəçilər</p>
        </div>

        {/* Total Authors */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">{az.admin.metrics.totalAuthors}</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-lg">🎓</span>
          </div>
          <div className="text-2xl font-bold text-slate-900" data-testid="metric-authors">
            {metrics?.totalAuthors ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Təsdiqlənmiş müəlliflər</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">{az.admin.metrics.totalRevenue}</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-lg">💰</span>
          </div>
          <div className="text-2xl font-bold text-slate-900" data-testid="metric-revenue">
            {formatAZN(metrics?.totalRevenueAZN ?? 0, { showFree: false })}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Komissiya (20%): {formatAZN(metrics?.platformCommissionAZN ?? 0, { showFree: false })}
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">{az.admin.metrics.totalOrders}</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg text-lg">📦</span>
          </div>
          <div className="text-2xl font-bold text-slate-900" data-testid="metric-orders">
            {metrics?.totalOrders ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Uğurlu alış-verişlər</p>
        </div>
      </div>

      {/* Action / Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <Link
          to="/admin/projects/review"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-2xl">📋</span>
              {(metrics?.pendingProjectsCount ?? 0) > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {metrics?.pendingProjectsCount} gözləyir
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">{az.admin.nav.reviewQueue}</h3>
            <p className="text-xs text-slate-500">Müəlliflər tərəfindən göndərilmiş layihələri yoxlayın və təsdiq edin.</p>
          </div>
          <span className="text-primary-600 text-xs font-semibold mt-4">Növbəyə keçid →</span>
        </Link>

        <Link
          to="/admin/author-applications"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-2xl">🎓</span>
              {(metrics?.pendingApplicationsCount ?? 0) > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                  {metrics?.pendingApplicationsCount} yeni
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">{az.admin.nav.authorApplications}</h3>
            <p className="text-xs text-slate-500">Müəllif olmaq istəyən mühəndislərin müraciətlərini dəyərləndirin.</p>
          </div>
          <span className="text-primary-600 text-xs font-semibold mt-4">Müraciətlərə baxış →</span>
        </Link>

        <Link
          to="/admin/users"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">{az.admin.nav.users}</h3>
            <p className="text-xs text-slate-500">Qeydiyyatlı istifadəçilərin siyahısı, rolların dəyişdirilməsi və bloklama.</p>
          </div>
          <span className="text-primary-600 text-xs font-semibold mt-4">İstifadəçilərə keçid →</span>
        </Link>
      </div>
    </div>
  );
};
