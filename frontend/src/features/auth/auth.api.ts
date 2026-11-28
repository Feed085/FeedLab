import { apiClient } from '@/lib/api';
import type {
  AuthResponse,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordPayload,
  User,
} from './types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', credentials);
    return res.data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
    return res.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const res = await apiClient.get<{ user: User }>('/auth/me');
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', {
      email,
    });
    return res.data;
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', payload);
    return res.data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
    return res.data;
  },
};
