import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';
import * as AuthContextModule from '../AuthContext';

describe('RegisterForm Component', () => {
  const renderForm = (mockRegister = vi.fn()) => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    return render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>,
    );
  };

  it('rejects password shorter than 8 characters', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Ad və Soyad'), {
      target: { value: 'Əli Əliyev' },
    });
    fireEvent.change(screen.getByLabelText('E-poçt ünvanı'), {
      target: { value: 'ali@feedlab.az' },
    });
    fireEvent.change(screen.getByLabelText('Şifrə'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText('Şifrənin təsdiqi'), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Qeydiyyatdan keç' }));

    await waitFor(() => {
      expect(screen.getByText('Şifrə ən azı 8 simvol olmalıdır')).toBeDefined();
    });
  });

  it('rejects mismatched password confirmation', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Ad və Soyad'), {
      target: { value: 'Əli Əliyev' },
    });
    fireEvent.change(screen.getByLabelText('E-poçt ünvanı'), {
      target: { value: 'ali@feedlab.az' },
    });
    fireEvent.change(screen.getByLabelText('Şifrə'), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText('Şifrənin təsdiqi'), {
      target: { value: 'DifferentPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Qeydiyyatdan keç' }));

    await waitFor(() => {
      expect(screen.getByText('Şifrələr uyğun gəlmir')).toBeDefined();
    });
  });

  it('displays duplicate email conflict on 409 response', async () => {
    const mockRegister = vi.fn().mockRejectedValue({
      response: {
        status: 409,
        data: { message: 'Bu e-poçt ünvanı artıq qeydiyyatdan keçib' },
      },
    });

    renderForm(mockRegister);

    fireEvent.change(screen.getByLabelText('Ad və Soyad'), {
      target: { value: 'Əli Əliyev' },
    });
    fireEvent.change(screen.getByLabelText('E-poçt ünvanı'), {
      target: { value: 'dup@feedlab.az' },
    });
    fireEvent.change(screen.getByLabelText('Şifrə'), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText('Şifrənin təsdiqi'), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Qeydiyyatdan keç' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Bu e-poçt ünvanı artıq qeydiyyatdan keçib')).toBeDefined();
    });
  });
});
