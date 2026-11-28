import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckoutModal } from './components/CheckoutModal';
import * as AuthContextModule from '../auth/AuthContext';
import { ordersApi } from './orders.api';

describe('CheckoutModal Component', () => {
  const sampleProject = {
    _id: 'proj-101',
    title: 'Arduino Robot Kolu',
    slug: 'arduino-robot-kolu',
    price: 50.0,
    currency: 'AZN',
    publicFiles: [{ fileId: 'file-1', originalName: 'robot.zip' }],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u-1', fullName: 'Alıcı Rəşad' } as any,
      tokens: null,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });
  });

  it('renders project title, AZN price, and 80/20 breakdown transparency', () => {
    render(
      <MemoryRouter>
        <CheckoutModal isOpen={true} onClose={vi.fn()} project={sampleProject} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Arduino Robot Kolu')).toBeDefined();
    expect(screen.getByText('50.00 AZN')).toBeDefined();
    expect(screen.getByText(/Müəllifin payı \(80%\)/i)).toBeDefined();
    expect(screen.getByText('40.00 AZN')).toBeDefined();
    expect(screen.getByText(/Platforma xidmət haqqı \(20%\)/i)).toBeDefined();
    expect(screen.getByText('10.00 AZN')).toBeDefined();
  });

  it('calls checkout and payment simulation when confirming payment', async () => {
    const mockCheckout = vi.spyOn(ordersApi, 'checkout').mockResolvedValue({
      _id: 'ord-999',
      orderNumber: 'ORD-2026-999',
      status: 'PENDING',
    } as any);

    const mockSimulate = vi.spyOn(ordersApi, 'simulatePayment').mockResolvedValue({
      orderId: 'ord-999',
      status: 'PAID',
      order: { _id: 'ord-999', status: 'PAID' },
    } as any);

    render(
      <MemoryRouter>
        <CheckoutModal isOpen={true} onClose={vi.fn()} project={sampleProject} />
      </MemoryRouter>,
    );

    const payBtn = screen.getByRole('button', { name: /Ödənişi Təsdiqlə/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledWith('proj-101', 'CARD');
      expect(mockSimulate).toHaveBeenCalledWith('ord-999', 'SUCCESS');
      expect(screen.getByText(/Təbriklər!/i)).toBeDefined();
    });
  });
});
