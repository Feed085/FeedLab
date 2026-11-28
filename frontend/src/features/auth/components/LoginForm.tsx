import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '../schemas';
import { useAuth } from '../AuthContext';
import { az } from '@/i18n/az';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      const data = err?.response?.data;
      const status = err?.response?.status;
      let message: string;
      if (typeof data?.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data?.message) && data.message.length > 0) {
        message = data.message[0];
      } else if (status === 401) {
        message = az.errors.invalidCredentials;
      } else if (status === 400) {
        message = 'E-poçt və ya şifrə düzgün doldurulmayıb';
      } else if (err?.response) {
        message = az.errors.generic;
      } else {
        message = 'Serverə qoşulmaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin';
      }
      setServerError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
        <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
          {az.auth.emailLabel}
        </label>
        <input
          id="login-email"
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
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
            {az.auth.passwordLabel}
          </label>
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            {az.auth.forgotPasswordLink}
          </Link>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
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
          <span>{az.auth.loginButton}</span>
        )}
      </button>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-600">
          {az.auth.noAccount}{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            {az.auth.registerButton}
          </Link>
        </p>
      </div>
    </form>
  );
};
