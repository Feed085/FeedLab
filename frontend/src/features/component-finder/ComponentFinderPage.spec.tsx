import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ComponentFinderPage } from './ComponentFinderPage';
import { componentFinderApi } from './componentFinder.api';
import type { ComponentListResponse, MatchComponentsResponse } from './types';

const mockCatalog: ComponentListResponse = {
  items: [
    {
      _id: 'comp-1',
      slug: 'esp32',
      name: 'ESP32',
      aliases: ['esp-32'],
      category: 'microcontrollers',
      categoryLabel: 'Mikrokontrollerlər',
      shortDescription: 'Wi-Fi və Bluetooth mikrokontroller',
    },
    {
      _id: 'comp-2',
      slug: 'dht22',
      name: 'DHT22',
      aliases: ['am2302'],
      category: 'sensors',
      categoryLabel: 'Sensorlar',
      shortDescription: 'Temperatur və rütubət sensoru',
    },
    {
      _id: 'comp-3',
      slug: 'relay-5v',
      name: '5V Rele Modulu',
      aliases: ['rele'],
      category: 'actuators',
      categoryLabel: 'Aktuatorlar və Modullar',
      shortDescription: 'Yüksək gərginlikli yük idarəetməsi',
    },
  ],
  total: 3,
  page: 1,
  limit: 100,
  totalPages: 1,
  categories: [
    { key: 'microcontrollers', label: 'Mikrokontrollerlər', count: 1 },
    { key: 'sensors', label: 'Sensorlar', count: 1 },
    { key: 'actuators', label: 'Aktuatorlar və Modullar', count: 1 },
  ],
};

const mockMatchResult: MatchComponentsResponse = {
  selectedComponents: ['esp32', 'dht22'],
  fullMatches: [
    {
      project: {
        _id: 'p-full-1',
        title: 'Ağıllı İstixana Monitoru',
        slug: 'agilli-istixana-monitoru',
        shortDescription: 'Tam uyğun IoT istixana layihəsi',
        price: 0,
        currency: 'AZN',
        isFree: true,
        categoryId: { _id: 'c-1', name: 'IoT', slug: 'iot' },
        authorId: { _id: 'a-1', fullName: 'Rəşad Quliyev' },
        technologies: [{ _id: 't-1', name: 'ESP32', slug: 'esp32' }],
        domains: ['Kənd təsərrüfatı'],
        difficulty: 'BEGINNER',
        status: 'APPROVED',
        rating: 4.9,
        salesCount: 22,
        createdAt: '2026-11-24T00:00:00.000Z',
      },
      matchedCount: 2,
      totalRequired: 2,
      matchLabel: '2/2 komponent mövcuddur',
      matchedComponents: ['ESP32', 'DHT22'],
      missingComponents: [],
    },
  ],
  partialMatches: [
    {
      project: {
        _id: 'p-partial-1',
        title: 'Avtomatik Suvarma və İşıqlandırma',
        slug: 'avtomatik-suvarma-isiqlandirma',
        shortDescription: 'Rele və torpaq sensoru ilə tam avtomatlaşdırma',
        price: 35,
        currency: 'AZN',
        categoryId: { _id: 'c-1', name: 'IoT', slug: 'iot' },
        authorId: { _id: 'a-2', fullName: 'Nigar Həsənova' },
        technologies: [{ _id: 't-1', name: 'ESP32', slug: 'esp32' }],
        domains: ['Energetika'],
        difficulty: 'INTERMEDIATE',
        status: 'APPROVED',
        rating: 0,
        salesCount: 5,
        components: [
          { name: 'ESP32', quantity: 1, componentSlug: 'esp32' },
          { name: 'DHT22', quantity: 1, componentSlug: 'dht22' },
          { name: 'Torpaq Nəmliyi Sensoru', quantity: 1, componentSlug: 'soil-moisture' },
          { name: '5V Rele Modulu', quantity: 1, componentSlug: 'relay-5v' },
          { name: 'Su Nasosu 5V', quantity: 1 },
        ],
        createdAt: '2026-11-24T00:00:00.000Z',
      },
      matchedCount: 2,
      totalRequired: 5,
      matchLabel: '2/5 komponent mövcuddur',
      matchedComponents: ['ESP32', 'DHT22'],
      missingComponents: ['Torpaq Nəmliyi Sensoru', '5V Rele Modulu', 'Su Nasosu 5V'],
    },
  ],
  totalFull: 1,
  totalPartial: 1,
};

