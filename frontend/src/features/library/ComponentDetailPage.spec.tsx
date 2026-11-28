import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComponentDetailPage } from './ComponentDetailPage';
import * as useLibraryModule from './hooks/useLibrary';
import { libraryApi } from './library.api';
import type { ComponentDetailResponse, ComponentProjectsResponse } from './types';
import type { Project } from '@/features/marketplace/types';

const makeProject = (idx: number): Project => ({
  _id: `proj-${idx}`,
  id: `proj-${idx}`,
  title: `Layihə ${idx}`,
  slug: `layihe-${idx}`,
  shortDescription: `Test layihə ${idx} təsviri`,
  price: idx % 2 === 0 ? 0 : 25,
  currency: 'AZN',
  category: 'smart-home' as any,
  categoryId: {
    _id: 'cat-1',
    name: 'Ağıllı Ev',
    slug: 'smart-home',
  },
  technologies: [{ _id: 't-1', name: 'ESP32', slug: 'esp32' }],
  authorId: { _id: 'a-1', fullName: 'Əli Məmmədov' },
  status: 'APPROVED',
  rating: 4.8,
  salesCount: 10 + idx,
  thumbnailUrl: null,
  images: [],
  createdAt: '2026-11-24T00:00:00.000Z',
});

const activeEsp32Detail: ComponentDetailResponse = {
  id: 'comp-esp32',
  _id: 'comp-esp32',
  slug: 'esp32',
  name: 'ESP32 İnkişaf Lövhəsi',
  aliases: ['ESP32', 'ESP32-WROOM-32D'],
  category: 'microcontrollers',
  categoryLabel: 'Mikrokontrollerlər',
  shortDescription: 'Wi-Fi və Bluetooth dəstəkli ikinüvəli IoT mikrokontroller.',
  definition: 'ESP32 Espressif Systems tərəfindən hazırlanmış 32-bit mikrokontrollerdir.',
  workingPrinciple: 'İki nüvə üzərində şəbəkə və istifadəçi tapşırıqlarını paralel icra edir.',
  applications: [
    'Ağıllı ev idarəetmə panelləri',
    'Bulud əsaslı hava monitorinqi',
  ],
  specs: [
    { label: 'Prosessor', value: 'İkinüvəli Xtensa LX6, 240 MHz' },
    { label: 'İş gərginliyi', value: '3.3V DC' },
  ],
  pinout: [
    { pin: '3V3', name: '3.3V Çıxış', function: 'Stabil qida çıxışı', type: 'power' },
    { pin: 'GND', name: 'Torpaq', function: 'Ümumi sıfır xətti', type: 'ground' },
    { pin: 'GPIO21', name: 'I2C SDA', function: 'I2C məlumat xətti', type: 'data' },
  ],
  pinoutImageUrl: '/images/esp32-pinout.png',
  wiringGuide: 'GPIO pinləri 3.3V məntiq ilə işləyir; 5V sensorlar üçün gərginlik bölücü istifadə edin.',
  wiringImageUrl: '/images/esp32-wiring.png',
  codeExample: {
    language: 'cpp',
    title: 'ESP32 LED Blink',
    code: 'void setup() {\n  pinMode(2, OUTPUT);\n}',
  },
  pros: ['Daxili Wi-Fi və Bluetooth', 'Yüksək sürət'],
  limitations: ['Pinlər 5V tolerant deyil'],
  alternatives: [
    { slug: 'arduino-uno', name: 'Arduino Uno R3', reason: '5V uyğunluq üçün' },
    { slug: '', name: 'Generic MCU', reason: 'Sadə prototip üçün' },
  ],
  imageUrl: '/images/esp32-board.png',
  isActive: true,
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
  featuredProjects: [makeProject(1), makeProject(2)],
  totalProjectsCount: 5,
};

