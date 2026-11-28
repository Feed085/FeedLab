import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComponentPicker } from './ComponentPicker';
import type { ComponentCategoryFacet, ComponentSummary } from '../types';

const mockCategories: ComponentCategoryFacet[] = [
  { key: 'microcontrollers', label: 'Mikrokontrollerlər', count: 2 },
  { key: 'sensors', label: 'Sensorlar', count: 1 },
];

const mockComponents: ComponentSummary[] = [
  {
    _id: 'c-1',
    slug: 'esp32',
    name: 'ESP32 DevKit',
    aliases: ['esp32-wroom'],
    category: 'microcontrollers',
    categoryLabel: 'Mikrokontrollerlər',
    shortDescription: 'Wi-Fi və Bluetooth dəstəkli mikrokontroller',
  },
  {
    _id: 'c-2',
    slug: 'dht22',
    name: 'DHT22 Sensor',
    aliases: ['am2302'],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription: 'Rütubət və temperatur sensoru',
  },
];

describe('ComponentPicker', () => {
  it('renders categories, components, library links, and add/remove states', () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const onSelectCategory = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <MemoryRouter>
        <ComponentPicker
          components={mockComponents}
          categories={mockCategories}
          selectedSlugs={new Set(['esp32'])}
          searchQuery=""
          onSearchChange={onSearchChange}
          selectedCategory="all"
          onSelectCategory={onSelectCategory}
          onAddComponent={onAdd}
          onRemoveComponent={onRemove}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Hamısı (3)')).toBeDefined();
    expect(screen.getByText('Mikrokontrollerlər (2)')).toBeDefined();
    expect(screen.getByText('Sensorlar (1)')).toBeDefined();
    expect(screen.getByText('ESP32 DevKit')).toBeDefined();
    expect(screen.getByText('DHT22 Sensor')).toBeDefined();
    expect(screen.getByText('Seçildi')).toBeDefined();

    // Library links resolve to /library/:slug
    const libraryLinks = screen.getAllByRole('link', { name: /Kitabxanada bax/i });
    expect(libraryLinks[0].getAttribute('href')).toBe('/library/esp32');
    expect(libraryLinks[1].getAttribute('href')).toBe('/library/dht22');

    // Toggle selected vs unselected
    fireEvent.click(screen.getByRole('button', { name: 'ESP32 DevKit — Çıxar' }));
    expect(onRemove).toHaveBeenCalledWith('esp32');

    fireEvent.click(screen.getByRole('button', { name: 'DHT22 Sensor — + Əlavə et' }));
    expect(onAdd).toHaveBeenCalledWith({
      slug: 'dht22',
      name: 'DHT22 Sensor',
      category: 'sensors',
      categoryLabel: 'Sensorlar',
    });

    // Category click and search change
    fireEvent.click(screen.getByRole('tab', { name: 'Sensorlar (1)' }));
    expect(onSelectCategory).toHaveBeenCalledWith('sensors');

    const input = screen.getByPlaceholderText(/Komponent axtar/i);
    fireEvent.change(input, { target: { value: 'rele' } });
    expect(onSearchChange).toHaveBeenCalledWith('rele');
  });

  it('renders Azerbaijani empty state and reset/custom actions when no components match', () => {
    const onSearchChange = vi.fn();
    const onSelectCategory = vi.fn();
    const onAddComponent = vi.fn();

    render(
      <MemoryRouter>
        <ComponentPicker
          components={[]}
          categories={mockCategories}
          selectedSlugs={new Set()}
          searchQuery="MQ-135"
          onSearchChange={onSearchChange}
          selectedCategory="sensors"
          onSelectCategory={onSelectCategory}
          onAddComponent={onAddComponent}
          onRemoveComponent={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Uyğun komponent tapılmadı')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Axtarışı sıfırla/i }));
    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(onSelectCategory).toHaveBeenCalledWith('all');

    fireEvent.click(screen.getByRole('button', { name: /Xüsusi komponent kimi əlavə et/i }));
    expect(onAddComponent).toHaveBeenCalledWith({
      slug: 'MQ-135',
      name: 'MQ-135',
      isCustom: true,
    });
  });
});
