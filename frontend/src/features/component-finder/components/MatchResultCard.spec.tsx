import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MatchResultCard } from './MatchResultCard';
import type { MatchEntry } from '../types';

describe('MatchResultCard', () => {
  it('renders full match with emerald badge, normalized backend fields, rating 0.0, and free price', () => {
    const fullEntry: MatchEntry = {
      project: {
        _id: 'proj-1',
        title: 'Ağıllı Bitki Suvarma Sistemi',
        slug: 'agilli-bitki-suvarma',
        shortDescription: 'ESP32 və DHT22 əsasında avtomatik suvarma',
        price: 0,
        currency: 'AZN',
        isFree: true,
        category: 'iot-smart-home',
        categoryId: { _id: 'cat-1', name: 'IoT / Ağıllı Ev', slug: 'iot-smart-home' },
        authorId: { _id: 'auth-1', fullName: 'Elvin Məmmədov' },
        technologies: [{ _id: 't-1', name: 'ESP32', slug: 'esp32' }],
        domains: ['Kənd təsərrüfatı', 'Ekologiya'],
        difficulty: 'BEGINNER',
        status: 'APPROVED',
        rating: 0,
        salesCount: 14,
        createdAt: '2026-11-24T00:00:00.000Z',
      },
      matchedCount: 2,
      totalRequired: 2,
      matchLabel: '2/2 komponent mövcuddur',
      matchedComponents: ['ESP32', 'DHT22'],
      missingComponents: [],
    };

    render(
      <MemoryRouter>
        <MatchResultCard entry={fullEntry} variant="full" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Tam uyğun • 2/2 komponent mövcuddur')).toBeDefined();
    expect(screen.getByText('Ağıllı Bitki Suvarma Sistemi')).toBeDefined();
    expect(screen.getByText('Başlanğıc')).toBeDefined();
    expect(screen.getByText('IoT / Ağıllı Ev')).toBeDefined();
    expect(screen.getByText('Kənd təsərrüfatı')).toBeDefined();
    expect(screen.getByText('Elvin Məmmədov')).toBeDefined();
    expect(screen.getByText('0.0')).toBeDefined();
    expect(screen.getByText('Pulsuz')).toBeDefined();
    expect(screen.getByText('Mövcud komponentlər: 2')).toBeDefined();
    expect(screen.queryByText(/Çatışmayan komponentlər/i)).toBeNull();

    const detailLink = screen.getByRole('link', { name: /Layihəyə bax/i });
    expect(detailLink.getAttribute('href')).toBe('/projects/agilli-bitki-suvarma');
  });

  it('renders partial match with matchLabel, paid AZN price, and links missing components to /library/:slug', () => {
    const partialEntry: MatchEntry = {
      project: {
        _id: 'proj-2',
        title: 'Avtonom Hava Stansiyası',
        slug: 'avtonom-hava-stansiyasi',
        shortDescription: 'Çoxsensorlu meteoroloji stansiya',
        price: 49.5,
        currency: 'AZN',
        categoryId: { _id: 'cat-2', name: 'Sensor Sistemləri', slug: 'sensors' },
        author: { _id: 'auth-2', fullName: 'Aynur Əliyeva' },
        technologies: [{ _id: 't-2', name: 'Arduino', slug: 'arduino' }],
        domains: ['Ekologiya'],
        difficulty: 'ADVANCED',
        status: 'APPROVED',
        rating: 4.7,
        salesCount: 8,
        components: [
          { name: 'ESP32', quantity: 1, componentSlug: 'esp32' },
          { name: 'BME280 Təzyiq Sensoru', quantity: 1, componentSlug: 'bme280' },
          { name: 'OLED SSD1306', quantity: 1 },
        ],
        createdAt: '2026-11-24T00:00:00.000Z',
      },
      matchedCount: 4,
      totalRequired: 5,
      matchLabel: '4/5 komponent mövcuddur',
      matchedComponents: ['ESP32', 'DHT22', 'Breadboard', 'Rezistor'],
      missingComponents: ['BME280 Təzyiq Sensoru', 'OLED SSD1306'],
    };

    render(
      <MemoryRouter>
        <MatchResultCard
          entry={partialEntry}
          variant="partial"
          catalogSlugMap={{ 'oled ssd1306': 'oled-ssd1306' }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('4/5 komponent mövcuddur')).toBeDefined();
    expect(screen.getByText('Çətin')).toBeDefined();
    expect(screen.getByText('49.50 AZN')).toBeDefined();
    expect(screen.getByText('Çatışmayan komponentlər (2):')).toBeDefined();

    const bmeLink = screen.getByRole('link', { name: 'BME280 Təzyiq Sensoru' });
    expect(bmeLink.getAttribute('href')).toBe('/library/bme280');

    const oledLink = screen.getByRole('link', { name: 'OLED SSD1306' });
    expect(oledLink.getAttribute('href')).toBe('/library/oled-ssd1306');
  });
});
