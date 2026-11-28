import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthorApplyPage } from './AuthorApplyPage';
import { authorApi } from '../api/authorApi';
import * as AuthContextModule from '@/features/auth/AuthContext';
import { az } from '@/i18n/az';

describe('AuthorApplyPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders application form for regular user', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u-1', fullName: 'Əli Məmmədov', role: 'USER' } as any,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <AuthorApplyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(az.author.applyTitle)).toBeDefined();
    expect(screen.getByPlaceholderText(az.author.applyForm.bioPlaceholder)).toBeDefined();
    expect(screen.getByPlaceholderText(az.author.applyForm.skillsPlaceholder)).toBeDefined();
    expect(screen.getByText(az.author.applyForm.submitButton)).toBeDefined();
  });

  it('renders already author banner when user has AUTHOR role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u-1', fullName: 'Müəllif Əli', role: 'AUTHOR' } as any,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <AuthorApplyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(az.author.applyForm.alreadyAuthorTitle)).toBeDefined();
    expect(screen.getByText(az.author.applyForm.goToDashboard)).toBeDefined();
  });

  it('submits application successfully and shows pending notification', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u-1', fullName: 'Əli Məmmədov', role: 'USER' } as any,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    vi.spyOn(authorApi, 'apply').mockResolvedValue({
      _id: 'app-1',
      userId: 'u-1',
      bio: 'Mikrokontroller təcrübəsi 5 il',
      skills: ['Arduino', 'ESP32'],
      status: 'PENDING',
      createdAt: '2026-11-24T00:00:00.000Z',
    });

    render(
      <MemoryRouter>
        <AuthorApplyPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(az.author.applyForm.bioPlaceholder), {
      target: { value: 'Mikrokontroller təcrübəsi 5 il' },
    });
    fireEvent.change(screen.getByPlaceholderText(az.author.applyForm.skillsPlaceholder), {
      target: { value: 'Arduino, ESP32' },
    });

    fireEvent.click(screen.getByText(az.author.applyForm.submitButton));

    await waitFor(() => {
      expect(authorApi.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: 'Mikrokontroller təcrübəsi 5 il',
          skills: ['Arduino', 'ESP32'],
        }),
      );
    });

    const pendingBanner = await screen.findByText(az.author.applyForm.pendingTitle);
    expect(pendingBanner).toBeDefined();
  });
});
