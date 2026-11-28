import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
import { adminApi } from '../api/adminApi';
import { az } from '@/i18n/az';

describe('AdminDashboardPage Component', () => {
  const mockMetrics = {
    totalUsers: 140,
    totalAuthors: 25,
    totalProjects: 60,
    totalOrders: 180,
    totalRevenueAZN: 4500.0,
    platformCommissionAZN: 900.0,
    pendingProjectsCount: 4,
    pendingApplicationsCount: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders platform metrics in AZN currency and quick navigation links', async () => {
    vi.spyOn(adminApi, 'getMetrics').mockResolvedValue(mockMetrics);

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );

    const titleEl = await screen.findByText(az.admin.dashboardTitle);
    expect(titleEl).toBeDefined();
    expect(screen.getByTestId('metric-users').textContent).toContain('140');
    expect(screen.getByTestId('metric-authors').textContent).toContain('25');
    expect(screen.getByTestId('metric-revenue').textContent).toContain('4500.00 ₼');
    expect(screen.getByTestId('metric-orders').textContent).toContain('180');

    // Quick links
    expect(screen.getAllByText(az.admin.nav.reviewQueue).length).toBeGreaterThan(0);
    expect(screen.getAllByText(az.admin.nav.authorApplications).length).toBeGreaterThan(0);
    expect(screen.getAllByText(az.admin.nav.users).length).toBeGreaterThan(0);
  });
});
