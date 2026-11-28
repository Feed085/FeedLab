import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectDetailsPage } from './ProjectDetailsPage';
import * as useProjectModule from './hooks/useProject';
import * as useClaimFreeProjectModule from './hooks/useClaimFreeProject';
import * as AuthContextModule from '../auth/AuthContext';
import type { Project } from './types';

describe('ProjectDetailsPage Component', () => {
  const sampleProject: Project = {
    _id: 'proj-detail-1',
    title: 'Ağıllı İstixana Sistemi',
    slug: 'agilli-istixana-sistemi',
    shortDescription: 'ESP32 əsaslı tam avtomatlaşdırılmış istixana.',
    fullDescription: 'Daxili laboratoriya mühitində yoxlanılmış dəqiq sistem.',
    objectives: [
      'Real vaxt monitorinqi',
      'Avtomatik havalandırma',
    ],
    workingPrinciple: 'ESP32 sensorları oxuyur və releləri idarə edir.',
    components: [
      {
        name: 'ESP32 DevKit',
        quantity: 1,
        estimatedCostAzn: 14.0,
        notes: 'MCU',
      },
      {
        name: 'DHT22 Sensor',
        quantity: 1,
        estimatedCostAzn: 8.5,
        notes: 'Rütubət sensoru',
      },
    ],
    installationGuide: '1. PlatformIO açın.\n2. Kodu yükləyin.',
    hardwareRequirements: '5V 2A qida mənbəyi.',
    systemRequirements: 'VS Code, PlatformIO.',
    price: 0, // Free project
    currency: 'AZN',
    category: { _id: 'c-1', name: 'IoT / Ağıllı Ev', slug: 'smart-home' },
    technologies: [{ _id: 't-1', name: 'ESP32', slug: 'esp32' }],
    author: { _id: 'a-1', fullName: 'Əli Məmmədov', email: 'ali@feedlab.az' },
    status: 'APPROVED',
    rating: 4.8,
    salesCount: 15,
    viewsCount: 150,
    publicFiles: [
      {
        fileId: 'f-1',
        originalName: 'schematic.pdf',
        fileSize: 1048576,
        fileType: 'application/pdf',
        isPreview: true,
      },
    ],
    createdAt: '2026-11-24T00:00:00.000Z',
  };

  const mockClaimMutateAsync = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(useProjectModule, 'useProject').mockReturnValue({
      data: sampleProject,
      isLoading: false,
      isError: false,
    } as any);

    vi.spyOn(useClaimFreeProjectModule, 'useClaimFreeProject').mockReturnValue({
      mutateAsync: mockClaimMutateAsync,
      isPending: false,
    } as any);
  });

  const renderComponent = (isAuthenticated = false) => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: isAuthenticated ? ({ _id: 'u-1', fullName: 'Test User' } as any) : null,
      tokens: isAuthenticated ? ({ accessToken: 'token' } as any) : null,
      isAuthenticated,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
    });

    return render(
      <MemoryRouter initialEntries={['/projects/agilli-istixana-sistemi']}>
        <Routes>
          <Route path="/projects/:slug" element={<ProjectDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders project header, breadcrumbs, price, and author', () => {
    renderComponent();

    expect(screen.getAllByText('Ağıllı İstixana Sistemi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('IoT / Ağıllı Ev').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ESP32').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4.8')).toBeDefined();
    expect(screen.getByText('Pulsuz')).toBeDefined();
  });

  it('navigates across all technical tabs and displays content', () => {
    renderComponent();

    // Tab 1: Overview (active by default)
    expect(screen.getByText('Layihənin Əsas Məqsədləri')).toBeDefined();
    expect(screen.getByText('Real vaxt monitorinqi')).toBeDefined();

    // Tab 2: BOM
    fireEvent.click(screen.getByRole('button', { name: /BOM \/ Komponentlər/i }));
    expect(screen.getByText('ESP32 DevKit')).toBeDefined();
    expect(screen.getByText('DHT22 Sensor')).toBeDefined();

    // Tab 3: Guide
    fireEvent.click(screen.getByRole('button', { name: /Bələdçi & Tələblər/i }));
    expect(screen.getByText('ESP32 sensorları oxuyur və releləri idarə edir.')).toBeDefined();
    expect(screen.getByText(/PlatformIO açın/i)).toBeDefined();

    // Tab 4: Author
    fireEvent.click(screen.getByRole('button', { name: /Müəllif/i }));
    expect(screen.getByText('ali@feedlab.az')).toBeDefined();
    expect(screen.getByText('Təsdiqlənmiş Müəllif')).toBeDefined();

    // Tab 5: Files
    fireEvent.click(screen.getByRole('button', { name: /Fayllar/i }));
    expect(screen.getByText('schematic.pdf')).toBeDefined();
    expect(screen.getByText(/1024.0 KB/i)).toBeDefined();
  });

  it('displays login required prompt when unauthenticated user attempts to claim free project', () => {
    renderComponent(false);

    const claimBtn = screen.getByRole('button', { name: /Pulsuz Əldə Et/i });
    fireEvent.click(claimBtn);

    expect(screen.getByText('Giriş Tələb Olunur')).toBeDefined();
    expect(screen.getByText(/əvvəlcə sistemə daxil olun/i)).toBeDefined();
  });

  it('calls claimFreeProject and displays success banner when authenticated user claims', async () => {
    mockClaimMutateAsync.mockResolvedValue({
      success: true,
      message: 'Layihə uğurla əldə edildi!',
      orderId: 'order-123',
    });

    renderComponent(true);

    const claimBtn = screen.getByRole('button', { name: /Pulsuz Əldə Et/i });
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(mockClaimMutateAsync).toHaveBeenCalledWith('proj-detail-1');
      expect(screen.getByText('Layihə uğurla əldə edildi!')).toBeDefined();
      expect(screen.getByText('Sifarişlərimə keç')).toBeDefined();
    });
  });

  it('displays "İndi Satın Al" button when project price > 0', () => {
    vi.spyOn(useProjectModule, 'useProject').mockReturnValue({
      data: {
        ...sampleProject,
        price: 35.0,
      },
      isLoading: false,
      isError: false,
    } as any);

    renderComponent(true);

    expect(screen.getByRole('button', { name: /İndi Satın Al/i })).toBeDefined();
    expect(screen.getByText('35.00 AZN')).toBeDefined();
  });
});
