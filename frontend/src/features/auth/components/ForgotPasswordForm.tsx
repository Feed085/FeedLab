import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas';
import { authApi } from '../auth.api';
import { az } from '@/i18n/az';
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export const ForgotPasswordForm: React.FC = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null);
    try {
      const res = await authApi.forgotPassword(values.email);
      setSuccessMessage(res.message || az.auth.resetLinkSentSuccess);
    } catch (err: any) {
      setServerError(err?.response?.data?.message || az.errors.generic);
    }
  };

  if (successMessage) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">{az.common.status}</h3>
        <p className="text-sm text-slate-600">{successMessage}</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{az.auth.backToLogin}</span>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-sm"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <div>
        <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1">
          {az.auth.emailLabel}
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder={az.auth.emailPlaceholder}
          {...register('email')}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors ${
            errors.email ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{az.common.loading}</span>
          </>
        ) : (
          <span>{az.auth.sendResetLink}</span>
        )}
      </button>

      <div className="text-center pt-2">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{az.auth.backToLogin}</span>
        </Link>
      </div>
    </form>
  );
};
