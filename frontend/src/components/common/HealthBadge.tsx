import React from 'react';
import { useHealth } from '@/hooks/useHealth';
import { az } from '@/i18n/az';

export const HealthBadge: React.FC = () => {
  const { data: health, isLoading, isError } = useHealth();

  if (isLoading) {
    return (
      <div
        data-testid="health-badge-loading"
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
      >
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
        <span>{az.common.loading}</span>
      </div>
    );
  }

  const isOperational = !isError && health?.status === 'ok' && health?.database === 'connected';

  if (!isOperational) {
    return (
      <div
        data-testid="health-badge-error"
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
        title={health?.error || az.health.systemDegraded}
      >
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span>{az.health.statusDisconnectedText}</span>
      </div>
    );
  }

  return (
    <div
      data-testid="health-badge-ok"
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
      title={`Server versiyası: ${health.version || '0.1.0'}`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
      <span>{az.health.statusConnectedText}</span>
    </div>
  );
};
