import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { registerSchema, type RegisterFormValues } from '../schemas';
import { useAuth } from '../AuthContext';
import { az } from '@/i18n/az';

export const RegisterForm: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      const data = err?.response?.data;
      const status = err?.response?.status;
      let message: string;
      if (typeof data?.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data?.message) && data.message.length > 0) {
        message = data.message[0];
      } else if (status === 409) {
        message = az.errors.emailExists;
      } else if (status === 400) {
        message = 'Doldurulmuş məlumatlar düzgün deyil';
      } else if (err?.response) {
        message = az.errors.generic;
      } else {
        message = 'Serverə qoşulmaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin';
      }
      setServerError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-700 text-sm"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <div>
        <label htmlFor="reg-fullName" className="block text-sm font-medium text-slate-700 mb-1">
          {az.auth.fullNameLabel}
        </label>
        <input
          id="reg-fullName"
          type="text"
          placeholder={az.auth.fullNamePlaceholder}
          {...register('fullName')}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors ${
            errors.fullName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
          }`}
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">
          {az.auth.emailLabel}
        </label>
        <input
          id="reg-email"
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

      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1">
          {az.auth.passwordLabel}
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={az.auth.passwordPlaceholder}
            {...register('password')}
            className={`w-full px-3.5 py-2.5 pr-10 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors ${
              errors.password ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
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
        {errors.password && (
          <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="reg-confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
          {az.auth.confirmPasswordLabel}
        </label>
        <div className="relative">
          <input
            id="reg-confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
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
        disabled={isSubmitting}
        className="w-full mt-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{az.common.loading}</span>
          </>
        ) : (
          <span>{az.auth.registerButton}</span>
        )}
      </button>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-600">
          {az.auth.haveAccount}{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            {az.auth.loginButton}
          </Link>
        </p>
      </div>
    </form>
  );
};
