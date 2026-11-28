import React from 'react';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { az } from '@/i18n/az';
import { KeyRound } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center mx-auto text-white shadow-md shadow-amber-500/20 mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {az.auth.forgotPasswordTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          {az.auth.forgotPasswordSubtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
};
