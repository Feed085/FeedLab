import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthorApplicationsPage } from './AuthorApplicationsPage';
import { adminApi } from '../api/adminApi';
import { az } from '@/i18n/az';

describe('AuthorApplicationsPage Component', () => {
  const mockApplications = [
    {
      _id: 'app-mod-1',
      userId: { _id: 'u-1', fullName: 'Elvin Həsənov', email: 'elvin@feedlab.az' } as any,
      fullName: 'Elvin Həsənov',
      bio: 'Robototexnika və süni intellekt üzrə 3 illik təcrübə',
      skills: ['ROS', 'Python', 'Arduino'],
      portfolioUrl: 'https://github.com/elvin/robotics',
      status: 'PENDING' as const,
      createdAt: '2026-11-24T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders author applications table with applicant details and skills', async () => {
    vi.spyOn(adminApi, 'getAuthorApplications').mockResolvedValue({
      data: mockApplications,
      meta: { total: 1, page: 1, limit: 10, pages: 1 },
    });

    render(
      <MemoryRouter>
        <AuthorApplicationsPage />
      </MemoryRouter>,
    );

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toContain(az.admin.authorApplications.title);
    expect(screen.getByText('Elvin Həsənov')).toBeDefined();
    expect(screen.getByText('ROS')).toBeDefined();
    expect(screen.getByText('Python')).toBeDefined();
    expect(screen.getByText(az.admin.authorApplications.approve)).toBeDefined();
  });

  it('approves an application when admin confirms', async () => {
    vi.spyOn(adminApi, 'getAuthorApplications').mockResolvedValue({
      data: mockApplications,
      meta: { total: 1, page: 1, limit: 10, pages: 1 },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(adminApi, 'reviewAuthorApplication').mockResolvedValue({
      ...mockApplications[0],
      status: 'APPROVED',
    });

    render(
      <MemoryRouter>
        <AuthorApplicationsPage />
      </MemoryRouter>,
    );

    const approveBtn = await screen.findByText(az.admin.authorApplications.approve);
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(adminApi.reviewAuthorApplication).toHaveBeenCalledWith(
        'app-mod-1',
        expect.objectContaining({ action: 'APPROVE' }),
      );
    });
  });
});
