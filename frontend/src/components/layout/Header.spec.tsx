import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';
import * as AuthContextModule from '@/features/auth/AuthContext';
import { notificationsApi } from '@/features/notifications/notifications.api';

describe('Header Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(notificationsApi, 'getNotifications').mockResolvedValue({
      data: [],
      notifications: [],
      unreadCount: 0,
      total: 0,
    });
  });

  it('renders 5 Azerbaijani nav links and login/register buttons when unauthenticated', () => {
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
      <MemoryRouter initialEntries={['/catalog']}>
        <Header />
      </MemoryRouter>,
    );

    const catalogLink = screen.getByRole('link', { name: 'Kataloq' });
    const freeLink = screen.getByRole('link', { name: 'Pulsuz Layihələr' });
    const finderLink = screen.getByRole('link', { name: 'Komponentlərimlə Tap' });
    const libraryLink = screen.getByRole('link', { name: 'Kitabxana' });
    const authorsLink = screen.getByRole('link', { name: 'Müəlliflər' });

    expect(catalogLink.getAttribute('href')).toBe('/catalog');
    expect(freeLink.getAttribute('href')).toBe('/catalog?freeOnly=true');
    expect(finderLink.getAttribute('href')).toBe('/component-finder');
    expect(libraryLink.getAttribute('href')).toBe('/library');
    expect(authorsLink.getAttribute('href')).toBe('/authors');

    expect(screen.getByText('Daxil ol')).toBeDefined();
    expect(screen.getByText('Qeydiyyat')).toBeDefined();
  });

  it('renders user fullName, role badge, and create project CTA for AUTHOR', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        _id: 'u1',
        email: 'author@feedlab.az',
        fullName: 'Rəşad Əliyev',
        role: 'AUTHOR',
      },
      tokens: { accessToken: 't', refreshToken: 'r' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByText('Rəşad Əliyev')).toBeDefined();
    expect(screen.getByText('Müəllif')).toBeDefined();
    expect(screen.getByRole('link', { name: /\+ Layihə Yarat/i }).getAttribute('href')).toBe(
      '/author/projects/new',
    );
  });

  it('opens dropdown and executes logout when clicking logout', () => {
    const mockLogout = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        _id: 'u1',
        email: 'user@feedlab.az',
        fullName: 'İstifadəçi Adı',
        role: 'USER',
      },
      tokens: { accessToken: 't', refreshToken: 'r' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      hasRole: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const userBtn = screen.getByRole('button', { name: /İstifadəçi Adı/i });
    fireEvent.click(userBtn);

    const logoutBtn = screen.getByRole('button', { name: /çıxış/i });
    expect(logoutBtn).toBeDefined();

    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('toggles mobile navigation drawer and closes when clicking a drawer link', () => {
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
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const toggleBtn = screen.getByRole('button', { name: 'Menyunu aç' });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggleBtn);
    expect(screen.getByRole('navigation', { name: 'Mobil naviqasiya' })).toBeDefined();

    const mobileLibraryLink = screen.getAllByRole('link', { name: 'Kitabxana' })[1];
    fireEvent.click(mobileLibraryLink);

    expect(screen.queryByRole('navigation', { name: 'Mobil naviqasiya' })).toBeNull();
  });
});
