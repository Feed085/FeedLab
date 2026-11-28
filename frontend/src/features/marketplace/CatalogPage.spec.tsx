import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CatalogPage } from './CatalogPage';
import * as useProjectsModule from './hooks/useProjects';
import * as useCategoriesModule from './hooks/useCategories';
import * as useTechnologiesModule from './hooks/useTechnologies';
import type { Project } from './types';

describe('CatalogPage Component', () => {
  const mockCategories = [
    { _id: 'cat-1', name: 'IoT / Ağıllı Ev', slug: 'smart-home' },
    { _id: 'cat-2', name: 'Robototexnika', slug: 'robotics' },
  ];

  const mockTechnologies = [
    { _id: 'tech-1', name: 'Arduino', slug: 'arduino' },
    { _id: 'tech-2', name: 'ESP32', slug: 'esp32' },
  ];

  const mockProjects: Project[] = [
    {
      _id: 'p-1',
      title: 'Ağıllı İstixana',
      slug: 'agilli-istixana',
      shortDescription: 'ESP32 ilə istixana',
      price: 25,
      currency: 'AZN',
      category: mockCategories[0],
      technologies: [mockTechnologies[1]],
      author: { _id: 'a-1', fullName: 'Müəllif 1' },
      status: 'APPROVED',
      rating: 4.8,
      salesCount: 10,
      createdAt: '2026-11-24T00:00:00.000Z',
    },
    {
      _id: 'p-2',
      title: 'Pulsuz Arduino Layihəsi',
      slug: 'pulsuz-arduino-layihesi',
      shortDescription: 'Başlanğıc üçün pulsuz',
      price: 0,
      currency: 'AZN',
      category: mockCategories[1],
      technologies: [mockTechnologies[0]],
      author: { _id: 'a-2', fullName: 'Müəllif 2' },
      status: 'APPROVED',
      rating: 4.9,
      salesCount: 100,
      createdAt: '2026-11-24T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(useCategoriesModule, 'useCategories').mockReturnValue({
      data: mockCategories,
      isLoading: false,
    } as any);

    vi.spyOn(useTechnologiesModule, 'useTechnologies').mockReturnValue({
      data: mockTechnologies,
      isLoading: false,
    } as any);
  });

  it('renders catalog title, search input, filters, sort dropdown, and projects', () => {
    vi.spyOn(useProjectsModule, 'useProjects').mockReturnValue({
      data: {
        data: mockProjects,
        meta: { total: 2, page: 1, limit: 12, pages: 1 },
      },
      isLoading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/catalog']}>
        <CatalogPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Marketplace və Layihə Kataloqu')).toBeDefined();
    expect(screen.getByPlaceholderText(/Layihə adı, açar söz/i)).toBeDefined();
    expect(screen.getByText('Ağıllı İstixana')).toBeDefined();
    expect(screen.getByText('Pulsuz Arduino Layihəsi')).toBeDefined();
    expect(screen.getByText(/2 layihə tapıldı/i)).toBeDefined();
  });

  it('renders Azerbaijani empty state when no projects match', () => {
    vi.spyOn(useProjectsModule, 'useProjects').mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, page: 1, limit: 12, pages: 0 },
      },
      isLoading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/catalog?q=NonExistent']}>
        <CatalogPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Heç bir layihə tapılmadı')).toBeDefined();
    expect(screen.getByText(/Filtrləri təmizlə/i)).toBeDefined();
  });

  it('renders pagination controls when total pages > 1', () => {
    vi.spyOn(useProjectsModule, 'useProjects').mockReturnValue({
      data: {
        data: mockProjects,
        meta: { total: 24, page: 1, limit: 12, pages: 2 },
      },
      isLoading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/catalog']}>
        <CatalogPage />
      </MemoryRouter>,
    );

    const prevBtn = screen.getByLabelText('Əvvəlki səhifə');
    const nextBtn = screen.getByLabelText('Növbəti səhifə');
    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();
  });

  it('allows selecting sort option', () => {
    vi.spyOn(useProjectsModule, 'useProjects').mockReturnValue({
      data: {
        data: mockProjects,
        meta: { total: 2, page: 1, limit: 12, pages: 1 },
      },
      isLoading: false,
    } as any);

    render(
      <MemoryRouter initialEntries={['/catalog']}>
        <CatalogPage />
      </MemoryRouter>,
    );

    const sortSelect = screen.getByLabelText('Sıralama') as HTMLSelectElement;
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });
    expect(sortSelect.value).toBe('price_asc');
  });
});
