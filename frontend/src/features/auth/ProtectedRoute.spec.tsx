import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from './AuthContext';

describe('ProtectedRoute Component', () => {
  it('renders loading spinner while auth is initializing', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Məxfi Məzmun</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Yüklənir...')).toBeDefined();
    expect(screen.queryByText('Məxfi Məzmun')).toBeNull();
  });

  it('redirects unauthenticated user to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Məxfi Məzmun</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Giriş Səhifəsi</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Giriş Səhifəsi')).toBeDefined();
    expect(screen.queryByText('Məxfi Məzmun')).toBeNull();
  });

  it('renders protected content when user is authenticated with required role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u1', email: 'admin@f.az', fullName: 'Admin', role: 'ADMIN' },
      tokens: { accessToken: 'tok', refreshToken: 'ref' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <div>Admin İdarəetmə Paneli</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin İdarəetmə Paneli')).toBeDefined();
  });

  it('renders localized 403 screen when role is insufficient', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u1', email: 'user@f.az', fullName: 'User', role: 'USER' },
      tokens: { accessToken: 'tok', refreshToken: 'ref' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn().mockReturnValue(false),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <div>Admin İdarəetmə Paneli</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('İcazə verilmədi (403)')).toBeDefined();
    expect(screen.getByText('Bu əməliyyat üçün icazəniz yoxdur.')).toBeDefined();
    expect(screen.queryByText('Admin İdarəetmə Paneli')).toBeNull();
  });
});