function renderFinderPage(initialRoute = '/component-finder') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ComponentFinderPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ComponentFinderPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows empty selection guidance and never calls matchComponents when 0 components are selected', async () => {
    const getComponentsSpy = vi
      .spyOn(componentFinderApi, 'getComponents')
      .mockResolvedValue(mockCatalog);
    const matchSpy = vi
      .spyOn(componentFinderApi, 'matchComponents')
      .mockResolvedValue(mockMatchResult);

    renderFinderPage();

    expect(screen.getByText('Komponentlərimlə layihə tap')).toBeDefined();
    expect(screen.getByText('Mənim komponentlərim (0)')).toBeDefined();
    expect(
      screen.getAllByText(
        'Başlamaq üçün əlinizdəki komponentləri axtarın və ya kateqoriyadan seçin',
      ).length,
    ).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(getComponentsSpy).toHaveBeenCalledWith({ page: 1, limit: 100 });
    });
    expect(matchSpy).not.toHaveBeenCalled();
  });

  it('supports search, category filtering, add/remove, clear all, and full vs partial match display', async () => {
    vi.spyOn(componentFinderApi, 'getComponents').mockResolvedValue(mockCatalog);
    const matchSpy = vi
      .spyOn(componentFinderApi, 'matchComponents')
      .mockResolvedValue(mockMatchResult);

    renderFinderPage();

    await screen.findByText('ESP32');

    // Filter by category tab
    fireEvent.click(screen.getByRole('tab', { name: 'Sensorlar (1)' }));
    expect(screen.getByText('DHT22')).toBeDefined();
    expect(screen.queryByText('ESP32')).toBeNull();

    // Reset to All and search
    fireEvent.click(screen.getByRole('tab', { name: 'Hamısı (3)' }));
    const searchInput = screen.getByPlaceholderText(/Komponent axtar/i);
    fireEvent.change(searchInput, { target: { value: 'ESP32' } });
    expect(screen.getByText('ESP32')).toBeDefined();
    expect(screen.queryByText('DHT22')).toBeNull();

    // Add ESP32
    fireEvent.click(screen.getByRole('button', { name: 'ESP32 — + Əlavə et' }));
    expect(screen.getByText('Mənim komponentlərim (1)')).toBeDefined();

    // Clear search and add DHT22 (also verify duplicate prevention via case-insensitive URL preselection in separate test)
    fireEvent.click(screen.getByRole('button', { name: 'Axtarışı təmizlə' }));
    fireEvent.click(screen.getByRole('button', { name: 'DHT22 — + Əlavə et' }));
    expect(screen.getByText('Mənim komponentlərim (2)')).toBeDefined();
    expect(screen.getByRole('button', { name: 'ESP32 — Çıxar' })).toBeDefined();

    await waitFor(() => {
      expect(matchSpy).toHaveBeenLastCalledWith({
        components: ['esp32', 'dht22'],
        priceType: 'all',
      });
    });

    // Full & Partial match sections rendered
    expect(await screen.findByText('Tam uyğun layihələr (1)')).toBeDefined();
    expect(screen.getByText('Qismən uyğun layihələr (Çatışmayan komponentlərlə) (1)')).toBeDefined();
    expect(screen.getByText('Tam uyğun • 2/2 komponent mövcuddur')).toBeDefined();
    expect(screen.getByText('2/5 komponent mövcuddur')).toBeDefined();
    expect(screen.getByText('Torpaq Nəmliyi Sensoru')).toBeDefined();
    // '5V Rele Modulu' appears both in picker and in missingComponents list
    expect(screen.getAllByText('5V Rele Modulu').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Su Nasosu 5V')).toBeDefined();

    // Remove one item from tray
    fireEvent.click(screen.getByRole('button', { name: 'ESP32 — Sil' }));
    expect(screen.getByText('Mənim komponentlərim (1)')).toBeDefined();

    // Clear all
    fireEvent.click(screen.getByRole('button', { name: 'Hamısını təmizlə' }));
    expect(screen.getByText('Mənim komponentlərim (0)')).toBeDefined();
  });

  it('applies domain, price, and difficulty filters, validates inverted price range, and resets filters', async () => {
    vi.spyOn(componentFinderApi, 'getComponents').mockResolvedValue(mockCatalog);
    const matchSpy = vi
      .spyOn(componentFinderApi, 'matchComponents')
      .mockResolvedValueOnce(mockMatchResult)
      .mockResolvedValueOnce({
        selectedComponents: ['esp32'],
        fullMatches: [],
        partialMatches: [],
        totalFull: 0,
        totalPartial: 0,
      })
      .mockResolvedValue(mockMatchResult);

    renderFinderPage();
    await screen.findByText('ESP32');

    fireEvent.click(screen.getByRole('button', { name: 'ESP32 — + Əlavə et' }));
    await waitFor(() => expect(matchSpy).toHaveBeenCalledTimes(1));

    // Select domain = Energetika
    fireEvent.change(screen.getByLabelText('Sahə'), {
      target: { value: 'Energetika' },
    });

    await waitFor(() => {
      expect(matchSpy).toHaveBeenLastCalledWith({
        components: ['esp32'],
        domain: 'Energetika',
        priceType: 'all',
      });
    });

    // Empty filtered result + reset button
    expect(await screen.findByText('Seçilmiş filtrlərə uyğun layihə tapılmadı')).toBeDefined();

    // Select difficulty = Orta & priceType = Ödənişli
    fireEvent.click(screen.getByRole('button', { name: 'Orta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ödənişli' }));

    await waitFor(() => {
      expect(matchSpy).toHaveBeenLastCalledWith({
        components: ['esp32'],
        domain: 'Energetika',
        priceType: 'paid',
        difficulty: 'INTERMEDIATE',
      });
    });

    // Set valid minPrice first, then set maxPrice lower than minPrice -> inverted range blocks API call
    fireEvent.change(screen.getByLabelText('Min. qiymət (AZN)'), {
      target: { value: '100' },
    });
    await waitFor(() => {
      expect(matchSpy).toHaveBeenLastCalledWith({
        components: ['esp32'],
        domain: 'Energetika',
        priceType: 'paid',
        minPrice: 100,
        difficulty: 'INTERMEDIATE',
      });
    });

    const callCountBeforeInvalidPrice = matchSpy.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Maks. qiymət (AZN)'), {
      target: { value: '20' },
    });

    expect(
      screen.getAllByText('Minimum qiymət maksimum qiymətdən böyük ola bilməz').length,
    ).toBeGreaterThanOrEqual(1);
    expect(matchSpy).toHaveBeenCalledTimes(callCountBeforeInvalidPrice);

    // Reset filters -> restores cached unfiltered match results and hides reset button
    fireEvent.click(screen.getAllByRole('button', { name: 'Filtrləri sıfırla' })[0]);
    expect(await screen.findByText('Ağıllı İstixana Monitoru')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Filtrləri sıfırla' })).toBeNull();
  });

  it('prevents duplicate component selection from URL query params', async () => {
    vi.spyOn(componentFinderApi, 'getComponents').mockResolvedValue(mockCatalog);
    const matchSpy = vi
      .spyOn(componentFinderApi, 'matchComponents')
      .mockResolvedValue(mockMatchResult);

    renderFinderPage('/component-finder?components=esp32,ESP32,%20esp32%20');

    expect(screen.getByText('Mənim komponentlərim (1)')).toBeDefined();

    await waitFor(() => {
      expect(matchSpy).toHaveBeenCalledWith({
        components: ['esp32'],
        priceType: 'all',
      });
    });
  });
});
