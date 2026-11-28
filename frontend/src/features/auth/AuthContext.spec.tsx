import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from './auth.api';

vi.mock('./auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('AuthContext & useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('initializes unauthenticated state when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
  });

  it('updates state on successful login', async () => {
    const mockUser = {
      _id: 'u1',
      email: 'user@feedlab.az',
      fullName: 'Əli Əliyev',
      role: 'USER' as const,
    };
    const mockResponse = {
      user: mockUser,
      accessToken: 'access-jwt',
      refreshToken: 'refresh-jwt',
    };
    vi.mocked(authApi.login).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'user@feedlab.az', password: 'Password123!' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('user@feedlab.az');
    expect(result.current.tokens?.accessToken).toBe('access-jwt');
    expect(localStorage.getItem('feedlab_access_token')).toBe('access-jwt');
  });

  it('clears state and storage on logout', async () => {
    localStorage.setItem('feedlab_access_token', 'token');
    localStorage.setItem('feedlab_refresh_token', 'refresh');
    localStorage.setItem(
      'feedlab_user',
      JSON.stringify({ _id: 'u1', email: 'u@f.az', fullName: 'U', role: 'USER' }),
    );
    vi.mocked(authApi.logout).mockResolvedValue({ success: true, message: 'OK' });
    vi.mocked(authApi.getMe).mockResolvedValue({
      user: { _id: 'u1', email: 'u@f.az', fullName: 'U', role: 'USER' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
    expect(localStorage.getItem('feedlab_access_token')).toBeNull();
  });

  it('hasRole returns true for matching role and false otherwise', async () => {
    const mockUser = {
      _id: 'u1',
      email: 'admin@feedlab.az',
      fullName: 'Admin',
      role: 'ADMIN' as const,
    };
    vi.mocked(authApi.login).mockResolvedValue({
      user: mockUser,
      accessToken: 'tok',
      refreshToken: 'ref',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'admin@feedlab.az', password: 'P' });
    });

    expect(result.current.hasRole('ADMIN')).toBe(true);
    expect(result.current.hasRole(['ADMIN', 'MODERATOR'])).toBe(true);
    expect(result.current.hasRole('USER')).toBe(false);
  });

  it('clears auth state when auth:session-expired event is dispatched', async () => {
    const mockUser = {
      _id: 'u1',
      email: 'user@feedlab.az',
      fullName: 'User',
      role: 'USER' as const,
    };
    vi.mocked(authApi.login).mockResolvedValue({
      user: mockUser,
      accessToken: 'tok',
      refreshToken: 'ref',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'user@feedlab.az', password: 'P' });
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
