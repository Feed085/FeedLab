import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import * as AuthContextModule from '@/features/auth/AuthContext';

describe('AppLayout Component', () => {
  it('renders Header, Outlet content, and Footer', () => {
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
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Məzmun sahəsi</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toBeDefined();
    expect(screen.getByText('Məzmun sahəsi')).toBeDefined();
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });
});
