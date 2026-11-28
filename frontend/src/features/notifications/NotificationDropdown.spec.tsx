import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationDropdown } from './components/NotificationDropdown';
import { notificationsApi } from './notifications.api';
import * as AuthContextModule from '../auth/AuthContext';

describe('NotificationDropdown Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockNotifications = [
    {
      _id: 'notif-1',
      userId: 'u-1',
      type: 'ORDER_SUCCESS',
      title: 'Ödəniş təsdiqləndi',
      message: 'Sifarişiniz uğurla ödənildi.',
      link: '/orders/my',
      isRead: false,
      createdAt: '2026-11-24T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u-1', fullName: 'Elcan' } as any,
      tokens: null,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    vi.spyOn(notificationsApi, 'getNotifications').mockResolvedValue({
      data: mockNotifications as any,
      notifications: mockNotifications as any,
      unreadCount: 1,
      total: 1,
    });
  });

  it('renders bell with unread badge and opens dropdown with notification details', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const bellBtn = screen.getByRole('button', { name: /Bildirişlər/i });
    expect(bellBtn).toBeDefined();
    expect(await screen.findByText('1')).toBeDefined();

    fireEvent.click(bellBtn);

    expect(screen.getByText('Ödəniş təsdiqləndi')).toBeDefined();
    expect(screen.getByText('Sifarişiniz uğurla ödənildi.')).toBeDefined();
    expect(screen.getByText('Hamısını oxunmuş et')).toBeDefined();
  });
});
