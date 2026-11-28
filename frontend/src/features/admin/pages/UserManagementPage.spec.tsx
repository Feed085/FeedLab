import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserManagementPage } from './UserManagementPage';
import { adminApi } from '../api/adminApi';
import * as AuthContextModule from '@/features/auth/AuthContext';
import { az } from '@/i18n/az';

describe('UserManagementPage Component', () => {
  const currentAdmin = {
    _id: 'admin-1',
    fullName: 'Platform Admin',
    email: 'admin@feedlab.az',
    role: 'ADMIN' as const,
  };

  const mockUsers = [
    {
      _id: 'u-10',
      fullName: 'Tələbə İstifadəçi',
      email: 'student@feedlab.az',
      role: 'USER' as const,
      isActive: true,
      createdAt: '2026-11-20T10:00:00.000Z',
    },
    {
      _id: 'admin-1',
      fullName: 'Platform Admin',
      email: 'admin@feedlab.az',
      role: 'ADMIN' as const,
      isActive: true,
      createdAt: '2026-11-19T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: currentAdmin as any,
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  it('renders user management table and search bar', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      data: mockUsers,
      meta: { total: 2, page: 1, limit: 10, pages: 1 },
    });

    render(
      <MemoryRouter>
        <UserManagementPage />
      </MemoryRouter>,
    );

    const titleEl = await screen.findByText(az.admin.users.title);
    expect(titleEl).toBeDefined();
    expect(screen.getByText('Tələbə İstifadəçi')).toBeDefined();
    expect(screen.getByText('Platform Admin')).toBeDefined();
  });

  it('updates user role when selecting a new role', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      data: mockUsers,
      meta: { total: 2, page: 1, limit: 10, pages: 1 },
    });
    vi.spyOn(adminApi, 'updateUserRole').mockResolvedValue({
      ...mockUsers[0],
      role: 'AUTHOR',
    });

    render(
      <MemoryRouter>
        <UserManagementPage />
      </MemoryRouter>,
    );

    await screen.findByText('Tələbə İstifadəçi');
    const roleSelects = screen.getAllByRole('combobox');
    // First select is the roleFilter in the toolbar, second is user 1, third is current admin
    const userRoleSelect = roleSelects[1];

    fireEvent.change(userRoleSelect, { target: { value: 'AUTHOR' } });

    await waitFor(() => {
      expect(adminApi.updateUserRole).toHaveBeenCalledWith('u-10', 'AUTHOR');
    });
  });

  it('prevents current admin from deactivating or demoting themselves', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      data: mockUsers,
      meta: { total: 2, page: 1, limit: 10, pages: 1 },
    });

    render(
      <MemoryRouter>
        <UserManagementPage />
      </MemoryRouter>,
    );

    await screen.findByText('Platform Admin');

    const roleSelects = screen.getAllByRole('combobox');
    // Current admin's role select is the 3rd combobox (index 2)
    expect((roleSelects[2] as HTMLSelectElement).disabled).toBe(true);

    // The deactivate buttons
    const deactivateBtns = screen.getAllByText('Deaktiv et');
    // Current admin's deactivate button is the second one and should be disabled
    expect((deactivateBtns[1] as HTMLButtonElement).disabled).toBe(true);
  });
});