const passiveResistorDetail: ComponentDetailResponse = {
  ...activeEsp32Detail,
  id: 'comp-resistor',
  _id: 'comp-resistor',
  slug: 'resistor',
  name: 'Rezistor (Müqavimət)',
  aliases: ['Resistor', 'Müqavimət'],
  category: 'passive',
  categoryLabel: 'Passiv və Prototipləmə',
  shortDescription: 'Elektrik cərəyanını məhdudlaşdıran passiv elektron komponent.',
  imageUrl: null,
  pinoutImageUrl: null,
  wiringImageUrl: null,
  codeExample: null,
  featuredProjects: [],
  totalProjectsCount: 0,
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderDetailPage = (initialPath = '/library/esp32') => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/library/:slug" element={<ComponentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ComponentDetailPage Component', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  it('renders all 8 educational sections, code copy, lightbox zoom, and alternative links for active component', async () => {
    vi.spyOn(useLibraryModule, 'useComponent').mockReturnValue({
      data: activeEsp32Detail,
      isLoading: false,
      isError: false,
    } as any);

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    renderDetailPage('/library/esp32');

    // Breadcrumbs & Header
    expect(screen.getByText('Ana səhifə')).toBeDefined();
    expect(screen.getByText('Kitabxana')).toBeDefined();
    expect(screen.getAllByText('ESP32 İnkişaf Lövhəsi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ESP32-WROOM-32D')).toBeDefined();

    // All 8 mandatory educational sections
    expect(screen.getByText('1. Nədir və nə işə yarayır?')).toBeDefined();
    expect(screen.getByText('2. İş prinsipi')).toBeDefined();
    expect(screen.getByText('3. İstifadə sahələri və real tətbiqlər')).toBeDefined();
    expect(screen.getByText('4. Texniki göstəricilər')).toBeDefined();
    expect(screen.getByText('5. Pinout və pinlərin funksiyası')).toBeDefined();
    expect(screen.getByText('6. Qoşulma qaydası və nümunə kodu')).toBeDefined();
    expect(screen.getByText('7. Üstünlükləri, məhdudiyyətləri və alternativləri')).toBeDefined();
    expect(screen.getByText('8. Bu komponentlə hazırlanan seçilmiş layihələr')).toBeDefined();

    // Section contents
    expect(screen.getByText(activeEsp32Detail.definition)).toBeDefined();
    expect(screen.getByText(activeEsp32Detail.workingPrinciple)).toBeDefined();
    expect(screen.getByText('Ağıllı ev idarəetmə panelləri')).toBeDefined();
    expect(screen.getByText('İkinüvəli Xtensa LX6, 240 MHz')).toBeDefined();
    expect(screen.getByText('GPIO21')).toBeDefined();
    expect(screen.getByText('Daxili Wi-Fi və Bluetooth')).toBeDefined();
    expect(screen.getByText('Pinlər 5V tolerant deyil')).toBeDefined();

    // Alternative links: slug present -> link to /library/arduino-uno; empty slug -> no link
    const altLink = screen
      .getAllByRole('link')
      .find((el) => el.getAttribute('href') === '/library/arduino-uno');
    expect(altLink).toBeDefined();
    expect(screen.getByText('Generic MCU').closest('a')).toBeNull();

    // Copy code button interaction
    const copyBtn = screen.getByRole('button', { name: 'Kopyala' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeTextMock).toHaveBeenCalledWith(activeEsp32Detail.codeExample?.code);
    expect(screen.getByText('Kopyalandı!')).toBeDefined();

    // Lightbox zoom trigger opens LightboxImageModal (role="dialog")
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pinout şəklini böyüt' }));
    expect(screen.getByRole('dialog')).toBeDefined();

    // Close lightbox via Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders passive component without code block, shows no-code note, SVG pinout zoom, and zero-project empty state', () => {
    vi.spyOn(useLibraryModule, 'useComponent').mockReturnValue({
      data: passiveResistorDetail,
      isLoading: false,
      isError: false,
    } as any);

    renderDetailPage('/library/resistor');

    expect(
      screen.getByText(
        /Bu passiv\/mexaniki komponent üçün proqramlaşdırma kodu tələb olunmur/i,
      ),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Kopyala' })).toBeNull();

    // Zero-project state
    expect(screen.getByText('Bu komponentlə hələ layihə əlavə edilməyib')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Bütün layihələri gör/i })).toBeNull();

    // SVG pinout diagram zoom opens LightboxImageModal even when pinoutImageUrl is null
    fireEvent.click(screen.getByRole('button', { name: 'Pinout diaqramını böyüt' }));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('opens "Bütün layihələri gör" modal and paginates GET /components/:slug/projects', async () => {
    vi.spyOn(useLibraryModule, 'useComponent').mockReturnValue({
      data: activeEsp32Detail,
      isLoading: false,
      isError: false,
    } as any);

    const page1Resp: ComponentProjectsResponse = {
      items: [makeProject(1), makeProject(2)],
      total: 15,
      page: 1,
      limit: 12,
      totalPages: 2,
    };
    const page2Resp: ComponentProjectsResponse = {
      items: [makeProject(13)],
      total: 15,
      page: 2,
      limit: 12,
      totalPages: 2,
    };

    const getProjectsSpy = vi
      .spyOn(libraryApi, 'getComponentProjects')
      .mockResolvedValueOnce(page1Resp)
      .mockResolvedValueOnce(page2Resp);

    renderDetailPage('/library/esp32');

    const seeAllBtn = screen.getByRole('button', { name: /Bütün layihələri gör/i });
    fireEvent.click(seeAllBtn);

    await waitFor(() => {
      expect(getProjectsSpy).toHaveBeenCalledWith('esp32', { page: 1, limit: 12 });
      expect(screen.getByRole('dialog', { name: /ESP32 İnkişaf Lövhəsi — Bütün layihələr/i })).toBeDefined();
      expect(screen.getByText('Səhifə 1 / 2')).toBeDefined();
    });

    const page2Btn = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Btn);

    await waitFor(() => {
      expect(getProjectsSpy).toHaveBeenCalledWith('esp32', { page: 2, limit: 12 });
      expect(screen.getByText('Layihə 13')).toBeDefined();
      expect(screen.getByText('Səhifə 2 / 2')).toBeDefined();
    });
  });

  it('renders 404 state with "Komponent tapılmadı" and "Kitabxanaya qayıt" link when component is not found', () => {
    vi.spyOn(useLibraryModule, 'useComponent').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    renderDetailPage('/library/non-existent');

    expect(screen.getByText('Komponent tapılmadı')).toBeDefined();
    const backLink = screen.getByRole('link', { name: /Kitabxanaya qayıt/i });
    expect(backLink.getAttribute('href')).toBe('/library');
  });
});
