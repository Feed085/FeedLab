import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from './HealthBadge';
import * as useHealthModule from '@/hooks/useHealth';

vi.mock('@/hooks/useHealth');

describe('HealthBadge Component', () => {
  it('renders loading state when health query is pending', () => {
    vi.spyOn(useHealthModule, 'useHealth').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<HealthBadge />);
    expect(screen.getByTestId('health-badge-loading')).toBeDefined();
    expect(screen.getByText('Yüklənir...')).toBeDefined();
  });

  it('renders error state when backend is disconnected', () => {
    vi.spyOn(useHealthModule, 'useHealth').mockReturnValue({
      data: { status: 'error', database: 'disconnected', timestamp: '' },
      isLoading: false,
      isError: false,
    } as any);

    render(<HealthBadge />);
    expect(screen.getByTestId('health-badge-error')).toBeDefined();
    expect(screen.getByText('Verilənlər bazası: Qoşulmayıb')).toBeDefined();
  });

  it('renders operational state when database is connected', () => {
    vi.spyOn(useHealthModule, 'useHealth').mockReturnValue({
      data: { status: 'ok', database: 'connected', timestamp: '', version: '0.1.0' },
      isLoading: false,
      isError: false,
    } as any);

    render(<HealthBadge />);
    expect(screen.getByTestId('health-badge-ok')).toBeDefined();
    expect(screen.getByText('Verilənlər bazası: Qoşulub')).toBeDefined();
  });
});
