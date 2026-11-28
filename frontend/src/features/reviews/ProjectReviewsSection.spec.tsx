import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectReviewsSection } from './components/ProjectReviewsSection';
import { reviewsApi } from './reviews.api';
import * as AuthContextModule from '../auth/AuthContext';

describe('ProjectReviewsSection Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockReviews = [
    {
      _id: 'rev-1',
      projectId: 'proj-1',
      rating: 5,
      comment: 'Əla layihədir, montaj təlimatı çox anlaşıqlıdır!',
      isVerifiedPurchase: true,
      user: { fullName: 'Nicat Qasımov' },
      authorReply: {
        text: 'Rəyiniz üçün təşəkkür edirik!',
        repliedAt: '2026-11-24T00:00:00.000Z',
      },
      createdAt: '2026-11-24T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u-1', fullName: 'Nicat' } as any,
      tokens: null,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    vi.spyOn(reviewsApi, 'getProjectReviews').mockResolvedValue({
      data: mockReviews as any,
      reviews: mockReviews as any,
      averageRating: 5.0,
      totalReviews: 1,
    });
  });

  it('renders average rating, verified buyer badge, and official author reply', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectReviewsSection projectId="proj-1" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Nicat Qasımov')).toBeDefined();
    expect(screen.getByText('Təsdiqlənmiş Alıcı')).toBeDefined();
    expect(screen.getByText('Əla layihədir, montaj təlimatı çox anlaşıqlıdır!')).toBeDefined();
    expect(screen.getByText('Müəllifin Rəsmi Cavabı')).toBeDefined();
    expect(screen.getByText('Rəyiniz üçün təşəkkür edirik!')).toBeDefined();
  });
});
