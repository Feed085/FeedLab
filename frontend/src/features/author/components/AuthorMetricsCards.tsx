import React from 'react';
import { Wallet, Package, FolderKanban, Star } from 'lucide-react';
import { AuthorBalanceInfo, AuthorStatsInfo } from '../types';
import { formatAZN } from '@/i18n/currency';
import { az } from '@/i18n/az';

interface AuthorMetricsCardsProps {
  balance?: AuthorBalanceInfo;
  stats?: AuthorStatsInfo;
}

export const AuthorMetricsCards: React.FC<AuthorMetricsCardsProps> = ({
  balance,
  stats,
}) => {
  const formattedRating =
    typeof stats?.averageRating === 'number' && Number.isFinite(stats.averageRating)
      ? stats.averageRating.toFixed(1)
      : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {/* Available Balance */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-sm font-medium">{az.author.metrics.balance}</span>
          <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Wallet className="w-5 h-5" />
          </span>
        </div>
        <div className="text-2xl font-bold text-slate-900" data-testid="metric-balance">
          {formatAZN(balance?.availableBalance ?? 0, { showFree: false })}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {az.author.metrics.totalEarnings}: {formatAZN(balance?.totalEarnings ?? 0, { showFree: false })}
        </p>
      </div>

      {/* Total Sales */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-sm font-medium">{az.author.metrics.totalSales}</span>
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Package className="w-5 h-5" />
          </span>
        </div>
        <div className="text-2xl font-bold text-slate-900" data-testid="metric-sales">
          {stats?.totalSales ?? 0}
        </div>
        <p className="text-xs text-slate-400 mt-1">Bütün dövr üzrə sifarişlər</p>
      </div>

      {/* Total Projects */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-sm font-medium">{az.author.metrics.totalProjects}</span>
          <span className="p-2 bg-brand-50 text-[#147DF5] rounded-lg">
            <FolderKanban className="w-5 h-5" />
          </span>
        </div>
        <div className="text-2xl font-bold text-slate-900" data-testid="metric-projects">
          {stats?.totalProjects ?? 0}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
          <span className="text-emerald-600 font-medium">{stats?.approvedProjects ?? 0} təsdiqlənib</span>
          <span>•</span>
          <span className="text-amber-600 font-medium">{stats?.submittedProjects ?? 0} növbədə</span>
        </div>
      </div>

      {/* Average Rating */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-sm font-medium">{az.author.metrics.averageRating}</span>
          <span className="p-2 bg-amber-50 text-amber-500 rounded-lg">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </span>
        </div>
        <div className="text-2xl font-bold text-slate-900" data-testid="metric-rating">
          {formattedRating} / 5.0
        </div>
        <p className="text-xs text-slate-400 mt-1">Alıcı məmnuniyyəti dərəcəsi</p>
      </div>
    </div>
  );
};
