import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import * as AuthContextModule from '../AuthContext';

describe('LoginForm Component', () => {
  const renderForm = (mockLogin = vi.fn()) => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    return render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
  };

  it('renders required field validation errors on empty submit', async () => {
    renderForm();

    const submitBtn = screen.getByRole('button', { name: 'Daxil ol' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorMsgs = screen.getAllByText('Bu xana mütləq doldurulmalıdır');
      expect(errorMsgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('validates invalid email format', async () => {
    renderForm();

    const emailInput = screen.getByLabelText('E-poçt ünvanı');
    fireEvent.change(emailInput, { target: { value: 'not-valid-email' } });

    const submitBtn = screen.getByRole('button', { name: 'Daxil ol' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Düzgün e-poçt ünvanı daxil edin')).toBeDefined();
    });
  });

  it('toggles password visibility when eye icon button is clicked', () => {
    renderForm();

    const passwordInput = screen.getByLabelText('Şifrə') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /şifrəni göstər/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');

    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('displays backend error message in red banner on rejected login', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'E-poçt və ya şifrə yanlışdır' },
      },
    });

    renderForm(mockLogin);

    fireEvent.change(screen.getByLabelText('E-poçt ünvanı'), {
      target: { value: 'wrong@feedlab.az' },
    });
    fireEvent.change(screen.getByLabelText('Şifrə'), {
      target: { value: 'WrongPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Daxil ol' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('E-poçt və ya şifrə yanlışdır')).toBeDefined();
    });
  });
});
