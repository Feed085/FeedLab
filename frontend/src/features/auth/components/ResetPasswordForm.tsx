import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, Link } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas';
import { authApi } from '../auth.api';
import { az } from '@/i18n/az';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export const ResetPasswordForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setServerError(az.validation.invalidResetToken);
      return;
    }

    setServerError(null);
    try {
      const res = await authApi.resetPassword({
        token,
        newPassword: values.newPassword,
      });
      setSuccessMessage(res.message || az.auth.passwordResetSuccess);
    } catch (err: any) {
      setServerError(err?.response?.data?.message || az.validation.invalidResetToken);
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
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
        >
          <span>{az.auth.loginButton}</span>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {(!token || serverError) && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-sm"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>{serverError || az.validation.invalidResetToken}</span>
        </div>
      )}

      <div>
        <label htmlFor="reset-newPassword" className="block text-sm font-medium text-slate-700 mb-1">
          {az.auth.newPasswordLabel}
        </label>
        <div className="relative">
          <input
            id="reset-newPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder={az.auth.passwordPlaceholder}
            {...register('newPassword')}
            className={`w-full px-3.5 py-2.5 pr-10 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors ${
              errors.newPassword ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
            }`}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{errors.newPassword.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="reset-confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
          {az.auth.confirmPasswordLabel}
        </label>
        <div className="relative">
          <input
            id="reset-confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={az.auth.confirmPasswordPlaceholder}
            {...register('confirmPassword')}
            className={`w-full px-3.5 py-2.5 pr-10 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors ${
              errors.confirmPassword ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
            }`}
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !token}
        className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{az.common.loading}</span>
          </>
        ) : (
          <span>{az.auth.resetPasswordButton}</span>
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
