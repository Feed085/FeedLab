import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthorDashboardPage } from './AuthorDashboardPage';
import { authorApi } from '../api/authorApi';
import { az } from '@/i18n/az';

describe('AuthorDashboardPage Component', () => {
  const mockDashboardData = {
    balance: {
      availableBalance: 240.5,
      totalEarnings: 320.0,
      pendingClearance: 0,
      currency: 'AZN' as const,
    },
    stats: {
      totalSales: 12,
      totalProjects: 3,
      draftProjects: 1,
      submittedProjects: 1,
      approvedProjects: 1,
      rejectedProjects: 0,
      averageRating: 4.8,
    },
    projects: [
      {
        _id: 'p-1',
        title: 'ESP32 IoT Stansiyası',
        slug: 'esp32-iot-stansiyasi',
        shortDescription: 'Hava stansiyası',
        price: 30.0,
        currency: 'AZN' as const,
        status: 'APPROVED' as const,
        rating: 4.8,
        salesCount: 12,
        createdAt: '2026-11-24T00:00:00.000Z',
      },
      {
        _id: 'p-2',
        title: 'Arduino Qaralama Layihə',
        slug: 'arduino-qaralama-layihe',
        shortDescription: 'Qaralama',
        price: 15.0,
        currency: 'AZN' as const,
        status: 'DRAFT' as const,
        rating: 0,
        salesCount: 0,
        createdAt: '2026-11-24T00:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metrics cards with AZN currency and project inventory', async () => {
    vi.spyOn(authorApi, 'getDashboard').mockResolvedValue(mockDashboardData);

    render(
      <MemoryRouter>
        <AuthorDashboardPage />
      </MemoryRouter>,
    );

    const titleEl = await screen.findByText(az.author.dashboardTitle);
    expect(titleEl).toBeDefined();
    expect(screen.getByTestId('metric-balance').textContent).toContain('240.50 ₼');
    expect(screen.getByTestId('metric-sales').textContent).toContain('12');
    expect(screen.getByTestId('metric-projects').textContent).toContain('3');

    // Projects list
    expect(screen.getByText('ESP32 IoT Stansiyası')).toBeDefined();
    expect(screen.getByText('Arduino Qaralama Layihə')).toBeDefined();
  });

  it('submits a draft project for review on button click', async () => {
    vi.spyOn(authorApi, 'getDashboard').mockResolvedValue(mockDashboardData);
    vi.spyOn(authorApi, 'submitProject').mockResolvedValue({
      ...mockDashboardData.projects[1],
      status: 'SUBMITTED',
    });

    render(
      <MemoryRouter>
        <AuthorDashboardPage />
      </MemoryRouter>,
    );

    const submitBtn = await screen.findByText(az.author.projectsTable.submitReview);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authorApi.submitProject).toHaveBeenCalledWith('p-2');
    });
  });
});
