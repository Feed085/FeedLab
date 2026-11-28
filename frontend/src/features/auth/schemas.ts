import { z } from 'zod';
import { az } from '@/i18n/az';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, az.validation.required)
    .email(az.validation.invalidEmail),
  password: z
    .string()
    .min(1, az.validation.required),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, az.validation.required)
      .min(2, az.validation.minFullName),
    email: z
      .string()
      .min(1, az.validation.required)
      .email(az.validation.invalidEmail),
    password: z
      .string()
      .min(1, az.validation.required)
      .min(8, az.validation.minPassword),
    confirmPassword: z
      .string()
      .min(1, az.validation.required),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: az.validation.passwordMismatch,
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, az.validation.required)
    .email(az.validation.invalidEmail),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, az.validation.required)
      .min(8, az.validation.minPassword),
    confirmPassword: z
      .string()
      .min(1, az.validation.required),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: az.validation.passwordMismatch,
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
