import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  AuthContextValue,
  AuthResponse,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  User,
  UserRole,
} from './types';
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredAuth,
} from '@/lib/api';
import { authApi } from './auth.api';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [tokens, setTokens] = useState<AuthTokens | null>(() => {
    const accessToken = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize user session from /auth/me on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: profile } = await authApi.getMe();
        setUser(profile);
        const refreshToken = getStoredRefreshToken() || '';
        setStoredAuth({ accessToken: token, refreshToken, user: profile });
      } catch {
        // If /auth/me fails (and refresh fails), clear credentials
        clearStoredAuth();
        setUser(null);
        setTokens(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for global session expiration events from api interceptor
    const handleSessionExpired = () => {
      clearStoredAuth();
      setUser(null);
      setTokens(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-expired', handleSessionExpired);
      return () => {
        window.removeEventListener('auth:session-expired', handleSessionExpired);
      };
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await authApi.login(credentials);
    setStoredAuth({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user,
    });
    setUser(res.user);
    setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res;
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const res = await authApi.register(credentials);
    setStoredAuth({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user,
    });
    setUser(res.user);
    setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearStoredAuth();
      setUser(null);
      setTokens(null);
    }
  }, []);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const roleList = Array.isArray(roles) ? roles : [roles];
      return roleList.includes(user.role);
    },
    [user],
  );

  const value: AuthContextValue = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login,
    register,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
