import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from './types';
import { az } from '@/i18n/az';
import { ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/login',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. Loading state prevents premature redirect
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">{az.common.loading}</p>
      </div>
    );
  }

  // 2. Unauthenticated redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 3. RBAC authorization check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-xl border border-rose-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{az.auth.forbiddenTitle}</h2>
        <p className="text-sm text-slate-600">{az.auth.forbiddenDesc}</p>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{az.common.back}</span>
        </button>
      </div>
    );
  }

  // 4. Authorized: render children or Outlet
  return children ? <>{children}</> : <Outlet />;
};
