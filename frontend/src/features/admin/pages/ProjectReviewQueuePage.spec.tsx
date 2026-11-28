import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectReviewQueuePage } from './ProjectReviewQueuePage';
import { adminApi } from '../api/adminApi';
import { Project } from '../../marketplace/types';
import { az } from '@/i18n/az';

describe('ProjectReviewQueuePage Component', () => {
  const mockQueue: Project[] = [
    {
      _id: 'proj-mod-1',
      title: 'Avtomatlaşdırılmış Akvarium',
      slug: 'avtomatlasdirilmis-akvarium',
      shortDescription: 'ESP32 ilə akvarium idarəsi',
      price: 25.0,
      currency: 'AZN',
      status: 'SUBMITTED',
      rating: 0,
      salesCount: 0,
      publicFiles: [{ fileId: 'f1', originalName: 'code.zip', fileSize: 1024, fileType: 'zip' }],
      createdAt: '2026-11-24T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders queue table with submitted projects', async () => {
    vi.spyOn(adminApi, 'getReviewQueue').mockResolvedValue({
      data: mockQueue,
      meta: { total: 1, page: 1, limit: 10, pages: 1 },
    });

    render(
      <MemoryRouter>
        <ProjectReviewQueuePage />
      </MemoryRouter>,
    );

    const titleEl = await screen.findByText('Avtomatlaşdırılmış Akvarium');
    expect(titleEl).toBeDefined();
    expect(screen.getByText(az.admin.queue.preview)).toBeDefined();
    expect(screen.getByText(az.admin.queue.approve)).toBeDefined();
    expect(screen.getByText(az.admin.queue.reject)).toBeDefined();
  });

  it('approves a project when admin confirms', async () => {
    vi.spyOn(adminApi, 'getReviewQueue').mockResolvedValue({
      data: mockQueue,
      meta: { total: 1, page: 1, limit: 10, pages: 1 },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(adminApi, 'reviewProject').mockResolvedValue({
      ...mockQueue[0],
      status: 'APPROVED',
    });

    render(
      <MemoryRouter>
        <ProjectReviewQueuePage />
      </MemoryRouter>,
    );

    const approveBtn = await screen.findByText(az.admin.queue.approve);
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(adminApi.reviewProject).toHaveBeenCalledWith('proj-mod-1', {
        action: 'APPROVE',
      });
    });
  });

  it('opens rejection dialog and rejects with mandatory reason', async () => {
    vi.spyOn(adminApi, 'getReviewQueue').mockResolvedValue({
      data: mockQueue,
      meta: { total: 1, page: 1, limit: 10, pages: 1 },
    });
    vi.spyOn(adminApi, 'reviewProject').mockResolvedValue({
      ...mockQueue[0],
      status: 'REJECTED',
    });

    render(
      <MemoryRouter>
        <ProjectReviewQueuePage />
      </MemoryRouter>,
    );

    const rejectBtn = await screen.findByText(az.admin.queue.reject);
    fireEvent.click(rejectBtn);

    // Dialog opens
    const dialogTitle = screen.getByText(az.admin.queue.rejectDialogTitle);
    expect(dialogTitle).toBeDefined();

    const textarea = screen.getByPlaceholderText(az.admin.queue.rejectionReasonPlaceholder);
    fireEvent.change(textarea, {
      target: { value: 'Sxemlərdə rele xətləri tam çəkilməyib və sənədləşmə zəifdir.' },
    });

    // Submit rejection
    const submitRejectBtn = screen.getAllByText(az.admin.queue.reject)[1];
    fireEvent.click(submitRejectBtn);

    await waitFor(() => {
      expect(adminApi.reviewProject).toHaveBeenCalledWith('proj-mod-1', {
        action: 'REJECT',
        rejectionReason: 'Sxemlərdə rele xətləri tam çəkilməyib və sənədləşmə zəifdir.',
      });
    });
  });
});
