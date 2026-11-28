import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as useCategoriesModule from './hooks/useCategories';
import * as useProjectsModule from './hooks/useProjects';
import type { Project } from './types';

describe('HomePage Component', () => {
  const mockCategories = [
    { _id: 'c-1', name: 'IoT / Ağıllı Ev', slug: 'smart-home', description: 'Ağıllı ev layihələri' },
    { _id: 'c-2', name: 'Robototexnika', slug: 'robotics', description: 'Robot texnologiyaları' },
    { _id: 'c-1-dup', name: 'IoT / Ağıllı Ev', slug: 'smart-home', description: 'Təkrar kateqoriya' },
  ];

  const mockProject: Project = {
    _id: 'p-1',
    title: 'Arduino Hava Stansiyası',
    slug: 'arduino-hava-stansiyasi',
    shortDescription: 'Real vaxt hava monitorinqi',
    price: 15.0,
    currency: 'AZN',
    category: mockCategories[0],
    technologies: [{ _id: 't-1', name: 'Arduino', slug: 'arduino' }],
    author: { _id: 'a-1', fullName: 'Əli Məmmədov' },
    status: 'APPROVED',
    rating: 4.9,
    salesCount: 20,
    createdAt: '2026-11-24T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(useCategoriesModule, 'useCategories').mockReturnValue({
      data: mockCategories,
      isLoading: false,
    } as any);

    vi.spyOn(useProjectsModule, 'useProjects').mockReturnValue({
      data: {
        data: [mockProject],
        meta: { total: 1, page: 1, limit: 3, pages: 1 },
      },
      isLoading: false,
    } as any);
  });

  it('renders hero banner, deduplicated categories, featured, and latest sections', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Hero
    expect(screen.getByText('Öz Elektronika Cihazını Özün Yığ və Öyrən')).toBeDefined();
    expect(screen.getByPlaceholderText(/Layihə adı, açar söz/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Layihələri Kəşf Et/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Komponentlərimlə Tap/i })).toBeDefined();

    const heroImg = screen.getByAltText(/ESP32 mikrokontroller/i);
    expect(heroImg.getAttribute('src')).toBe('/images/hero-esp32.jpg');

    // Categories (deduplicated by slug)
    expect(screen.getByText('Layihə kateqoriyaları')).toBeDefined();
    const categoryLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('/catalog?category='));
    expect(categoryLinks).toHaveLength(2);
    expect(screen.getByText('Robototexnika')).toBeDefined();

    // Featured & Latest
    expect(screen.getByText('Seçilmiş Layihələr')).toBeDefined();
    expect(screen.getByText('Ən Son Əlavə Edilən Layihələr')).toBeDefined();
    expect(screen.getAllByText('Arduino Hava Stansiyası').length).toBeGreaterThanOrEqual(1);

    // Free promo
    expect(screen.getByText('Tələbələr üçün Pulsuz Mühəndislik Layihələri')).toBeDefined();
  });

  it('allows typing into the hero search input', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText(/Layihə adı, açar söz/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Robot' } });
    expect(searchInput.value).toBe('Robot');
  });
});
