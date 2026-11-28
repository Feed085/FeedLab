import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { ordersApi } from './orders.api';

describe('MyOrdersPage Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockOrders = [
    {
      _id: 'ord-1',
      orderNumber: 'ORD-1001',
      price: 25.0,
      currency: 'AZN',
      status: 'PAID',
      createdAt: '2026-11-24T00:00:00.000Z',
      projectId: {
        _id: 'p-1',
        title: 'ESP32 Hava Stansiyası',
        slug: 'esp32-hava-stansiyasi',
        publicFiles: [{ fileId: 'f-1', originalName: 'firmware.bin' }],
      },
    },
    {
      _id: 'ord-2',
      orderNumber: 'ORD-1002',
      price: 40.0,
      currency: 'AZN',
      status: 'REFUND_REQUESTED',
      createdAt: '2026-11-24T00:00:00.000Z',
      projectId: {
        _id: 'p-2',
        title: 'CNC Lazer Sxemi',
        slug: 'cnc-lazer-sxemi',
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ordersApi, 'getMyOrders').mockResolvedValue({
      data: mockOrders as any,
      orders: mockOrders as any,
      total: 2,
    });
  });

  it('renders orders list, status badges, and download button for paid orders', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MyOrdersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('ORD-1001')).toBeDefined();
    expect(screen.getByText('ESP32 Hava Stansiyası')).toBeDefined();
    expect(screen.getByText('25.00 AZN')).toBeDefined();
    expect(screen.getByText('Ödənilib')).toBeDefined();
    expect(screen.getByRole('button', { name: /Faylları Yüklə/i })).toBeDefined();

    expect(screen.getByText('ORD-1002')).toBeDefined();
    expect(screen.getByText('CNC Lazer Sxemi')).toBeDefined();
    expect(screen.getByText('Geri qaytarılma gözləyir')).toBeDefined();
  });
});
