import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LibraryPage } from './LibraryPage';
import * as useLibraryModule from './hooks/useLibrary';
import type { ComponentListResponse, ElectronicsComponent } from './types';

const makeComponent = (overrides: Partial<ElectronicsComponent> = {}): ElectronicsComponent => ({
  id: 'comp-1',
  _id: 'comp-1',
  slug: 'esp32',
  name: 'ESP32 İnkişaf Lövhəsi',
  aliases: ['ESP32', 'ESP-32'],
  category: 'microcontrollers',
  categoryLabel: 'Mikrokontrollerlər',
  shortDescription: 'Wi-Fi və Bluetooth dəstəkli ikinüvəli 32-bit mikrokontroller.',
  definition: 'ESP32 güclü IoT mikrokontrolleridir.',
  workingPrinciple: 'İki nüvə üzərində işləyir.',
  applications: ['Ağıllı ev'],
  specs: [{ label: 'İş gərginliyi', value: '3.3V' }],
  pinout: [{ pin: '3V3', name: '3.3V Çıxış', function: 'Qida', type: 'power' }],
  pinoutImageUrl: null,
  wiringGuide: 'USB ilə qoşun.',
  wiringImageUrl: null,
  codeExample: {
    language: 'cpp',
    title: 'Blink',
    code: 'void setup() {}',
  },
  pros: ['Sürətli'],
  limitations: ['3.3V məntiq'],
  alternatives: [{ slug: 'arduino-uno', name: 'Arduino Uno R3', reason: '5V uyğunluq' }],
  imageUrl: null,
  isActive: true,
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
  ...overrides,
});

const mockCategories = [
  { key: 'microcontrollers', label: 'Mikrokontrollerlər', count: 6 },
  { key: 'sensors', label: 'Sensorlar', count: 8 },
  { key: 'passive', label: 'Passiv və Prototipləmə', count: 5 },
];

describe('LibraryPage Component', () => {
  let useComponentsSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.scrollTo = vi.fn();

    const defaultResponse: ComponentListResponse = {
      items: [
        makeComponent(),
        makeComponent({
          id: 'comp-2',
          _id: 'comp-2',
          slug: 'dht22',
          name: 'DHT22 Temperatur və Rütubət Sensoru',
          category: 'sensors',
          categoryLabel: 'Sensorlar',
          shortDescription: 'Rəqəmsal temperatur və rütubət sensoru.',
          imageUrl: '/images/dht22.jpg',
        }),
      ],
      total: 2,
      page: 1,
      limit: 12,
      totalPages: 1,
      categories: mockCategories,
    };

    useComponentsSpy = vi.spyOn(useLibraryModule, 'useComponents').mockReturnValue({
      data: defaultResponse,
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders hero banner, category facets, component cards, and safe image fallback', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <LibraryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Elektronika Ensiklopediyası / Kitabxanası')).toBeDefined();
    expect(screen.getByText('Hamısı')).toBeDefined();
    expect(screen.getByRole('button', { name: /Mikrokontrollerlər/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Sensorlar/i })).toBeDefined();

    // Cards & detail links
    expect(screen.getByText('ESP32 İnkişaf Lövhəsi')).toBeDefined();
    expect(screen.getByText('DHT22 Temperatur və Rütubət Sensoru')).toBeDefined();

    const detailLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('/library/'));
    expect(detailLinks.map((l) => l.getAttribute('href'))).toContain('/library/esp32');
    expect(detailLinks.map((l) => l.getAttribute('href'))).toContain('/library/dht22');

    // Only DHT22 has imageUrl; ESP32 uses SVG visual (never empty <img src="">)
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('/images/dht22.jpg');

    // Trigger image error -> falls back cleanly without broken <img>
    fireEvent.error(images[0]);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('filters by category facet and resets back to all categories', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <LibraryPage />
      </MemoryRouter>,
    );

    const sensorsBtn = screen.getByRole('button', { name: /Sensorlar/i });
    fireEvent.click(sensorsBtn);

    expect(useComponentsSpy).toHaveBeenLastCalledWith({
      q: undefined,
      category: 'sensors',
      page: 1,
      limit: 12,
    });

    const allBtn = screen.getByRole('button', { name: /Hamısı/i });
    fireEvent.click(allBtn);

    expect(useComponentsSpy).toHaveBeenLastCalledWith({
      q: undefined,
      category: undefined,
      page: 1,
      limit: 12,
    });
  });

  it('filters by live debounced search query', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/library']}>
        <LibraryPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText('Komponent axtarışı') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'esp32' } });
    expect(searchInput.value).toBe('esp32');

    act(() => {
      vi.advanceTimersByTime(360);
    });

    expect(useComponentsSpy).toHaveBeenLastCalledWith({
      q: 'esp32',
      category: undefined,
      page: 1,
      limit: 12,
    });
  });

  it('supports pagination when totalPages > 1', () => {
    useComponentsSpy.mockReturnValue({
      data: {
        items: [makeComponent()],
        total: 15,
        page: 1,
        limit: 12,
        totalPages: 2,
        categories: mockCategories,
      },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter initialEntries={['/library']}>
        <LibraryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Səhifə 1 / 2')).toBeDefined();
    const page2Btn = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Btn);

    expect(useComponentsSpy).toHaveBeenLastCalledWith({
      q: undefined,
      category: undefined,
      page: 2,
      limit: 12,
    });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('renders empty state "Komponent tapılmadı" and clears filters on reset click', () => {
    useComponentsSpy.mockReturnValue({
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
        categories: mockCategories,
      },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter initialEntries={['/library?q=tapilmayan&category=sensors']}>
        <LibraryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Komponent tapılmadı')).toBeDefined();
    const resetButtons = screen.getAllByRole('button', { name: /Filtrləri təmizlə/i });
    expect(resetButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(resetButtons[resetButtons.length - 1]);

    expect(useComponentsSpy).toHaveBeenLastCalledWith({
      q: undefined,
      category: undefined,
      page: 1,
      limit: 12,
    });
  });

  it('renders error state and triggers refetch on retry', () => {
    const refetchMock = vi.fn();
    useComponentsSpy.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isPlaceholderData: false,
      refetch: refetchMock,
    } as any);

    render(
      <MemoryRouter initialEntries={['/library']}>
        <LibraryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Komponent siyahısını yükləmək mümkün olmadı')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Yenidən cəhd et/i }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});
